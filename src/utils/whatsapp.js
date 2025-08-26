// src/utils/whatsapp.js
import { inr } from "./format";

/**
 * Build WhatsApp deep link for a given message + (optional) Indian 10-digit number.
 * If a 10-digit number is provided, it’s treated as an Indian number (adds +91).
 */
export function waLink(text, rawPhone) {
  const phone = (rawPhone || "").replace(/\D/g, "");
  const to = phone.length === 10 ? `?phone=91${phone}` : "";
  return `https://wa.me/${to}${to ? "&" : "?"}text=${encodeURIComponent(
    text || ""
  )}`;
}

/**
 * Construct a shareable ledger message.
 * @param {Object} params
 * @param {Object} params.current         - Current customer object {name, phone, address}
 * @param {Object} params.totals          - {credit, received, balance}
 * @param {Array}  params.visibleCredits  - Array of recent credit txns [{dateISO, amount, items: [{name, qty, price}], ...}]
 * @param {Array}  params.visiblePayments - Array of recent payment txns [{dateISO, amount, method, ...}]
 * @param {Object} [params.options]
 * @param {boolean} [params.options.includeLists=true] - Include last 5 lists
 */
export function buildLedgerMessage({
  current,
  totals,
  visibleCredits = [],
  visiblePayments = [],
  options = {},
}) {
  if (!current) return "";
  const includeLists = options.includeLists ?? true;

  const L = [];
  L.push(`*${current.name} — Udhaar Summary*`);
  if (current.phone) L.push(`📞 *Mob:* ${current.phone}`);
  if (current.address) L.push(`🏠 *Address:* ${current.address}`);
  L.push("");

  L.push("📊 *Summary*");
  L.push(`• Total Credit: ₹${inr(totals?.credit)}`);
  L.push(`• Payments: ₹${inr(totals?.received)}`);
  L.push(`• *Current Due: ₹${inr(totals?.balance)}*`);

  if (includeLists) {
    L.push("");
    L.push("🧾 *Recent Credits (5)*");
    visibleCredits.forEach((t, i) => {
      const items = t.items || [];
      const prev = items
        .slice(0, 2)
        .map((it) => `${it.name} ${it.qty}x${inr(it.price)}`)
        .join(", ");
      const more = items.length > 2 ? ` +${items.length - 2} more` : "";
      L.push(
        `${i + 1}. ${new Date(t.dateISO).toLocaleDateString()} — ₹${inr(
          t.amount
        )}${prev ? ` — ${prev}${more}` : ""}`
      );
    });

    L.push("");
    L.push("💸 *Recent Payments (5)*");
    visiblePayments.forEach((t, i) => {
      L.push(
        `${i + 1}. ${new Date(t.dateISO).toLocaleDateString()} — ₹${inr(
          t.amount
        )} — ${t.method || ""}`
      );
    });
  }

  L.push("");
  L.push("_Sent via Kirana Ledger_");
  return L.join("\n");
}
