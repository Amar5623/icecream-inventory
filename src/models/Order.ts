// src/models/Order.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface IOrderItem {
  productId?: string; // optional link to Product
  productName: string;
  quantity: number;
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
}

export interface IFreeItem {
  productId?: string; // optional link to Product
  productName: string;
  quantity: number;
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
}

export interface IQuantitySummary {
  piece: number;
  box: number;
  kg: number;
  litre: number;
  gm: number;
  ml: number;
}

export type OrderStatus = "Unsettled" | "settled";

export type SettlementMethod = "Cash" | "Bank/UPI" | "Debt";
export type SettlementAction = "Created" | "Discarded" | "Settled";

export interface IOrderSettlementHistoryEntry {
  action: SettlementAction;          // Created, Discarded, Settled
  method?: SettlementMethod;        // Cash / Bank/UPI / Debt (for Settled)
  amountPaid?: number;              // payment amount for that action
  note?: string;                    // optional note
  at: Date;                         // timestamp of the action
}

export interface IOrder extends Document {
  userId: string;          // link with User (shop owner)
  orderId: string;         // ORDER UNIQUE ID (your custom unique ID)
  serialNumber: string;    // SERIAL NUMBER OF THAT ORDER

  shopName: string;        // SHOP NAME (customer shop)
  customerName: string;    // CUSTOMER NAME
  customerAddress: string; // CUSTOMER ADDRESS
  customerContact: string; // CUSTOMER CONTACT
  customerId?: string;     // link to Customer document (for debit/credit)

  items: IOrderItem[];     // PARTICULARS -> PRODUCT NAME, QUANTITY, UNIT
  freeItems: IFreeItem[];  // PRODUCTS WHICH ARE FREE WITH QUANTITY AND NAME

  quantitySummary: IQuantitySummary; // TOTAL QUANTITY IN EACH UNIT FOR THIS BILL

  subtotal: number;            // SUBTOTAL
  discountPercentage: number;  // DISCOUNT PERCENTAGE
  total: number;               // TOTAL

  status: OrderStatus;         // ORDER STATUS (Unsettled / settled)

  // settlement + discard tracking
  settlementMethod?: SettlementMethod | null; // how it was settled
  settlementAmount?: number;                  // amount paid on settlement
  settledAt?: Date | null;                    // when it was settled
  discardedAt?: Date | null;                  // when it was discarded
  settlementHistory?: IOrderSettlementHistoryEntry[];

  remarks?: string;            // REMARKS

  createdAt?: Date;            // TIMESTAMP OF THAT ORDER (from timestamps)
  updatedAt?: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["piece", "box", "kg", "litre", "gm", "ml"],
      required: true,
    },
  },
  { _id: false }
);

const FreeItemSchema = new Schema<IFreeItem>(
  {
    productId: { type: String },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["piece", "box", "kg", "litre", "gm", "ml"],
      required: true,
    },
  },
  { _id: false }
);

const QuantitySummarySchema = new Schema<IQuantitySummary>(
  {
    piece: { type: Number, default: 0 },
    box: { type: Number, default: 0 },
    kg: { type: Number, default: 0 },
    litre: { type: Number, default: 0 },
    gm: { type: Number, default: 0 },
    ml: { type: Number, default: 0 },
  },
  { _id: false }
);

const SettlementHistoryEntrySchema = new Schema<IOrderSettlementHistoryEntry>(
  {
    action: {
      type: String,
      enum: ["Created", "Discarded", "Settled"],
      required: true,
    },
    method: {
      type: String,
      enum: ["Cash", "Bank/UPI", "Debt"],
      default: undefined,
    },
    amountPaid: { type: Number, default: 0 },
    note: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: String, required: true }, // shop owner / admin

    orderId: { type: String, required: true, unique: true }, // ORDER UNIQUE ID
    serialNumber: { type: String, required: true }, // SERIAL NUMBER OF THAT ORDER

    shopName: { type: String, required: true },
    customerName: { type: String, required: true },
    customerAddress: { type: String, required: true },
    customerContact: { type: String, required: true },
    customerId: { type: String },

    items: { type: [OrderItemSchema], required: true },
    freeItems: { type: [FreeItemSchema], default: [] },

    quantitySummary: {
      type: QuantitySummarySchema,
      required: true,
      default: () => ({}),
    },

    subtotal: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["Unsettled", "settled"],
      required: true,
      default: "Unsettled",
    },

    settlementMethod: {
      type: String,
      enum: ["Cash", "Bank/UPI", "Debt"],
      default: null,
    },
    settlementAmount: { type: Number, default: 0 },
    settledAt: { type: Date, default: null },
    discardedAt: { type: Date, default: null },

    settlementHistory: {
      type: [SettlementHistoryEntrySchema],
      default: [],
    },

    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

export default models.Order || mongoose.model<IOrder>("Order", OrderSchema);
