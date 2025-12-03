// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";

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
      items,
      freeItems: Array.isArray(freeItems) ? freeItems : [],
      quantitySummary,
      subtotal,
      discountPercentage,
      total,
      remarks,
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
