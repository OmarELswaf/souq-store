import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String,
    price: Number,
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentMethod: { type: String, enum: ["cash_on_delivery", "card"], default: "cash_on_delivery" },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "failed"], default: "unpaid" },
    paymentSessionId: { type: String, default: "" },
    paymentReference: { type: String, default: "" },
    discount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: "" },
    shippingAddress: {
      city: { type: String, required: true },
      street: { type: String, required: true },
      phone: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
