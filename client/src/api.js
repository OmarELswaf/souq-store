import { demoApi } from "./demo.js";

const BASE = import.meta.env.VITE_API_URL || "/api";
let demoMode = false;

export const isDemoMode = () => demoMode;

export function getToken() {
  return localStorage.getItem("souq_token");
}
export function setToken(token) {
  token ? localStorage.setItem("souq_token", token) : localStorage.removeItem("souq_token");
}

export async function api(path, { method = "GET", body } = {}) {
  if (demoMode) return demoApi(path, { method, body });
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    if (err instanceof TypeError) {
      // API unreachable (hosted preview without a backend): run on demo data.
      demoMode = true;
      window.dispatchEvent(new Event("souq-demo-mode"));
      return demoApi(path, { method, body });
    }
    throw err;
  }
}
