import { useEffect, useState } from "react";
import { Routes, Route, Link, NavLink, useNavigate } from "react-router-dom";
import { isDemoMode } from "./api.js";
import { useStore } from "./store.jsx";
import Home from "./pages/Home.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Login from "./pages/Login.jsx";
import Orders from "./pages/Orders.jsx";

function CartDrawer() {
  const { cart, setQty, subtotal, drawerOpen, setDrawerOpen } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);
  return (
    <div className={`drawer-root ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
      <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
      <aside className="drawer" role="dialog" aria-label="Shopping cart">
        <div className="drawer-head">
          <h2>Your cart {cart.length > 0 && <span className="drawer-count">{cart.reduce((s, l) => s + l.qty, 0)}</span>}</h2>
          <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close cart">✕</button>
        </div>
        {cart.length === 0 ? (
          <div className="drawer-empty">
            <span className="drawer-empty-icon">🛒</span>
            <p>Your cart is empty</p>
            <button className="btn-primary" onClick={() => setDrawerOpen(false)}>Start shopping</button>
          </div>
        ) : (
          <>
            <div className="drawer-lines">
              {cart.map((l) => (
                <div className="drawer-line" key={l.product._id}>
                  <img src={l.product.imageUrl} alt="" />
                  <div className="drawer-line-info">
                    <span className="drawer-line-name">{l.product.name}</span>
                    <span className="muted">{l.product.price.toLocaleString()} EGP</span>
                    <div className="qty">
                      <button onClick={() => setQty(l.product._id, l.qty - 1)} aria-label="Decrease">−</button>
                      <span>{l.qty}</span>
                      <button onClick={() => setQty(l.product._id, l.qty + 1)} disabled={l.qty >= l.product.stock} aria-label="Increase">+</button>
                    </div>
                  </div>
                  <strong>{(l.product.price * l.qty).toLocaleString()}</strong>
                </div>
              ))}
            </div>
            <div className="drawer-foot">
              <div className="drawer-subtotal"><span>Subtotal</span><strong>{subtotal.toLocaleString()} EGP</strong></div>
              <p className="muted small">Cash on delivery · demo checkout</p>
              <button className="btn-primary btn-block" onClick={() => { setDrawerOpen(false); navigate("/checkout"); }}>Checkout securely →</button>
              <button className="btn-ghost btn-block" onClick={() => { setDrawerOpen(false); navigate("/cart"); }}>View full cart</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toast-host">
      {toasts.map((t) => <div className="toast" key={t.id}><span className="toast-check">✓</span>{t.msg}</div>)}
    </div>
  );
}

export default function App() {
  const { user, count, logout, setDrawerOpen } = useStore();
  const bottomNav = (
    <nav className="bottom-nav">
      <NavLink to="/" className="bn-item">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
        <span>Shop</span>
      </NavLink>
      <button className="bn-item" onClick={() => setDrawerOpen(true)}>
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <span>Cart</span>
        {count > 0 && <b className="bn-badge">{count}</b>}
      </button>
      {user ? (
        <NavLink to="/orders" className="bn-item">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span>Orders</span>
        </NavLink>
      ) : (
        <NavLink to="/login" className="bn-item">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Sign in</span>
        </NavLink>
      )}
    </nav>
  );
  const [demo, setDemo] = useState(isDemoMode());
  useEffect(() => {
    const f = () => setDemo(true);
    window.addEventListener("souq-demo-mode", f);
    return () => window.removeEventListener("souq-demo-mode", f);
  }, []);
  const navigate = useNavigate();
  return (
    <>
      {demo && <div className="demo-banner">Demo mode - the API is not connected, so the store is running on demo data in your browser. Clone the repo to run the full MERN stack locally.</div>}
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">Souq<span>.</span></Link>
          <nav>
            <NavLink to="/">Shop</NavLink>
            {user && <NavLink to="/orders">My orders</NavLink>}
          </nav>
          <div className="topbar-right">
            {user ? (
              <>
                <span className="hi">Hi, {user.name.split(" ")[0]}</span>
                <button className="link" onClick={() => { logout(); navigate("/"); }}>Log out</button>
              </>
            ) : (
              <NavLink to="/login" className="signin">Sign in</NavLink>
            )}
            <button className="cart-btn" onClick={() => setDrawerOpen(true)} aria-label="Open cart">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <span className="cart-btn-label">Cart</span>
              {count > 0 && <b className="cart-badge">{count}</b>}
            </button>
          </div>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </main>
      <footer className="footer">Souq - a MERN stack demo store by Omar Elsawaf. Cash on delivery only, demo data.</footer>
      {bottomNav}
      <CartDrawer />
      <Toasts />
    </>
  );
}
