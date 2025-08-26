import { useEffect, useMemo, useState } from "react";
import { uid, todayISO } from "../utils/format";

/**
 * Centralized ledger state & mutations.
 * - Persists customers/transactions to localStorage
 * - Exposes derived slices for the currently selected customer
 *
 * NOTE: These actions DO NOT trigger toasts. Callers can show UI toasts.
 */
export default function useLedger() {
  // Core state
  const [customers, setCustomers] = useState(() =>
    JSON.parse(localStorage.getItem("kirana_customers") || "[]")
  );
  const [txns, setTxns] = useState(() =>
    JSON.parse(localStorage.getItem("kirana_txns") || "[]")
  );

  // UI-related selectors
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("kirana_customers", JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem("kirana_txns", JSON.stringify(txns));
  }, [txns]);

  // Derived collections
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
    );
  }, [customers, search]);

  const current = useMemo(
    () => customers.find((c) => c.id === selectedId) || null,
    [customers, selectedId]
  );

  const currentTxns = useMemo(() => {
    return txns
      .filter((t) => t.customerId === selectedId)
      .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  }, [txns, selectedId]);

  const creditTxns = useMemo(
    () => currentTxns.filter((t) => t.type === "credit"),
    [currentTxns]
  );

  const paymentTxns = useMemo(
    () => currentTxns.filter((t) => t.type === "payment"),
    [currentTxns]
  );

  const totals = useMemo(() => {
    const credit = creditTxns.reduce((s, t) => s + Number(t.amount), 0);
    const received = paymentTxns.reduce((s, t) => s + Number(t.amount), 0);
    return { credit, received, balance: credit - received };
  }, [creditTxns, paymentTxns]);

  // Mutations (no toasts inside)
  function addCustomer({ name, phone = "", address = "" }) {
    const nm = (name || "").trim();
    if (!nm) return { ok: false, error: "Name is required" };

    const cust = {
      id: uid(),
      name: nm,
      phone: (phone || "").trim(),
      address: (address || "").trim(),
      createdAt: todayISO(),
    };
    setCustomers((p) => [cust, ...p]);
    return { ok: true, customer: cust };
  }

  function deleteCustomer(id) {
    const c = customers.find((x) => x.id === id);
    setCustomers((p) => p.filter((x) => x.id !== id));
    setTxns((p) => p.filter((t) => t.customerId !== id));
    if (selectedId === id) setSelectedId(null);
    return { ok: true, customer: c || null };
  }

  function addCredit({ customerId, items = [], dateISO }) {
    if (!customerId) return { ok: false, error: "customerId required" };

    const normalized = (items || []).map((i) => ({
      name: i.name || "Item",
      qty: Number(i.qty || 0),
      price: Number(i.price || 0),
    }));
    const amount = normalized.reduce((s, i) => s + i.qty * i.price, 0);
    if (amount <= 0) {
      return { ok: false, error: "Amount must be > 0" };
    }

    const t = {
      id: uid(),
      customerId,
      type: "credit",
      dateISO: dateISO || todayISO(),
      amount,
      items: normalized,
    };
    setTxns((p) => [t, ...p]);
    return { ok: true, txn: t };
  }

  function addPayment({ customerId, amount, method = "Cash", note = "", dateISO }) {
    if (!customerId) return { ok: false, error: "customerId required" };

    const amt = Number(amount || 0);
    if (amt <= 0) return { ok: false, error: "Amount must be > 0" };

    const t = {
      id: uid(),
      customerId,
      type: "payment",
      dateISO: dateISO || todayISO(),
      amount: amt,
      method,
      note,
    };
    setTxns((p) => [t, ...p]);
    return { ok: true, txn: t };
  }

  function deleteTxn(id) {
    const tx = txns.find((x) => x.id === id) || null;
    setTxns((p) => p.filter((x) => x.id !== id));
    return { ok: true, txn: tx };
  }

  return {
    // state
    customers,
    txns,
    selectedId,
    search,

    // setters
    setSelectedId,
    setSearch,

    // derived (for current customer)
    filteredCustomers,
    current,
    currentTxns,
    creditTxns,
    paymentTxns,
    totals,

    // actions
    addCustomer,
    deleteCustomer,
    addCredit,
    addPayment,
    deleteTxn,
  };
}
