import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

export default function Orders() {
  const { user } = useStore();
  const [orders, setOrders] = useState(null);

  useEffect(() => { if (user) api("/orders/mine").then((d) => setOrders(d.orders)); }, [user]);

  if (!user) return <p className="muted">Please <Link to="/login">sign in</Link>.</p>;
  if (!orders) return <p className="muted">Loading...</p>;
  if (orders.length === 0) return <p className="muted">No orders yet. <Link to="/">Start shopping</Link></p>;

  return (
    <>
      <h1>My orders</h1>
      {orders.map((o) => (
        <div className="order" key={o._id}>
          <div className="order-head">
            <span>{new Date(o.createdAt).toLocaleDateString()}</span>
            <span className={`status ${o.status}`}>{o.status}</span>
            <strong>{o.total.toLocaleString()} EGP</strong>
          </div>
          {o.items.map((i) => <p key={i.product} className="muted">{i.name} x{i.qty} - {i.price.toLocaleString()} EGP</p>)}
          <p className="muted">Deliver to: {o.shippingAddress.street}, {o.shippingAddress.city} ({o.shippingAddress.phone})</p>
        </div>
      ))}
    </>
  );
          }
