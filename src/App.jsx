import React, { useEffect, useMemo, useState } from "react";

/**
 * Kirana Ledger — Working App (Dark Mode + WhatsApp + FAB)
 * - Customer list + add/delete
 * - Separate Credit & Payment history (last 5 + View all)
 * - Add Credit (items) & Add Payment (method, note, date)
 * - Totals + WhatsApp share (preview + send)
 * - Dark mode toggle: persists and respects system preference
 * - Floating Action Button for quick add
 * - Responsive tables (horizontal scroll on small screens)
 * - Toast notifications + custom confirm dialog
 * - LocalStorage persistence
 */

// ---------- Utils ----------
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString();
const fmtDate = (iso) => new Date(iso).toLocaleString();
const inr = (n) => Number(n || 0).toFixed(2);

const toLocalInput = (iso) => {
  const d = new Date(iso || Date.now());
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (s) => new Date(s).toISOString();

export default function App() {
  // Data
  const [customers, setCustomers] = useState(() => JSON.parse(localStorage.getItem("kirana_customers") || "[]"));
  const [txns, setTxns] = useState(() => JSON.parse(localStorage.getItem("kirana_txns") || "[]"));

  // Selection & search
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  // Theme
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('kirana_dark');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    try { localStorage.setItem('kirana_dark', JSON.stringify(dark)); } catch {}
  }, [dark]);
  // Follow OS only if user hasn't set a pref before
  useEffect(() => {
    const saved = localStorage.getItem('kirana_dark');
    if (saved !== null) return;
    if (!window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDark(e.matches);
    try { mql.addEventListener('change', handler); } catch { mql.addListener(handler); }
    return () => { try { mql.removeEventListener('change', handler); } catch { mql.removeListener(handler); } };
  }, []);

  // Modals state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", phone: "", address: "" });

  const [showCredit, setShowCredit] = useState(false);
  const [creditItems, setCreditItems] = useState([{ id: uid(), name: "", qty: 1, price: 0 }]);
  const [creditDate, setCreditDate] = useState(() => todayISO());

  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState({ amount: "", method: "Cash", note: "", dateISO: todayISO() });

  const [showAllCredits, setShowAllCredits] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);

  const [sharePreview, setSharePreview] = useState({ open: false, text: "" });

  const [confirm, setConfirm] = useState({ open: false, text: "", onYes: null });
  const askConfirm = (text, onYes) => setConfirm({ open: true, text, onYes });

  const [toasts, setToasts] = useState([]);
  const notify = (msg) => { const id = uid(); setToasts(t=>[...t,{id,msg}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2600); };

  // Persist
  useEffect(() => localStorage.setItem("kirana_customers", JSON.stringify(customers)), [customers]);
  useEffect(() => localStorage.setItem("kirana_txns", JSON.stringify(txns)), [txns]);

  // Derived
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q));
  }, [customers, search]);

  const current = useMemo(() => customers.find((c) => c.id === selectedId) || null, [customers, selectedId]);
  const currentTxns = useMemo(
    () => txns.filter((t) => t.customerId === selectedId).sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO)),
    [txns, selectedId]
  );
  const creditTxns = useMemo(() => currentTxns.filter((t) => t.type === "credit"), [currentTxns]);
  const paymentTxns = useMemo(() => currentTxns.filter((t) => t.type === "payment"), [currentTxns]);
  const visibleCredits = useMemo(() => (showAllCredits ? creditTxns : creditTxns.slice(0, 5)), [showAllCredits, creditTxns]);
  const visiblePayments = useMemo(() => (showAllPayments ? paymentTxns : paymentTxns.slice(0, 5)), [showAllPayments, paymentTxns]);

  const totals = useMemo(() => {
    const credit = creditTxns.reduce((s, t) => s + Number(t.amount), 0);
    const received = paymentTxns.reduce((s, t) => s + Number(t.amount), 0);
    return { credit, received, balance: credit - received };
  }, [creditTxns, paymentTxns]);

  // WhatsApp share
  const waLink = (text, rawPhone) => {
    const phone = (rawPhone || "").replace(/\D/g, "");
    const to = phone.length === 10 ? `?phone=91${phone}` : ""; // India default
    return `https://wa.me/${to}${to ? "&" : "?"}text=${encodeURIComponent(text)}`;
  };
  const buildShareText = ({ includeLists = true } = {}) => {
    if (!current) return "";
    const L = [];
    L.push(`*${current.name} — Udhaar Summary*`);
    if (current.phone) L.push(`📞 *Mob:* ${current.phone}`);
    if (current.address) L.push(`🏠 *Address:* ${current.address}`);
    L.push("");
    L.push("📊 *Summary*");
    L.push(`• Total Credit: ₹${inr(totals.credit)}`);
    L.push(`• Payments: ₹${inr(totals.received)}`);
    L.push(`• *Current Due: ₹${inr(totals.balance)}*`);
    if (includeLists) {
      L.push("");
      L.push("🧾 *Recent Credits (5)*");
      visibleCredits.forEach((t, i) => {
        const items = t.items || [];
        const prev = items.slice(0, 2).map((it) => `${it.name} ${it.qty}x${inr(it.price)}`).join(", ");
        const more = items.length > 2 ? ` +${items.length - 2} more` : "";
        L.push(`${i + 1}. ${new Date(t.dateISO).toLocaleDateString()} — ₹${inr(t.amount)}${prev ? ` — ${prev}${more}` : ""}`);
      });
      L.push("");
      L.push("💸 *Recent Payments (5)*");
      visiblePayments.forEach((t, i) => { L.push(`${i + 1}. ${new Date(t.dateISO).toLocaleDateString()} — ₹${inr(t.amount)} — ${t.method || ""}`); });
    }
    L.push("");
    L.push("_Sent via Kirana Ledger_");
    return L.join("\n");
  };

  const openSharePreview = (includeLists) => { if (!current) return; setSharePreview({ open: true, text: buildShareText({ includeLists }) }); };
  const sendWhatsApp = () => { if (!current) return; window.open(waLink(sharePreview.text, current.phone), "_blank"); setSharePreview({ open: false, text: "" }); };

  // Actions
  const addCustomer = () => {
    const name = newCust.name.trim(); if (!name) return notify("Name required");
    const cust = { id: uid(), name, phone: newCust.phone.trim(), address: newCust.address.trim(), createdAt: todayISO() };
    setCustomers((p) => [cust, ...p]); setNewCust({ name: "", phone: "", address: "" }); setShowAddCustomer(false); notify(`Customer added: ${cust.name}`);
  };
  const addCredit = () => {
    if (!selectedId) return; const items = creditItems.map(i=>({ name:i.name||"Item", qty:Number(i.qty||0), price:Number(i.price||0) }));
    const amount = items.reduce((s,i)=>s+i.qty*i.price,0); if (amount<=0) return notify("Add item(s) > 0");
    const t = { id: uid(), customerId: selectedId, type: 'credit', dateISO: creditDate || todayISO(), amount, items };
    setTxns(p=>[t,...p]); setCreditItems([{ id: uid(), name: "", qty: 1, price: 0 }]); setCreditDate(todayISO()); setShowCredit(false); notify(`Credit added: ₹${inr(amount)}`);
  };
  const addPayment = () => {
    if (!selectedId) return; const amt = Number(payment.amount||0); if (amt<=0) return notify("Amount must be > 0");
    const t = { id: uid(), customerId: selectedId, type: 'payment', dateISO: payment.dateISO || todayISO(), amount: amt, method: payment.method, note: payment.note };
    setTxns(p=>[t,...p]); setPayment({ amount:"", method:"Cash", note:"", dateISO: todayISO() }); setShowPayment(false); notify(`Payment received: ₹${inr(amt)} via ${t.method}`);
  };
  const deleteTxn = (id) => { const tx = txns.find(x=>x.id===id); if(!tx) return; askConfirm(`Delete this ${tx.type} record?`, ()=>{ setTxns(p=>p.filter(x=>x.id!==id)); notify(`${tx.type} deleted`); }); };
  const deleteCustomer = (id) => { const c = customers.find(x=>x.id===id); askConfirm(`Delete customer "${c?.name||''}" and all records?`, ()=>{ setCustomers(p=>p.filter(x=>x.id!==id)); setTxns(p=>p.filter(t=>t.customerId!==id)); if(selectedId===id) setSelectedId(null); notify(`Customer deleted: ${c?.name||''}`); }); };

  // FAB
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-semibold tracking-tight">🧾 Kirana Ledger</span>
          {!current ? (
            <div className="ml-auto flex items-center gap-2">
              <input className="input max-w-xs" placeholder="Search name or phone" value={search} onChange={(e)=>setSearch(e.target.value)} />
              <button onClick={()=>setShowAddCustomer(true)} className="btn-primary">+ Add Customer</button>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <button onClick={()=>openSharePreview(true)} className="btn-primary">Share</button>
              <button onClick={()=>setSelectedId(null)} className="btn">Back</button>
            </div>
          )}
          <button onClick={()=>setDark(v=>!v)} className="btn ml-2" title="Toggle dark mode">{dark ? '🌙' : '☀️'}</button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {!current ? (
          <CustomerList customers={filteredCustomers} txns={txns} onOpen={setSelectedId} onDelete={deleteCustomer} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <CustomerHeader current={current} />
              <CreditTable txns={visibleCredits} fullCount={creditTxns.length} onToggle={()=>setShowAllCredits(v=>!v)} showingAll={showAllCredits} onDelete={deleteTxn} />
              <PaymentTable txns={visiblePayments} fullCount={paymentTxns.length} onToggle={()=>setShowAllPayments(v=>!v)} showingAll={showAllPayments} onDelete={deleteTxn} />
            </div>
            <div className="space-y-4">
              <TotalsCard totals={totals} onShareBalance={()=>openSharePreview(false)} onShareLast5={()=>openSharePreview(true)} />
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      {current && (
        <div className="fixed right-5 bottom-6 z-40">
          <div className="relative">
            {fabOpen && (
              <div className="absolute bottom-16 right-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg p-2 w-44">
                <button className="menu-item" onClick={()=>{ setShowCredit(true); setFabOpen(false); }}>🧾 Add Credit</button>
                <button className="menu-item" onClick={()=>{ setShowPayment(true); setFabOpen(false); }}>💸 Money Received</button>
              </div>
            )}
            <button className="fab" onClick={()=>setFabOpen(v=>!v)} title="Add">{fabOpen ? '✖' : '➕'}</button>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">{toasts.map(t=> (<div key={t.id} className="toast">{t.msg}</div>))}</div>

      {/* Modals */}
      {showAddCustomer && (
        <Modal title="Add Customer" onClose={()=>setShowAddCustomer(false)}>
          <div className="space-y-3">
            <input className="input" placeholder="Name" value={newCust.name} onChange={(e)=>setNewCust(v=>({...v,name:e.target.value}))} />
            <input className="input" placeholder="WhatsApp Number (10 digits)" value={newCust.phone} onChange={(e)=>setNewCust(v=>({...v,phone:e.target.value.replace(/\D/g,'').slice(0,10)}))} />
            <textarea className="input" rows={2} placeholder="Address" value={newCust.address} onChange={(e)=>setNewCust(v=>({...v,address:e.target.value}))} />
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={()=>setShowAddCustomer(false)}>Cancel</button>
              <button className="btn-primary" onClick={addCustomer}>Save</button>
            </div>
          </div>
        </Modal>
      )}

      {showCredit && current && (
        <Modal title={`Add Credit — ${current.name}`} onClose={()=>setShowCredit(false)}>
          <div className="space-y-3">
            <label className="text-sm font-medium">Date</label>
            <input className="input" type="datetime-local" value={toLocalInput(creditDate)} onChange={(e)=>setCreditDate(fromLocalInput(e.target.value))} />
            <div className="space-y-2">
              {creditItems.map((it,idx)=> (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                  <input className="input col-span-6" placeholder={`Item ${idx+1} name`} value={it.name} onChange={(e)=>setCreditItems(arr=>arr.map(x=>x.id===it.id?{...x,name:e.target.value}:x))} />
                  <input type="number" min={0} className="input col-span-2" placeholder="Qty" value={it.qty} onChange={(e)=>setCreditItems(arr=>arr.map(x=>x.id===it.id?{...x,qty:Number(e.target.value)}:x))} />
                  <input type="number" min={0} className="input col-span-3" placeholder="Price" value={it.price} onChange={(e)=>setCreditItems(arr=>arr.map(x=>x.id===it.id?{...x,price:Number(e.target.value)}:x))} />
                  {creditItems.length>1 && (<button onClick={()=>setCreditItems(arr=>arr.filter(x=>x.id!==it.id))} className="btn text-red-600 col-span-1">✕</button>)}
                </div>
              ))}
              <div className="flex justify-between">
                <button className="btn" onClick={()=>setCreditItems(arr=>[...arr,{id:uid(),name:"",qty:1,price:0}])}>+ Add Item</button>
                <div className="text-sm text-zinc-700 dark:text-zinc-300 self-center">Total ₹{inr(creditItems.reduce((s,i)=>s+Number(i.qty||0)*Number(i.price||0),0))}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn" onClick={()=>setShowCredit(false)}>Cancel</button>
              <button className="btn-warn" onClick={addCredit}>Save Credit</button>
            </div>
          </div>
        </Modal>
      )}

      {showPayment && current && (
        <Modal title={`Money Received — ${current.name}`} onClose={()=>setShowPayment(false)}>
          <div className="space-y-3">
            <label className="text-sm font-medium">Date</label>
            <input className="input" type="datetime-local" value={toLocalInput(payment.dateISO)} onChange={(e)=>setPayment(v=>({...v,dateISO:fromLocalInput(e.target.value)}))} />
            <input className="input" type="number" placeholder="Amount ₹" value={payment.amount} onChange={(e)=>setPayment(v=>({...v,amount:e.target.value}))} />
            <select className="input" value={payment.method} onChange={(e)=>setPayment(v=>({...v,method:e.target.value}))}>
              <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option>
            </select>
            <input className="input" placeholder="Note (optional)" value={payment.note} onChange={(e)=>setPayment(v=>({...v,note:e.target.value}))} />
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn" onClick={()=>setShowPayment(false)}>Cancel</button>
              <button className="btn-success" onClick={addPayment}>Save Payment</button>
            </div>
          </div>
        </Modal>
      )}

      {confirm.open && (
        <ConfirmModal text={confirm.text} onCancel={()=>setConfirm({open:false,text:"",onYes:null})} onConfirm={()=>{ const y = confirm.onYes; setConfirm({open:false,text:"",onYes:null}); y && y(); }} />
      )}

      {sharePreview.open && (
        <Modal title="WhatsApp Preview" onClose={()=>setSharePreview({open:false,text:""})}>
          <div className="space-y-3">
            <textarea className="input h-60" value={sharePreview.text} onChange={(e)=>setSharePreview(v=>({...v,text:e.target.value}))} />
            <div className="flex justify-between">
              <button className="btn" onClick={()=>{ navigator.clipboard.writeText(sharePreview.text); notify('Copied to clipboard'); }}>Copy</button>
              <div className="flex gap-2">
                <button className="btn" onClick={()=>setSharePreview(v=>({...v,text:buildShareText({includeLists:false})}))}>Balance only</button>
                <button className="btn-primary" onClick={sendWhatsApp}>Send</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Styles */}
      <style>{`
        .input { @apply w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500; }
        .btn { @apply px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm; }
        .btn-primary { @apply px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm; }
        .btn-warn { @apply px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-sm; }
        .btn-success { @apply px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm; }
        .toast { @apply bg-zinc-900/90 text-white px-3 py-2 rounded-lg shadow-lg text-sm dark:bg-zinc-100 dark:text-zinc-900; }
        .fab { @apply w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-2xl flex items-center justify-center shadow-xl; }
        .menu-item { @apply w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700; }
      `}</style>
    </div>
  );
}

// ---------- Components ----------
function CustomerList({ customers, txns, onOpen, onDelete }) {
  return (
    <section className="bg-white dark:bg-zinc-950 rounded-2xl shadow p-4">
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10">
            <tr>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-right">Balance (₹)</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length===0 && (<tr><td colSpan={4} className="p-6 text-center text-zinc-500">No customers yet</td></tr>)}
            {customers.map(c=>{
              const cTxns = txns.filter(t=>t.customerId===c.id);
              const credit = cTxns.filter(t=>t.type==='credit').reduce((s,t)=>s+Number(t.amount),0);
              const recv = cTxns.filter(t=>t.type==='payment').reduce((s,t)=>s+Number(t.amount),0);
              const bal = credit - recv;
              return (
                <tr key={c.id} className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="p-2 font-medium">{c.name}</td>
                  <td className="p-2">{c.phone || '-'}</td>
                  <td className={`p-2 text-right ${bal>0? 'text-amber-700 dark:text-amber-300':'text-emerald-700 dark:text-emerald-300'}`}>₹{inr(bal)}</td>
                  <td className="p-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button className="btn" onClick={()=>onOpen(c.id)}>Open</button>
                      <button className="btn text-red-600" onClick={()=>onDelete(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CustomerHeader({ current }) {
  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{current.name}</h2>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{current.phone || '-'}{current.address?` • ${current.address}`:''}</div>
        </div>
        <div className="text-right text-sm text-zinc-500">Created: {new Date(current.createdAt).toLocaleDateString()}</div>
      </div>
    </div>
  );
}

function CreditTable({ txns, fullCount, onToggle, showingAll, onDelete }) {
  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Credits <span className="ml-1 text-xs text-zinc-500">({Math.min(5, fullCount)} of {fullCount})</span></h3>
        {fullCount>5 && (<button className="btn" onClick={onToggle}>{showingAll? 'View less' : `View all (${fullCount})`}</button>)}
      </div>
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-96 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-amber-50 dark:bg-zinc-800 sticky top-0 z-10">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2">Items</th>
              <th className="p-2 text-right">Amount (₹)</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {txns.length===0 && (<tr><td colSpan={4} className="p-6 text-center text-zinc-500">📦 No credit entries</td></tr>)}
            {txns.map(t=> (
              <tr key={t.id} className="border-t border-zinc-200 dark:border-zinc-800 align-top">
                <td className="p-2 whitespace-nowrap">{fmtDate(t.dateISO)}</td>
                <td className="p-2 text-xs">
                  <ul className="list-disc pl-5 space-y-0.5">{t.items.map((i,idx)=>(<li key={idx}>{i.name} — {i.qty} x ₹{inr(i.price)}</li>))}</ul>
                </td>
                <td className="p-2 text-right">₹{inr(t.amount)}</td>
                <td className="p-2 text-center"><button className="btn text-red-600" onClick={()=>onDelete(t.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentTable({ txns, fullCount, onToggle, showingAll, onDelete }) {
  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Payments <span className="ml-1 text-xs text-zinc-500">({Math.min(5, fullCount)} of {fullCount})</span></h3>
        {fullCount>5 && (<button className="btn" onClick={onToggle}>{showingAll? 'View less' : `View all (${fullCount})`}</button>)}
      </div>
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-96 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-emerald-50 dark:bg-zinc-800 sticky top-0 z-10">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2">Method</th>
              <th className="p-2">Note</th>
              <th className="p-2 text-right">Amount (₹)</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {txns.length===0 && (<tr><td colSpan={5} className="p-6 text-center text-zinc-500">💸 No payments yet</td></tr>)}
            {txns.map(t=> (
              <tr key={t.id} className="border-t border-zinc-200 dark:border-zinc-800 align-top">
                <td className="p-2 whitespace-nowrap">{fmtDate(t.dateISO)}</td>
                <td className="p-2"><span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">{t.method || '—'}</span></td>
                <td className="p-2 text-xs">{t.note || '—'}</td>
                <td className="p-2 text-right">₹{inr(t.amount)}</td>
                <td className="p-2 text-center"><button className="btn text-red-600" onClick={()=>onDelete(t.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TotalsCard({ totals, onShareBalance, onShareLast5 }) {
  const positive = totals.balance <= 0;
  return (
    <div className="rounded-2xl shadow p-5 text-white bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-indigo-700 dark:to-purple-700">
      <div className="text-sm opacity-90">Current Due</div>
      <div className="text-3xl font-semibold tracking-tight mt-1">₹{inr(totals.balance)}</div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-xs opacity-90">Total Credit</div>
          <div className="text-lg font-semibold">₹{inr(totals.credit)}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-xs opacity-90">Money Received</div>
          <div className="text-lg font-semibold">₹{inr(totals.received)}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={onShareBalance} className="btn-success !bg-white !text-blue-700 hover:!bg-white/90">Share Balance</button>
        <button onClick={onShareLast5} className="btn-primary !bg-white !text-blue-700 hover:!bg-white/90">Share Last 5</button>
      </div>
      <div className="mt-3 text-xs opacity-90">Status: <span className={`px-2 py-0.5 rounded-full ${positive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{positive ? 'Settled / Advance' : 'Due'}</span></div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-semibold tracking-tight">{title}</h3><button className="btn" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ text, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl shadow-lg p-5">
        <div className="text-base mb-4">{text}</div>
        <div className="flex justify-end gap-2"><button className="btn" onClick={onCancel}>Cancel</button><button className="btn-warn" onClick={onConfirm}>Delete</button></div>
      </div>
    </div>
  );
}
