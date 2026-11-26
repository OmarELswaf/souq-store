import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

export default function Checkout() {
  const { user, cart, subtotal, clearCart } = useStore();
  const [form, setForm] = useState({ city: "", street: "", phone: "" });
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, percent, discount }
  const [couponMsg, setCouponMsg] = useState("");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [cardEnabled, setCardEnabled] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.address) setForm((f) => ({
      city: f.city || user.address.city || "",
      street: f.street || user.address.street || "",
      phone: f.phone || user.address.phone || "",
    }));
  }, [user]);

  useEffect(() => {
    api("/payments/config").then((d) => setCardEnabled(Boolean(d.enabled))).catch(() => {});
  }, []);

  if (cart.length === 0) return <p className="muted">Nothing to check out. <Link to="/">Back to shop</Link></p>;
  if (!user) return <p className="muted">Please <Link to="/login">sign in</Link> to place your order.</p>;

  const discount = coupon?.discount || 0;
  const total = subtotal - discount + 50;

  const applyCoupon = async () => {
    setCouponMsg(""); setCoupon(null);
    try {
      const d = await api("/coupons/validate", { method: "POST", body: { code: couponInput, subtotal } });
      setCoupon(d);
      setCouponMsg(`${d.code} applied: ${d.percent}% off (-${d.discount.toLocaleString()} EGP)`);
    } catch (err) { setCouponMsg(err.message); }
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setPlacing(true); setError("");
    try {
      const d = await api("/orders", { method: "POST", body: {
        items: cart.map((l) => ({ productId: l.product._id, qty: l.qty })),
        shippingAddress: form,
        paymentMethod,
        ...(coupon && { couponCode: coupon.code }),
      }});
      if (paymentMethod === "card") {
        // Kashier hosted checkout: the customer pays on Kashier's page and
        // returns to the order page, which verifies the result server-side.
        const session = await api("/payments/create-session", { method: "POST", body: { orderId: d.order._id } });
        clearCart();
        window.location.href = session.sessionUrl;
        return;
      }
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
        <h2>Payment</h2>
        <label className="radio-row">
          <input type="radio" name="pay" checked={paymentMethod === "cash_on_delivery"} onChange={() => setPaymentMethod("cash_on_delivery")} />
          Cash on delivery
        </label>
        <label className={`radio-row ${cardEnabled ? "" : "muted"}`}>
          <input type="radio" name="pay" disabled={!cardEnabled} checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} />
          Card {cardEnabled ? <span className="chip-mini">Kashier test mode</span> : <span className="muted small">(not configured on this server)</span>}
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn-primary" disabled={placing}>{placing ? "Placing order..." : paymentMethod === "card" ? "Pay by card (Kashier test)" : "Place order"}</button>
      </form>
      <aside className="form-card">
        <h2>Order summary</h2>
        {cart.map((l) => <p key={l.product._id} className="sum-line"><span>{l.product.name} x{l.qty}</span><span>{(l.product.price * l.qty).toLocaleString()} EGP</span></p>)}
        <div className="coupon-row">
          <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value); setCoupon(null); setCouponMsg(""); }} placeholder="Coupon code (try WELCOME10)" />
          <button type="button" className="btn-ghost" onClick={applyCoupon} disabled={!couponInput.trim()}>Apply</button>
        </div>
        {couponMsg && <p className={`small ${coupon ? "coupon-ok" : "error"}`}>{couponMsg}</p>}
        {coupon && <p className="sum-line coupon-ok"><span>Discount ({coupon.code})</span><span>-{discount.toLocaleString()} EGP</span></p>}
        <p className="sum-line"><span>Shipping</span><span>50 EGP</span></p>
        <p className="sum-line total"><span>Total</span><strong>{total.toLocaleString()} EGP</strong></p>
      </aside>
    </div>
    </>
  );
}
