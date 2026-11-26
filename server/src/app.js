import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { ordersRouter } from "./routes/orders.js";
import { adminRouter } from "./routes/admin.js";
import { wishlistRouter } from "./routes/wishlist.js";
import { couponsRouter } from "./routes/coupons.js";
import { paymentsRouter } from "./routes/payments.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") || true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/wishlist", wishlistRouter);
  app.use("/api/coupons", couponsRouter);
  app.use("/api/payments", paymentsRouter);

  app.use((_req, res) => res.status(404).json({ message: "Not found" }));
  return app;
}
