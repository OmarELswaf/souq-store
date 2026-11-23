import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Product } from "../src/models/Product.js";

process.env.JWT_SECRET = "test-secret";

let mongod, app, token, product;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
  product = await Product.create({
    name: "Test Bottle", slug: "test-bottle", description: "A bottle for tests",
    category: "Home", price: 100, stock: 5,
  });
  const res = await request(app).post("/api/auth/register")
    .send({ name: "Test User", email: "test@example.com", password: "password123" });
  token = res.body.token;
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test("health check", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test("login rejects a wrong password", async () => {
  const res = await request(app).post("/api/auth/login")
    .send({ email: "test@example.com", password: "wrong-password" });
  assert.equal(res.status, 401);
});

test("product listing and category filter", async () => {
  const res = await request(app).get("/api/products?category=Home");
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items[0].slug, "test-bottle");
});

test("placing an order decrements stock and prices from the DB", async () => {
  const res = await request(app).post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ items: [{ productId: product.id, qty: 2 }],
      shippingAddress: { city: "Cairo", street: "1 Test St", phone: "01000000000" } });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.subtotal, 200);
  assert.equal(res.body.order.total, 250);
  const after1 = await Product.findById(product.id);
  assert.equal(after1.stock, 3);
});

test("ordering more than the stock fails with 409", async () => {
  const res = await request(app).post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ items: [{ productId: product.id, qty: 99 }],
      shippingAddress: { city: "Cairo", street: "1 Test St", phone: "01000000000" } });
  assert.equal(res.status, 409);
});

test("orders are private without a token", async () => {
  const res = await request(app).get("/api/orders/mine");
  assert.equal(res.status, 401);
});
