import { Router } from "express";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { Order } from "../models/Order.js";
import { requireAuth } from "../middleware/auth.js";

// Kashier test-mode card payments through their hosted payment page.
// Card data never touches this server: the customer pays on Kashier's page,
// and this server confirms the result with Kashier directly before marking
// an order paid. Docs: https://developers.kashier.io/docs

export const paymentsRouter = Router();

const BASE = "https://test-api.kashier.io"; // test environment only
const { KASHIER_MERCHANT_ID, KASHIER_API_KEY, KASHIER_SECRET_KEY } = process.env;

const configured = Boolean(KASHIER_MERCHANT_ID && KASHIER_API_KEY && KASHIER_SECRET_KEY);

const kashierReady = (_req, res, next) =>
  configured ? next() : res.status(503).json({ message: "Card payments are not configured on this server" });

paymentsRouter.get("/config", (_req, res) => {
  res.json({ enabled: configured, gateway: configured ? "kashier_test" : null });
});

// Create a hosted checkout session for an existing unpaid card order.
// Amounts always come from the order in the database, never from the client.
paymentsRouter.post("/create-session", requireAuth, kashierReady, async (req, res) => {
  const { orderId } = req.body || {};
  if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: "Invalid order id" });
  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.paymentMethod !== "card") return res.status(400).json({ message: "This order is not a card order" });
  if (order.paymentStatus === "paid") return res.status(409).json({ message: "This order is already paid" });

  const reference = `${order.id}-${crypto.randomBytes(3).toString("hex")}`;
  const clientOrigin = process.env.CLIENT_ORIGIN?.split(",")[0] || "http://localhost:5173";

  const kashierRes = await fetch(`${BASE}/v3/payment/sessions`, {
    method: "POST",
    headers: {
      Authorization: KASHIER_SECRET_KEY,
      "api-key": KASHIER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentType: "credit",
      amount: order.total.toFixed(2),
      currency: "EGP",
      order: reference,
      merchantId: KASHIER_MERCHANT_ID,
      merchantRedirect: `${clientOrigin}/orders/${order.id}`,
      failureRedirect: true,
      display: "en",
      type: "one-time",
      allowedMethods: "card",
      enable3DS: true,
      description: `Souq order #${order.id.slice(-6).toUpperCase()}`,
      customer: { email: req.user.email, reference: req.user.id },
      interactionSource: "ECOMMERCE",
      metaData: { orderId: order.id },
    }),
  });
  const data = await kashierRes.json().catch(() => ({}));
  if (!kashierRes.ok || !data.sessionUrl) {
    return res.status(502).json({ message: data.message || "Kashier did not create a payment session" });
  }

  order.paymentSessionId = data._id || data.sessionId || "";
  order.paymentReference = reference;
  await order.save();
  res.json({ sessionUrl: data.sessionUrl });
});

// After Kashier redirects the customer back, verify the session with
// Kashier directly and only then mark the order paid. Safe to call twice.
paymentsRouter.post("/verify", requireAuth, kashierReady, async (req, res) => {
  const { orderId } = req.body || {};
  if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: "Invalid order id" });
  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.paymentStatus === "paid") return res.json({ order });
  if (!order.paymentSessionId) return res.status(400).json({ message: "No payment was started for this order" });

  const kashierRes = await fetch(`${BASE}/v3/payment/sessions/${order.paymentSessionId}/payment`, {
    headers: { Authorization: KASHIER_SECRET_KEY },
  });
  const data = await kashierRes.json().catch(() => ({}));
  if (!kashierRes.ok) return res.status(502).json({ message: "Could not verify the payment with Kashier" });

  const status = String(data.status || data.paymentStatus || data.state || "").toUpperCase();
  if (!["SUCCESS", "APPROVED", "PAID", "CAPTURED"].includes(status))
    return res.status(402).json({ message: `Payment is ${status || "unknown"}, not completed`, raw: undefined });

  const paidAmount = Number(data.amount ?? data.totalAmount ?? NaN);
  if (Number.isFinite(paidAmount) && Math.abs(paidAmount - order.total) > 0.01)
    return res.status(409).json({ message: "Payment amount does not match the order" });

  order.paymentStatus = "paid";
  await order.save();
  res.json({ order });
});
