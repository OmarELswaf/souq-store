import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

const FLOW = ["pending", "confirmed", "shipped", "delivered"];

export default function OrderDetail() {
  const { id } = useParams();
  const { user, toast } = useStore();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (user) api(`/orders/mine/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
  }, [user, id]);

  if (!user) return <p className="muted">Please <Link to="/login">sign in</Link>.</p>;
  if (error) return <p className="muted">{error}. <Link to="/orders">Back to my orders</Link></p>;
  if (!order) return <p className="muted">Loading...</p>;

  const stepIndex = order.status === "cancelled" ? -1 : FLOW.indexOf(order.status);
  const cancellable = ["pending", "confirmed"].includes(order.status);

  const cancel = async () => {
    setCancelling(true);
    try {
      const d = await api(`/orders/mine/${order._id}/cancel`, { method: "POST" });
      setOrder(d.order);
      toast("Order cancelled, stock returned");
    } catch (e) { setError(e.message); }
    setCancelling(false);
  };

  return (
    <div className="narrow">
      <p><Link to="/orders" className="link">← My orders</Link></p>
      <div className="order-detail-head">
        <h1 className="page-head">Order #{order._id.slice(-6).toUpperCase()}</h1>
        <span className={`status ${order.status}`}>{order.status}</span>
      </div>
      <p className="muted">Placed {new Date(order.createdAt).toLocaleString()}</p>

      {order.status === "cancelled" ? (
        <p className="status-line cancelled">This order was cancelled. The items were returned to stock.</p>
      ) : (
        <div className="steps order-steps">
          {FLOW.map((s, i) => (
            <span key={s} className={`step ${i <= stepIndex ? "done" : ""}`}>
              <b>{i <= stepIndex ? "✓" : i + 1}</b> {s[0].toUpperCase() + s.slice(1)}
            </span>
          ))}
        </div>
      )}

      <div className="order">
        {order.items.map((i) => (
          <div className="order-line" key={i.product}>
            <span>{i.name} <span className="muted">x{i.qty}</span></span>
            <span>{(i.price * i.qty).toLocaleString()} EGP</span>
          </div>
        ))}
        <div className="order-line muted"><span>Subtotal</span><span>{order.subtotal.toLocaleString()} EGP</span></div>
        {order.discount > 0 && (
          <div className="order-line coupon-ok"><span>Discount {order.couponCode && `(${order.couponCode})`}</span><span>-{order.discount.toLocaleString()} EGP</span></div>
        )}
        <div className="order-line muted"><span>Shipping</span><span>{order.shippingFee.toLocaleString()} EGP</span></div>
        <div className="order-line total"><span>Total</span><strong>{order.total.toLocaleString()} EGP</strong></div>
        <p className="muted">Cash on delivery · Deliver to: {order.shippingAddress.street}, {order.shippingAddress.city} ({order.shippingAddress.phone})</p>
      </div>

      {cancellable && (
        <button className="btn-ghost danger" onClick={cancel} disabled={cancelling}>
          {cancelling ? "Cancelling..." : "Cancel this order"}
        </button>
      )}
    </div>
  );
}
