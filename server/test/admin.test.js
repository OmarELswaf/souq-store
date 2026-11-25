import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Product } from "../src/models/Product.js";
import { User } from "../src/models/User.js";

process.env.JWT_SECRET = "test-secret";

let mongod, app, adminToken, customerToken, otherToken, product;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
  product = await Product.create({
    name: "Admin Test Lamp", slug: "admin-test-lamp", description: "A lamp for admin tests",
    category: "Home", price: 200, stock: 4,
  });
  await User.create({ name: "Admin", email: "admin@example.com",
    passwordHash: await User.hashPassword("adminpass1"), role: "admin" });
  const login = (email, password) =>
    request(app).post("/api/auth/login").send({ email, password });
  adminToken = (await login("admin@example.com", "adminpass1")).body.token;
  const reg = (email) => request(app).post("/api/auth/register")
    .send({ name: "C", email, password: "password123" });
  customerToken = (await reg("cust@example.com")).body.token;
  otherToken = (await reg("other@example.com")).body.token;
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const asAdmin = (r) => r.set("Authorization", `Bearer ${adminToken}`);
const asCustomer = (r) => r.set("Authorization", `Bearer ${customerToken}`);

const address = { city: "Cairo", street: "1 Test St", phone: "01000000000" };

test("admin routes reject customers and anonymous callers", async () => {
  assert.equal((await request(app).get("/api/admin/stats")).status, 401);
  assert.equal((await asCustomer(request(app).get("/api/admin/stats"))).status, 403);
});

test("admin can create, update and delete a product", async () => {
  const create = await asAdmin(request(app).post("/api/admin/products"))
    .send({ name: "New Mug", description: "A mug", category: "Home", price: 150, stock: 10 });
  assert.equal(create.status, 201);
  assert.equal(create.body.product.slug, "new-mug");
  const id = create.body.product._id;

  const patch = await asAdmin(request(app).patch(`/api/admin/products/${id}`)).send({ price: 175 });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.product.price, 175);

  const del = await asAdmin(request(app).delete(`/api/admin/products/${id}`));
  assert.equal(del.status, 200);
  assert.equal(await Product.findById(id), null);
  const gone = await request(app).get("/api/products/new-mug");
  assert.equal(gone.status, 404);
});

test("admin product creation validates required fields", async () => {
  const res = await asAdmin(request(app).post("/api/admin/products")).send({ name: "Incomplete" });
  assert.equal(res.status, 400);
});

test("customer can read own order detail but not someone else's", async () => {
  const placed = await asCustomer(request(app).post("/api/orders"))
    .send({ items: [{ productId: product.id, qty: 1 }], shippingAddress: address });
  assert.equal(placed.status, 201);
  const id = placed.body.order._id;

  const own = await asCustomer(request(app).get(`/api/orders/mine/${id}`));
  assert.equal(own.status, 200);
  assert.equal(own.body.order._id, id);

  const stranger = await request(app).get(`/api/orders/mine/${id}`)
    .set("Authorization", `Bearer ${otherToken}`);
  assert.equal(stranger.status, 404);
});

test("customer cancellation restores stock and blocks later status changes", async () => {
  const placed = await asCustomer(request(app).post("/api/orders"))
    .send({ items: [{ productId: product.id, qty: 2 }], shippingAddress: address });
  const id = placed.body.order._id;
  const before1 = (await Product.findById(product.id)).stock;

  const cancel = await asCustomer(request(app).post(`/api/orders/mine/${id}/cancel`));
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.order.status, "cancelled");
  assert.equal((await Product.findById(product.id)).stock, before1 + 2);

  const again = await asCustomer(request(app).post(`/api/orders/mine/${id}/cancel`));
  assert.equal(again.status, 409);

  const adminMove = await asAdmin(request(app).patch(`/api/admin/orders/${id}/status`))
    .send({ status: "confirmed" });
  assert.equal(adminMove.status, 409);
});

test("admin walks an order through the lifecycle and bad transitions fail", async () => {
  const placed = await asCustomer(request(app).post("/api/orders"))
    .send({ items: [{ productId: product.id, qty: 1 }], shippingAddress: address });
  const id = placed.body.order._id;

  const skip = await asAdmin(request(app).patch(`/api/admin/orders/${id}/status`))
    .send({ status: "delivered" });
  assert.equal(skip.status, 409);

  for (const status of ["confirmed", "shipped", "delivered"]) {
    const res = await asAdmin(request(app).patch(`/api/admin/orders/${id}/status`)).send({ status });
    assert.equal(res.status, 200);
    assert.equal(res.body.order.status, status);
  }

  const listed = await asAdmin(request(app).get("/api/admin/orders?status=delivered"));
  assert.equal(listed.status, 200);
  assert.ok(listed.body.orders.some((o) => o._id === id));
});

test("admin stats report revenue excluding cancelled orders", async () => {
  const res = await asAdmin(request(app).get("/api/admin/stats"));
  assert.equal(res.status, 200);
  assert.ok(res.body.revenue > 0);
  assert.ok(res.body.productCount >= 1);
  assert.equal(typeof res.body.ordersByStatus.cancelled, "number");
});

test("profile update saves name and address", async () => {
  const res = await asCustomer(request(app).patch("/api/auth/me"))
    .send({ name: "Updated Name", address: { city: "Giza", street: "9 Palm St", phone: "01111111111" } });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.name, "Updated Name");
  assert.equal(res.body.user.address.city, "Giza");
  const me = await asCustomer(request(app).get("/api/auth/me"));
  assert.equal(me.body.user.address.phone, "01111111111");
  const bad = await asCustomer(request(app).patch("/api/auth/me")).send({ name: "  " });
  assert.equal(bad.status, 400);
});

test("simultaneous orders cannot oversell the last units", async () => {
  const scarce = await Product.create({
    name: "Scarce Item", slug: "scarce-item", description: "One left",
    category: "Home", price: 50, stock: 1,
  });
  const place = (token) => request(app).post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ items: [{ productId: scarce.id, qty: 1 }], shippingAddress: address });
  const [a, b] = await Promise.all([place(customerToken), place(otherToken)]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [201, 409]);
  assert.equal((await Product.findById(scarce.id)).stock, 0);
});
