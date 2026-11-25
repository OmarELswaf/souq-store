import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

export default function Checkout() {
  const { user, cart, subtotal, clearCart } = useStore();
  const [form, setForm] = useState({ city: "", street: "", phone: "" });
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.address) setForm((f) => ({
      city: f.city || user.address.city || "",
      street: f.street || user.address.street || "",
      phone: f.phone || user.address.phone || "",
    }));
  }, [user]);

  if (cart.length === 0) return <p className="muted">Nothing to check out. <Link to="/">Back to shop</Link></p>;
  if (!user) return <p className="muted">Please <Link to="/login">sign in</Link> to place your order.</p>;

  const total = subtotal + 50;

  const placeOrder = async (e) => {
    e.preventDefault();
    setPlacing(true); setError("");
    try {
      await api("/orders", { method: "POST", body: {
        items: cart.map((l) => ({ productId: l.product._id, qty: l.qty })),
        shippingAddress: form,
      }});
      clearCart();
      navigate("/orders");
    } catch (err) { setError(err.message); setPlacing(false); }
  };

  return (
    <>
    <h1 className="page-head">Checkout</h1>
    <div className="steps">
      <span className="step done"><b>✓</b> Cart</span><span className="sep">——</span>
      <span className="step on"><b>2</b> Delivery</span><span className="sep">——</span>
      <span className="step"><b>3</b> Done</span>
    </div>
    <div className="checkout">
      <form className="form-card" onSubmit={placeOrder}>
        <h2>Delivery address</h2>
        <label>City<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Cairo" /></label>
        <label>Street address<input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="12 Abbas El Akkad St, Nasr City" /></label>
        <label>Phone<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" /></label>
        <p className="muted">Payment: cash on delivery.</p>
        {error && <p className="error">{error}</p>}
        <button className="btn-primary" disabled={placing}>{placing ? "Placing order..." : "Place order"}</button>
      </form>
      <aside className="form-card">
        <h2>Order summary</h2>
        {cart.map((l) => <p key={l.product._id} className="sum-line"><span>{l.product.name} x{l.qty}</span><span>{(l.product.price * l.qty).toLocaleString()} EGP</span></p>)}
        <p className="sum-line"><span>Shipping</span><span>50 EGP</span></p>
        <p className="sum-line total"><span>Total</span><strong>{total.toLocaleString()} EGP</strong></p>
      </aside>
    </div>
    </>
  );
}
