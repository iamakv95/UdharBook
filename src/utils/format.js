// src/utils/format.js

// Generate a short unique id
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ISO timestamp for "now"
export const todayISO = () => new Date().toISOString();

// Pretty date/time from ISO
export const fmtDate = (iso) => new Date(iso).toLocaleString();

// INR money format (fixed 2 decimals)
export const inr = (n) => Number(n || 0).toFixed(2);

// Convert ISO to <input type="datetime-local"> value
export function toLocalInput(iso) {
  const d = new Date(iso || Date.now());
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

// Convert <input type="datetime-local"> value back to ISO
export function fromLocalInput(s) {
  return new Date(s).toISOString();
}
