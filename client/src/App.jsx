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

export default function App() {
  const { user, count, logout } = useStore();
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
            <NavLink to="/login">Sign in</NavLink>
          )}
          <Link to="/cart" className="cart-btn">Cart{count > 0 && <b>{count}</b>}</Link>
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
    </>
  );
}
