import { Link } from "react-router-dom";
import { useStore } from "../store.jsx";

export default function Cart() {
  const { cart, setQty, subtotal } = useStore();
  if (cart.length === 0) return <p className="muted">Your cart is empty. <Link to="/">Keep shopping</Link></p>;
  return (
    <>
      <h1>Cart</h1>
      {cart.map((l) => (
        <div className="cart-line" key={l.product._id}>
          <img src={l.product.imageUrl} alt="" />
          <div>
            <Link to={`/product/${l.product.slug}`}>{l.product.name}</Link>
            <span className="muted"> {l.product.price.toLocaleString()} EGP each</span>
          </div>
          <div className="qty">
            <button onClick={() => setQty(l.product._id, l.qty - 1)}>-</button>
            <span>{l.qty}</span>
            <button onClick={() => setQty(l.product._id, l.qty + 1)} disabled={l.qty >= l.product.stock}>+</button>
          </div>
          <strong>{(l.product.price * l.qty).toLocaleString()} EGP</strong>
        </div>
      ))}
      <div className="cart-total">
        <span>Subtotal</span><strong>{subtotal.toLocaleString()} EGP</strong>
      </div>
      <Link to="/checkout" className="btn-primary">Proceed to checkout</Link>
    </>
  );
}
