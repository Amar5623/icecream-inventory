// src/app/api/sticky-notes/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import StickyNote from "@/models/StickyNote";

// CREATE STICKY NOTE
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      userId,
      customerId,
      customerName,
      shopName,
      items,
    } = body;

    if (!userId || !customerName || !shopName) {
      return NextResponse.json(
        { error: "userId, customerName and shopName are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const cleanedItems = items
      .filter(
        (it: any) =>
          it &&
          typeof it.productName === "string" &&
          it.productName.trim() &&
          typeof it.quantity === "number" &&
          it.quantity > 0
      )
      .map((it: any) => ({
        productId: it.productId || undefined,
        productName: it.productName.trim(),
        quantity: it.quantity,
        unit: it.unit || undefined,
      }));

    if (cleanedItems.length === 0) {
      return NextResponse.json(
        { error: "Valid items are required" },
        { status: 400 }
      );
    }

    const totalQuantity = cleanedItems.reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 0),
      0
    );

    const note = await StickyNote.create({
      userId,
      customerId: customerId || undefined,
      customerName: customerName.trim(),
      shopName: shopName.trim(),
      items: cleanedItems,
      totalQuantity,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/sticky-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create sticky note" },
      { status: 500 }
    );
  }
}

// GET STICKY NOTES BY USER
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const notes = await StickyNote.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(notes, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/sticky-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch sticky notes" },
      { status: 500 }
    );
  }
}

// UPDATE STICKY NOTE
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      id,
      userId,
      customerId,
      customerName,
      shopName,
      items,
    } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { error: "id and userId are required" },
        { status: 400 }
      );
    }

    if (!customerName || !shopName) {
      return NextResponse.json(
        { error: "customerName and shopName are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const cleanedItems = items
      .filter(
        (it: any) =>
          it &&
          typeof it.productName === "string" &&
          it.productName.trim() &&
          typeof it.quantity === "number" &&
          it.quantity > 0
      )
      .map((it: any) => ({
        productId: it.productId || undefined,
        productName: it.productName.trim(),
        quantity: it.quantity,
        unit: it.unit || undefined,
      }));

    if (cleanedItems.length === 0) {
      return NextResponse.json(
        { error: "Valid items are required" },
        { status: 400 }
      );
    }

    const totalQuantity = cleanedItems.reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 0),
      0
    );

    const updated = await StickyNote.findOneAndUpdate(
      { _id: id, userId },
      {
        customerId: customerId || undefined,
        customerName: customerName.trim(),
        shopName: shopName.trim(),
        items: cleanedItems,
        totalQuantity,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Sticky note not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("PUT /api/sticky-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update sticky note" },
      { status: 500 }
    );
  }
}

// DELETE STICKY NOTE
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id, userId } = await req.json();

    if (!id || !userId) {
      return NextResponse.json(
        { error: "id and userId are required" },
        { status: 400 }
      );
    }

    const deleted = await StickyNote.findOneAndDelete({ _id: id, userId });

    if (!deleted) {
      return NextResponse.json(
        { error: "Sticky note not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/sticky-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete sticky note" },
      { status: 500 }
    );
  }
}
