// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";

// CREATE ORDER (existing logic, plus status + history entry)
export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const body = await req.json();

    const {
      userId,
      orderId,
      serialNumber,
      shopName,
      customerId,
      customerName,
      customerAddress,
      customerContact,
      items,
      freeItems,
      quantitySummary,
      subtotal,
      discountPercentage,
      total,
      remarks,
    } = body;

    if (!userId || !orderId || !serialNumber) {
      return NextResponse.json(
        { error: "userId, orderId and serialNumber are required." },
        { status: 400 }
      );
    }

    if (!customerId || !customerName || !customerAddress || !customerContact) {
      return NextResponse.json(
        { error: "Customer details are incomplete." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one bill item is required." },
        { status: 400 }
      );
    }

    // 1) Create Order document
    const order = await Order.create({
      userId,
      orderId,
      serialNumber,
      shopName,
      customerName,
      customerAddress,
      customerContact,
      customerId,
      items,
      freeItems: Array.isArray(freeItems) ? freeItems : [],
      quantitySummary,
      subtotal,
      discountPercentage,
      total,
      remarks,
      status: "Unsettled",
      settlementHistory: [
        {
          action: "Created",
          at: new Date(),
        },
      ],
    });

    // 2) Decrease stock for all products in this bill (including free items)
    const allItems = [
      ...(Array.isArray(items) ? items : []),
      ...(Array.isArray(freeItems) ? freeItems : []),
    ];

    const stockUpdates = allItems
      .filter(
        (it: any) =>
          it.productId &&
          typeof it.quantity === "number" &&
          it.quantity > 0
      )
      .map((it: any) =>
        Product.findOneAndUpdate(
          { _id: it.productId, userId },
          { $inc: { quantity: -Math.abs(it.quantity) } },
          { new: true }
        )
      );

    if (stockUpdates.length) {
      await Promise.all(stockUpdates);
    }

    // 3) Add total to customer's debit & totalSales
    if (customerId && typeof total === "number" && total > 0) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { debit: total, totalSales: total },
      });
    }

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating order:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}

// GET ORDERS (with optional status filter)
export async function GET(req: NextRequest) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // "Unsettled" | "settled" | null

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const query: any = { userId };
    if (status === "Unsettled" || status === "settled") {
      query.status = status;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    return NextResponse.json(orders, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching orders:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// PATCH: discard / settle
export async function PATCH(req: NextRequest) {
  await connectDB();

  try {
    const body = await req.json();
    const {
      action, // 'discard' | 'settle'
      orderId, // Mongo _id of order
      userId,
      method, // 'Cash' | 'Bank/UPI' | 'Debt'  (for settle)
      amount, // number (for settle)
    } = body;

    if (!orderId || !userId || !action) {
      return NextResponse.json(
        { error: "orderId, userId and action are required." },
        { status: 400 }
      );
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.status !== "Unsettled") {
      return NextResponse.json(
        { error: "Only Unsettled orders can be modified." },
        { status: 400 }
      );
    }

    // Helper for customer updates
    const adjustCustomerForDiscard = async () => {
      if (!order.customerId || !order.total) return;
      await Customer.findByIdAndUpdate(order.customerId, {
        $inc: { debit: -order.total, totalSales: -order.total },
      });
    };

    const adjustCustomerForPayment = async (payAmount: number) => {
      if (!order.customerId || payAmount <= 0) return;
      const customer: any = await Customer.findById(order.customerId);
      if (!customer) return;

      let debit = Number(customer.debit || 0);
      let credit = Number(customer.credit || 0);

      let debitChange = 0;
      let creditChange = 0;

      const newDebit = debit - payAmount;

      if (newDebit >= 0) {
        // still some debit left or exactly zero
        debitChange = -payAmount;
        creditChange = 0;
      } else {
        // overpayment -> clear debit, rest goes to credit
        debitChange = -debit; // bring debit to 0
        creditChange = -(newDebit); // positive extra => credit
      }

      await Customer.findByIdAndUpdate(order.customerId, {
        $inc: { debit: debitChange, credit: creditChange },
      });
    };

    if (action === "discard") {
      // 1) revert stock
      const allItems = [
        ...(Array.isArray(order.items) ? order.items : []),
        ...(Array.isArray(order.freeItems) ? order.freeItems : []),
      ];

      const stockUpdates = allItems
        .filter(
          (it: any) =>
            it.productId &&
            typeof it.quantity === "number" &&
            it.quantity > 0
        )
        .map((it: any) =>
          Product.findOneAndUpdate(
            { _id: it.productId, userId },
            { $inc: { quantity: Math.abs(it.quantity) } }, // add back
            { new: true }
          )
        );

      if (stockUpdates.length) {
        await Promise.all(stockUpdates);
      }

      // 2) revert debit / totalSales
      await adjustCustomerForDiscard();

      // 3) mark as "settled" but discarded, and store history
      order.status = "settled";
      order.discardedAt = new Date();
      order.settlementMethod = null;
      order.settlementAmount = 0;
      order.settledAt = null;

      order.settlementHistory = order.settlementHistory || [];
      order.settlementHistory.push({
        action: "Discarded",
        amountPaid: 0,
        at: new Date(),
      });

      await order.save();

      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    if (action === "settle") {
      if (method !== "Cash" && method !== "Bank/UPI" && method !== "Debt") {
        return NextResponse.json(
          { error: "Invalid settlement method." },
          { status: 400 }
        );
      }

      const payAmount =
        method === "Debt" ? 0 : Math.max(0, Number(amount || 0));

      // Debt => keep debit as it is
      if (method === "Cash" || method === "Bank/UPI") {
        await adjustCustomerForPayment(payAmount);
      }

      order.status = "settled";
      order.settlementMethod = method;
      order.settlementAmount = payAmount;
      order.settledAt = new Date();

      order.settlementHistory = order.settlementHistory || [];
      order.settlementHistory.push({
        action: "Settled",
        method,
        amountPaid: payAmount,
        at: new Date(),
      });

      await order.save();

      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("Error updating order:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update order" },
      { status: 500 }
    );
  }
}
