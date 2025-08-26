import React, { useMemo, useState } from "react";
import { IoCallOutline  } from "react-icons/io5";
import Header from "./components/Header";
import CustomerTable from "./components/customers/CustomerTable";
import CreditsTable from "./components/ledger/CreditsTable";
import PaymentsTable from "./components/ledger/PaymentsTable";
import TotalsSidebar from "./components/sidebar/TotalsSidebar";
import Modal from "./components/ui/Modal";
import ConfirmModal from "./components/ui/ConfirmModal";

import useLedger from "./hooks/useLedger";
import {
  uid,
  todayISO,
  inr,
  toLocalInput,
  fromLocalInput,
} from "./utils/format";
import { waLink, buildLedgerMessage } from "./utils/whatsapp";

export default function App() {
  // Centralized data/state from hook
  const {
    customers,
    txns,
    selectedId,
    search,
    setSelectedId,
    setSearch,
    filteredCustomers,
    current,
    creditTxns,
    paymentTxns,
    totals,
    addCustomer,
    deleteCustomer,
    addCredit,
    addPayment,
    deleteTxn,
  } = useLedger();

  // Local UI state
  const [showSearch, setShowSearch] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", phone: "", address: "" });

  const [showCredit, setShowCredit] = useState(false);
  const [creditItems, setCreditItems] = useState([
    { id: uid(), name: "", qty: 1, price: 0 },
  ]);
  const [creditDate, setCreditDate] = useState(() => todayISO());

  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState({
    amount: "",
    method: "Cash",
    note: "",
    dateISO: todayISO(),
  });

  const [showAllCredits, setShowAllCredits] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);

  const [confirm, setConfirm] = useState({
    open: false,
    text: "",
    onYes: null,
  });
  const [toasts, setToasts] = useState([]);

  function notify(msg) {
    const id = uid();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }

  // Slicing for "last 5"
  const visibleCredits = useMemo(
    () => (showAllCredits ? creditTxns : creditTxns.slice(0, 5)),
    [showAllCredits, creditTxns]
  );
  const visiblePayments = useMemo(
    () => (showAllPayments ? paymentTxns : paymentTxns.slice(0, 5)),
    [showAllPayments, paymentTxns]
  );

  // Share helpers
  function shareCurrent(includeLists = true) {
    if (!current) return;
    const msg = buildLedgerMessage({
      current,
      totals,
      visibleCredits,
      visiblePayments,
      options: { includeLists },
    });
    window.open(waLink(msg, current.phone), "_blank");
  }

  function shareForCustomer(customerId, includeLists = false) {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const custTxns = txns
      .filter((t) => t.customerId === customerId)
      .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
    const credits = custTxns.filter((t) => t.type === "credit");
    const payments = custTxns.filter((t) => t.type === "payment");
    const tot = {
      credit: credits.reduce((s, t) => s + Number(t.amount), 0),
      received: payments.reduce((s, t) => s + Number(t.amount), 0),
    };
    tot.balance = tot.credit - tot.received;

    const msg = buildLedgerMessage({
      current: cust,
      totals: tot,
      visibleCredits: includeLists ? credits.slice(0, 5) : [],
      visiblePayments: includeLists ? payments.slice(0, 5) : [],
      options: { includeLists },
    });
    window.open(waLink(msg, cust.phone), "_blank");
  }

  function askConfirm(text, onYes) {
    setConfirm({ open: true, text, onYes });
  }

  // UI wrappers around hook actions (for toasts/confirm)
  function handleAddCustomer() {
    const res = addCustomer(newCust);
    if (!res.ok) return notify(res.error);
    setNewCust({ name: "", phone: "", address: "" });
    setShowAddCustomer(false);
    notify(`Customer added: ${res.customer.name}`);
  }

  function handleDeleteCustomer(id) {
    const c = customers.find((x) => x.id === id);
    askConfirm(`Delete customer "${c?.name || ""}" and all records?`, () => {
      deleteCustomer(id);
      notify(`Customer deleted: ${c?.name || ""}`);
    });
  }

  function handleAddCredit() {
    if (!selectedId) return;
    const res = addCredit({
      customerId: selectedId,
      items: creditItems,
      dateISO: creditDate || todayISO(),
    });
    if (!res.ok) return notify(res.error);
    setCreditItems([{ id: uid(), name: "", qty: 1, price: 0 }]);
    setCreditDate(todayISO());
    setShowCredit(false);
    notify(`Credit added: ₹${inr(res.txn.amount)}`);
  }

  function handleAddPayment() {
    if (!selectedId) return;
    const res = addPayment({
      customerId: selectedId,
      amount: payment.amount,
      method: payment.method,
      note: payment.note,
      dateISO: payment.dateISO || todayISO(),
    });
    if (!res.ok) return notify(res.error);
    setPayment({ amount: "", method: "Cash", note: "", dateISO: todayISO() });
    setShowPayment(false);
    notify(`Payment received: ₹${inr(res.txn.amount)} via ${res.txn.method}`);
  }

  function handleDeleteTxn(id) {
    const tx = txns.find((x) => x.id === id);
    if (!tx) return notify("Record not found");
    askConfirm(
      `Delete this ${tx.type === "credit" ? "credit" : "payment"} record?`,
      () => {
        deleteTxn(id);
        notify(`${tx.type === "credit" ? "Credit" : "Payment"} deleted`);
      }
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — list mode shows search icon; details mode shows only back with icon */}
      <Header
        mode={current ? "details" : "list"}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch((v) => !v)}
        onBack={() => setSelectedId(null)}
      />

      {/* Search input (only in list mode) */}
      {showSearch && !current && (
        <div className="bg-white border-b border-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <input
              className="input w-full"
              placeholder="Search name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4">
        {!current ? (
          // =======================
          // Customer List Page
          // =======================
          <section className="bg-transparent">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Customer List</h2>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                + Add Customer
              </button>
            </div>

            <CustomerTable
              customers={filteredCustomers}
              txns={txns}
              onSelect={(id) => setSelectedId(id)}
              onDelete={handleDeleteCustomer}
              onShare={(id) => shareForCustomer(id, false)}
              onAddCustomer={() => setShowAddCustomer(true)}
            />
          </section>
        ) : (
          // =======================
          // Customer Details Page
          // =======================
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* Action bar (same placement style as list page) */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold capitalize">
                    {current.name}
                  </h3>
                  <div className="text-xs text-black flex items-center gap-1">
                    <IoCallOutline  /> {current.phone || "-"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCredit(true)}
                    className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                  >
                    + Add Record
                  </button>
                  <button
                    onClick={() => setShowPayment(true)}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Money Received
                  </button>
                  <button
                    onClick={() => shareCurrent(true)}
                    className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                  >
                    Share on WhatsApp
                  </button>
                </div>
              </div>

              {/* Credits & Payments tables */}
              <CreditsTable
                credits={visibleCredits}
                totalCount={creditTxns.length}
                showAll={showAllCredits}
                onToggleShowAll={() => setShowAllCredits((v) => !v)}
                onDelete={handleDeleteTxn}
                onAddCredit={() => setShowCredit(true)}
              />

              <PaymentsTable
                payments={visiblePayments}
                totalCount={paymentTxns.length}
                showAll={showAllPayments}
                onToggleShowAll={() => setShowAllPayments((v) => !v)}
                onDelete={handleDeleteTxn}
                onAddPayment={() => setShowPayment(true)}
              />
            </div>

            {/* Totals sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <TotalsSidebar
                totals={totals}
                onShareBalance={() => shareCurrent(false)}
                onShareLast5={() => shareCurrent(true)}
              />
            </div>
          </section>
        )}
      </main>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-black text-white/90 px-3 py-2 rounded-lg shadow-lg text-sm"
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Modals */}
      {showAddCustomer && (
        <Modal title="Add Customer" onClose={() => setShowAddCustomer(false)}>
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Name"
              value={newCust.name}
              onChange={(e) =>
                setNewCust((v) => ({ ...v, name: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder="WhatsApp Number (10 digits)"
              value={newCust.phone}
              onChange={(e) =>
                setNewCust((v) => ({
                  ...v,
                  phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                }))
              }
            />
            <textarea
              className="input"
              rows={2}
              placeholder="Address"
              value={newCust.address}
              onChange={(e) =>
                setNewCust((v) => ({ ...v, address: e.target.value }))
              }
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg border"
                onClick={() => setShowAddCustomer(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-blue-600 text-white"
                onClick={handleAddCustomer}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showCredit && current && (
        <Modal
          title={`Add Record — ${current.name}`}
          onClose={() => setShowCredit(false)}
        >
          <div className="space-y-3">
            <label className="block text-sm font-medium">Date</label>
            <input
              className="input"
              type="datetime-local"
              value={toLocalInput(creditDate)}
              onChange={(e) => setCreditDate(fromLocalInput(e.target.value))}
            />

            <div className="space-y-2">
              {creditItems.map((it, idx) => (
                <div
                  key={it.id}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <input
                    className="input col-span-6"
                    placeholder={`Item ${idx + 1} name`}
                    value={it.name}
                    onChange={(e) =>
                      setCreditItems((arr) =>
                        arr.map((x) =>
                          x.id === it.id ? { ...x, name: e.target.value } : x
                        )
                      )
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    className="input col-span-2"
                    placeholder="Qty"
                    value={it.qty}
                    onChange={(e) =>
                      setCreditItems((arr) =>
                        arr.map((x) =>
                          x.id === it.id
                            ? { ...x, qty: Number(e.target.value) }
                            : x
                        )
                      )
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    className="input col-span-3"
                    placeholder="Price"
                    value={it.price}
                    onChange={(e) =>
                      setCreditItems((arr) =>
                        arr.map((x) =>
                          x.id === it.id
                            ? { ...x, price: Number(e.target.value) }
                            : x
                        )
                      )
                    }
                  />
                  {creditItems.length > 1 && (
                    <button
                      onClick={() =>
                        setCreditItems((arr) =>
                          arr.filter((x) => x.id !== it.id)
                        )
                      }
                      className="btn-xs text-red-600 col-span-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <div className="flex justify-between">
                <button
                  className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                  onClick={() =>
                    setCreditItems((arr) => [
                      ...arr,
                      { id: uid(), name: "", qty: 1, price: 0 },
                    ])
                  }
                >
                  + Add Item
                </button>
                <div className="text-sm text-gray-700 self-center">
                  Total ₹
                  {inr(
                    creditItems.reduce(
                      (s, i) => s + Number(i.qty || 0) * Number(i.price || 0),
                      0
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                className="px-3 py-2 rounded-lg border"
                onClick={() => setShowCredit(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-amber-600 text-white"
                onClick={handleAddCredit}
              >
                Save Record
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showPayment && current && (
        <Modal
          title={`Money Received — ${current.name}`}
          onClose={() => setShowPayment(false)}
        >
          <div className="space-y-3">
            <label className="block text-sm font-medium">Date</label>
            <input
              className="input"
              type="datetime-local"
              value={toLocalInput(payment.dateISO)}
              onChange={(e) =>
                setPayment((v) => ({
                  ...v,
                  dateISO: fromLocalInput(e.target.value),
                }))
              }
            />
            <input
              className="input"
              type="number"
              placeholder="Amount ₹"
              value={payment.amount}
              onChange={(e) =>
                setPayment((v) => ({ ...v, amount: e.target.value }))
              }
            />
            <select
              className="input"
              value={payment.method}
              onChange={(e) =>
                setPayment((v) => ({ ...v, method: e.target.value }))
              }
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Other</option>
            </select>
            <input
              className="input"
              placeholder="Note (optional)"
              value={payment.note}
              onChange={(e) =>
                setPayment((v) => ({ ...v, note: e.target.value }))
              }
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="px-3 py-2 rounded-lg border"
                onClick={() => setShowPayment(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white"
                onClick={handleAddPayment}
              >
                Save Payment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirm.open && (
        <ConfirmModal
          text={confirm.text}
          onCancel={() => setConfirm({ open: false, text: "", onYes: null })}
          onConfirm={() => {
            const y = confirm.onYes;
            setConfirm({ open: false, text: "", onYes: null });
            y && y();
          }}
        />
      )}

      {/* Shared Tailwind shortcuts */}
      <style>{`
        .input { @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500; }
        .btn-xs { @apply px-2 py-1 rounded-md border bg-white hover:bg-gray-100 text-xs; }
      `}</style>
    </div>
  );
}
