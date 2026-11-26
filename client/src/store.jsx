import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api, setToken, getToken } from "./api.js";

const Store = createContext(null);
export const useStore = () => useContext(Store);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("souq_cart")) || []; } catch { return []; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  useEffect(() => {
    if (getToken()) api("/auth/me").then((d) => setUser(d.user)).catch(() => setToken(null));
  }, []);
  useEffect(() => {
    if (user) api("/wishlist").then((d) => setWishlist(d.products.map((p) => p._id))).catch(() => {});
    else setWishlist([]);
  }, [user]);
  useEffect(() => localStorage.setItem("souq_cart", JSON.stringify(cart)), [cart]);

  const toast = (msg) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  const addToCart = (product, qty = 1) => {
    setCart((c) => {
      const line = c.find((l) => l.product._id === product._id);
      return line
        ? c.map((l) => (l.product._id === product._id ? { ...l, qty: l.qty + qty } : l))
        : [...c, { product, qty }];
    });
    toast(`${product.name} added to cart`);
  };
  const setQty = (id, qty) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.product._id !== id) : c.map((l) => (l.product._id === id ? { ...l, qty } : l))));
  const clearCart = () => setCart([]);

  const toggleWishlist = async (product) => {
    const d = await api(`/wishlist/${product._id}`, { method: "POST" });
    setWishlist((w) => (d.inWishlist ? [...w, product._id] : w.filter((id) => id !== product._id)));
    toast(d.inWishlist ? `${product.name} saved to wishlist` : `${product.name} removed from wishlist`);
    return d.inWishlist;
  };

  const login = async (email, password) => {
    const d = await api("/auth/login", { method: "POST", body: { email, password } });
    setToken(d.token); setUser(d.user);
  };
  const register = async (name, email, password) => {
    const d = await api("/auth/register", { method: "POST", body: { name, email, password } });
    setToken(d.token); setUser(d.user);
  };
  const logout = () => { setToken(null); setUser(null); };

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <Store.Provider value={{ user, setUser, cart, count, subtotal, addToCart, setQty, clearCart, login, register, logout, drawerOpen, setDrawerOpen, toasts, toast, wishlist, toggleWishlist }}>
      {children}
    </Store.Provider>
  );
}
