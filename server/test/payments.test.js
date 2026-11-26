import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Product } from "../src/models/Product.js";

process.env.JWT_SECRET = "test-secret";
// No KASHIER_* credentials in the test environment: the payments API must
// report itself disabled and refuse session creation with 503.

let mongod, app, token, product;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
  product = await Product.create({
    name: "Pay Lamp", slug: "pay-lamp", description: "A lamp to pay for",
    category: "Home", price: 100, stock: 5,
  });
  token = (await request(app).post("/api/auth/register")
    .send({ name: "Payer", email: "payer@example.com", password: "password123" })).body.token;
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const asCustomer = (r) => r.set("Authorization", `Bearer ${token}`);
const address = { city: "Cairo", street: "1 Test St", phone: "01000000000" };

test("payments config reports disabled without Kashier credentials", async () => {
  const res = await request(app).get("/api/payments/config");
  assert.equal(res.status, 200);
  assert.equal(res.body.enabled, false);
});

test("a card order can be placed and stays unpaid", async () => {
  const res = await asCustomer(request(app).post("/api/orders"))
    .send({ items: [{ productId: product.id, qty: 1 }], shippingAddress: address, paymentMethod: "card" });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.paymentMethod, "card");
  assert.equal(res.body.order.paymentStatus, "unpaid");
});

test("an unknown payment method is rejected", async () => {
  const res = await asCustomer(request(app).post("/api/orders"))
    .send({ items: [{ productId: product.id, qty: 1 }], shippingAddress: address, paymentMethod: "crypto" });
  assert.equal(res.status, 400);
});

test("session creation refuses cleanly when Kashier is not configured", async () => {
  const order = await asCustomer(request(app).post("/api/orders"))
    .send({ items: [{ productId: product.id, qty: 1 }], shippingAddress: address, paymentMethod: "card" });
  const res = await asCustomer(request(app).post("/api/payments/create-session"))
    .send({ orderId: order.body.order._id });
  assert.equal(res.status, 503);
});
