// src/models/StickyNote.ts

import mongoose, { Schema, Document, models } from "mongoose";

export interface IStickyNoteItem {
  productId?: string; // optional link to Product
  productName: string;
  quantity: number;
  unit?: "piece" | "box" | "kg" | "litre" | "gm" | "ml"; // optional, if you want later
}

export interface IStickyNote extends Document {
  userId: string;          // logged-in user
  customerId?: string;     // link to Customer
  customerName: string;    // e.g. "Rahul"
  shopName: string;        // e.g. "Rahul General Store"
  items: IStickyNoteItem[];
  totalQuantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const StickyNoteItemSchema = new Schema<IStickyNoteItem>(
  {
    productId: { type: String },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["piece", "box", "kg", "litre", "gm", "ml"],
      required: false,
    },
  },
  { _id: false }
);

const StickyNoteSchema = new Schema<IStickyNote>(
  {
    userId: { type: String, required: true },
    customerId: { type: String },
    customerName: { type: String, required: true, trim: true },
    shopName: { type: String, required: true, trim: true },
    items: { type: [StickyNoteItemSchema], default: [] },
    totalQuantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

const StickyNote =
  models.StickyNote || mongoose.model<IStickyNote>("StickyNote", StickyNoteSchema);

export default StickyNote;
