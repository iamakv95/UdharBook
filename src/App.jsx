import React, { useEffect, useMemo, useState } from "react";

// Kirana Ledger — Refined UI (No Quick Actions)
// - Cleaner WhatsApp share (emoji sections)
// - No bottom "Quick Actions" card
// - Section headers show counts (x of N)
// - Scrollable, sticky-headed tables for better mobile use
// - Helpful empty states with inline CTAs
// - Toast notifications + custom confirm modal
// - LocalStorage persistence

function uid() { return Math.random().toString(36).slice(2, 10); }
const todayISO = () => new Date().toISOString();
const fmtDate = (iso) => new Date(iso).toLocaleString();
const inr = (n) => Number(n || 0).toFixed(2);
function toLocalInput(iso){const d=new Date(iso||Date.now());const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function fromLocalInput(s){return new Date(s).toISOString();}

export default function App(){
  const [customers,setCustomers]=useState(()=>JSON.parse(localStorage.getItem('kirana_customers')||'[]'));
  const [txns,setTxns]=useState(()=>JSON.parse(localStorage.getItem('kirana_txns')||'[]'));

  const [selectedId,setSelectedId]=useState(null);
  const [search,setSearch]=useState('');

  const [showAddCustomer,setShowAddCustomer]=useState(false);
  const [newCust,setNewCust]=useState({name:'',phone:'',address:''});

  const [showCredit,setShowCredit]=useState(false);
  const [creditItems,setCreditItems]=useState([{id:uid(),name:'',qty:1,price:0}]);
  const [creditDate,setCreditDate]=useState(()=>todayISO());

  const [showPayment,setShowPayment]=useState(false);
  const [payment,setPayment]=useState({amount:'',method:'Cash',note:'',dateISO:todayISO()});

  const [showAllCredits,setShowAllCredits]=useState(false);
  const [showAllPayments,setShowAllPayments]=useState(false);

  const [confirm,setConfirm]=useState({open:false,text:'',onYes:null});
  const [toasts,setToasts]=useState([]);
  function notify(msg){const id=uid();setToasts(t=>[...t,{id,msg}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2500)}

  useEffect(()=>localStorage.setItem('kirana_customers',JSON.stringify(customers)),[customers]);
  useEffect(()=>localStorage.setItem('kirana_txns',JSON.stringify(txns)),[txns]);

  const filteredCustomers=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return customers;return customers.filter(c=>(c.name||'').toLowerCase().includes(q)||(c.phone||'').includes(q));},[customers,search]);
  const current=useMemo(()=>customers.find(c=>c.id===selectedId)||null,[customers,selectedId]);
  const currentTxns=useMemo(()=>txns.filter(t=>t.customerId===selectedId).sort((a,b)=>new Date(b.dateISO)-new Date(a.dateISO)),[txns,selectedId]);
  const creditTxns=useMemo(()=>currentTxns.filter(t=>t.type==='credit'),[currentTxns]);
  const paymentTxns=useMemo(()=>currentTxns.filter(t=>t.type==='payment'),[currentTxns]);
  const visibleCredits=useMemo(()=>showAllCredits?creditTxns:creditTxns.slice(0,5),[showAllCredits,creditTxns]);
  const visiblePayments=useMemo(()=>showAllPayments?paymentTxns:paymentTxns.slice(0,5),[showAllPayments,paymentTxns]);
  const totals=useMemo(()=>{const credit=creditTxns.reduce((s,t)=>s+Number(t.amount),0);const received=paymentTxns.reduce((s,t)=>s+Number(t.amount),0);return{credit,received,balance:credit-received};},[creditTxns,paymentTxns]);

  function waLink(text, rawPhone){const phone=(rawPhone||'').replace(/\D/g,'');const to=phone.length===10?`?phone=91${phone}`:'';return `https://wa.me/${to}${to?'&':'?'}text=${encodeURIComponent(text)}`}
  function buildLedgerMessage({includeLists=true}={}){
    if(!current) return '';
    const L=[];
    L.push(`*${current.name} — Udhaar Summary*`);
    if(current.phone) L.push(`📞 *Mob:* ${current.phone}`);
    if(current.address) L.push(`🏠 *Address:* ${current.address}`);
    L.push('');
    L.push('📊 *Summary*');
    L.push(`• Total Credit: ₹${inr(totals.credit)}`);
    L.push(`• Payments: ₹${inr(totals.received)}`);
    L.push(`• *Current Due: ₹${inr(totals.balance)}*`);
    if(includeLists){
      L.push('');
      L.push('🧾 *Recent Credits (5)*');
      visibleCredits.forEach((t,i)=>{const items=t.items||[];const prev=items.slice(0,2).map(it=>`${it.name} ${it.qty}x${inr(it.price)}`).join(', ');const more=items.length>2?` +${items.length-2} more`:'';L.push(`${i+1}. ${new Date(t.dateISO).toLocaleDateString()} — ₹${inr(t.amount)}${prev?` — ${prev}${more}`:''}`)});
      L.push('');
      L.push('💸 *Recent Payments (5)*');
      visiblePayments.forEach((t,i)=>L.push(`${i+1}. ${new Date(t.dateISO).toLocaleDateString()} — ₹${inr(t.amount)} — ${t.method||''}`));
    }
    L.push('');
    L.push('_Sent via Kirana Ledger_');
    return L.join('\n');
  }
  function shareLedger(includeLists=true){if(!current)return;const msg=buildLedgerMessage({includeLists});window.open(waLink(msg,current.phone),'_blank');}

  function addCustomer(){const name=newCust.name.trim();if(!name)return notify('Name is required');const cust={id:uid(),name,phone:newCust.phone.trim(),address:newCust.address.trim(),createdAt:todayISO()};setCustomers(p=>[cust,...p]);setNewCust({name:'',phone:'',address:''});setShowAddCustomer(false);notify(`Customer added: ${cust.name}`)}
  function addCredit(){if(!selectedId)return;const items=creditItems.map(i=>({name:i.name||'Item',qty:Number(i.qty||0),price:Number(i.price||0)}));const amount=items.reduce((s,i)=>s+i.qty*i.price,0);if(amount<=0)return notify('Add at least one item with amount > 0');const t={id:uid(),customerId:selectedId,type:'credit',dateISO:creditDate||todayISO(),amount,items};setTxns(p=>[t,...p]);setCreditItems([{id:uid(),name:'',qty:1,price:0}]);setCreditDate(todayISO());setShowCredit(false);notify(`Credit added: ₹${inr(amount)}`)}
  function addPayment(){if(!selectedId)return;const amt=Number(payment.amount||0);if(amt<=0)return notify('Amount must be > 0');const t={id:uid(),customerId:selectedId,type:'payment',dateISO:payment.dateISO||todayISO(),amount:amt,method:payment.method,note:payment.note};setTxns(p=>[t,...p]);setPayment({amount:'',method:'Cash',note:'',dateISO:todayISO()});setShowPayment(false);notify(`Payment received: ₹${inr(amt)} via ${t.method}`)}
  function askConfirm(text,onYes){setConfirm({open:true,text,onYes});}
  function deleteTxn(id){const tx=txns.find(x=>x.id===id);if(!tx)return notify('Record not found');askConfirm(`Delete this ${tx.type==='credit'?'credit':'payment'} record?`,()=>{setTxns(p=>p.filter(x=>x.id!==id));notify(`${tx.type==='credit'?'Credit':'Payment'} deleted`);});}
  function deleteCustomer(id){const c=customers.find(x=>x.id===id);askConfirm(`Delete customer "${c?.name||''}" and all records?`,()=>{setCustomers(p=>p.filter(x=>x.id!==id));setTxns(p=>p.filter(t=>t.customerId!==id));if(selectedId===id)setSelectedId(null);notify(`Customer deleted: ${c?.name||''}`);});}

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-semibold">🧾 Kirana Customer Ledger</span>
          {!current ? (
            <div className="ml-auto flex gap-2">
              <input className="input max-w-xs" placeholder="Search name or phone" value={search} onChange={e=>setSearch(e.target.value)} />
              <button onClick={()=>setShowAddCustomer(true)} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ Add Customer</button>
            </div>
          ) : (
            <div className="ml-auto flex gap-2">
              <button onClick={()=>setShowCredit(true)} className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700">+ Add Record</button>
              <button onClick={()=>setShowPayment(true)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Money Received</button>
              <button onClick={()=>shareLedger(true)} className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Share on WhatsApp</button>
              <button onClick={()=>setSelectedId(null)} className="px-3 py-2 rounded-lg border">Back</button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {!current ? (
          <section className="bg-white rounded-2xl shadow p-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Customer</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-right">Balance (₹)</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length===0 && (<tr><td colSpan={4} className="p-6 text-center text-gray-500">No customers yet. <button className="btn-xs" onClick={()=>setShowAddCustomer(true)}>Add one</button></td></tr>)}
                  {filteredCustomers.map(c=>{const cTxns=txns.filter(t=>t.customerId===c.id);const credit=cTxns.filter(t=>t.type==='credit').reduce((s,t)=>s+Number(t.amount),0);const recv=cTxns.filter(t=>t.type==='payment').reduce((s,t)=>s+Number(t.amount),0);const bal=credit-recv;return (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-medium">{c.name}</td>
                      <td className="p-2">{c.phone||'-'}</td>
                      <td className={`p-2 text-right ${bal>0?'text-amber-700':'text-emerald-700'}`}>₹{inr(bal)}</td>
                      <td className="p-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button className="btn-xs" onClick={()=>setSelectedId(c.id)}>Open</button>
                          <button className="btn-xs text-green-700" onClick={()=>{setSelectedId(c.id);setTimeout(()=>shareLedger(false),0);}}>Share Due</button>
                          <button className="btn-xs text-red-600" onClick={()=>deleteCustomer(c.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{current.name}</h2>
                    <div className="text-sm text-gray-600">{current.phone||'-'}{current.address?` • ${current.address}`:''}</div>
                  </div>
                  <div className="text-right text-sm">Created: {new Date(current.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Credits */}
              <div className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold">Credits <span className="ml-1 text-xs text-gray-500">({Math.min(5, creditTxns.length)} of {creditTxns.length})</span></h3>
                  {creditTxns.length>5 && (
                    <button className="btn-xs" onClick={()=>setShowAllCredits(v=>!v)}>{showAllCredits?'View less':`View all (${creditTxns.length})`}</button>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-50 sticky top-0 z-10">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2">Items</th>
                        <th className="p-2 text-right">Amount (₹)</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCredits.length===0 && (<tr><td colSpan={4} className="p-6 text-center text-gray-500">No credit entries. <button className="btn-xs" onClick={()=>setShowCredit(true)}>+ Add credit</button></td></tr>)}
                      {visibleCredits.map(t=> (
                        <tr key={t.id} className="border-t align-top">
                          <td className="p-2 whitespace-nowrap">{fmtDate(t.dateISO)}</td>
                          <td className="p-2 text-xs"><ul className="list-disc pl-5 space-y-0.5">{t.items.map((i,idx)=>(<li key={idx}>{i.name} — {i.qty} x ₹{inr(i.price)}</li>))}</ul></td>
                          <td className="p-2 text-right">₹{inr(t.amount)}</td>
                          <td className="p-2 text-center"><button className="btn-xs text-red-600" onClick={()=>deleteTxn(t.id)}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments */}
              <div className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold">Payments <span className="ml-1 text-xs text-gray-500">({Math.min(5, paymentTxns.length)} of {paymentTxns.length})</span></h3>
                  {paymentTxns.length>5 && (
                    <button className="btn-xs" onClick={()=>setShowAllPayments(v=>!v)}>{showAllPayments?'View less':`View all (${paymentTxns.length})`}</button>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-emerald-50 sticky top-0 z-10">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Note</th>
                        <th className="p-2 text-right">Amount (₹)</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePayments.length===0 && (<tr><td colSpan={5} className="p-6 text-center text-gray-500">No payments. <button className="btn-xs" onClick={()=>setShowPayment(true)}>+ Add payment</button></td></tr>)}
                      {visiblePayments.map(t=> (
                        <tr key={t.id} className="border-t align-top">
                          <td className="p-2 whitespace-nowrap">{fmtDate(t.dateISO)}</td>
                          <td className="p-2">{t.method||'—'}</td>
                          <td className="p-2 text-xs">{t.note||'—'}</td>
                          <td className="p-2 text-right">₹{inr(t.amount)}</td>
                          <td className="p-2 text-center"><button className="btn-xs text-red-600" onClick={()=>deleteTxn(t.id)}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Totals sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl shadow p-4">
                <h3 className="text-base font-semibold mb-2">Totals</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total Credit</span><span>₹{inr(totals.credit)}</span></div>
                  <div className="flex justify-between"><span>Money Received</span><span>₹{inr(totals.received)}</span></div>
                  <div className="border-t pt-2 flex justify-between font-semibold"><span>Current Credit</span><span className={totals.balance>0?'text-amber-700':'text-emerald-700'}>₹{inr(totals.balance)}</span></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={()=>shareLedger(false)} className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex-1">Share Balance</button>
                  <button onClick={()=>shareLedger(true)} className="px-3 py-2 rounded-lg bg-green-700 text-white hover:bg-green-800 flex-1">Share Last 5</button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">{toasts.map(t=>(<div key={t.id} className="bg-black text-white/90 px-3 py-2 rounded-lg shadow-lg text-sm">{t.msg}</div>))}</div>

      {/* Modals */}
      {showAddCustomer&&(<Modal title="Add Customer" onClose={()=>setShowAddCustomer(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Name" value={newCust.name} onChange={e=>setNewCust(v=>({...v,name:e.target.value}))}/>
          <input className="input" placeholder="WhatsApp Number (10 digits)" value={newCust.phone} onChange={e=>setNewCust(v=>({...v,phone:e.target.value.replace(/\D/g,'').slice(0,10)}))}/>
          <textarea className="input" rows={2} placeholder="Address" value={newCust.address} onChange={e=>setNewCust(v=>({...v,address:e.target.value}))}/>
          <div className="flex justify-end gap-2"><button className="px-3 py-2 rounded-lg border" onClick={()=>setShowAddCustomer(false)}>Cancel</button><button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={addCustomer}>Save</button></div>
        </div>
      </Modal>)}

      {showCredit&&current&&(<Modal title={`Add Record — ${current.name}`} onClose={()=>setShowCredit(false)}>
        <div className="space-y-3">
          <label className="block text-sm font-medium">Date</label>
          <input className="input" type="datetime-local" value={toLocalInput(creditDate)} onChange={e=>setCreditDate(fromLocalInput(e.target.value))}/>
          <div className="space-y-2">{creditItems.map((it,idx)=>(
            <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
              <input className="input col-span-6" placeholder={`Item ${idx+1} name`} value={it.name} onChange={e=>setCreditItems(arr=>arr.map(x=>x.id===it.id?{...x,name:e.target.value}:x))}/>
              <input type="number" min={0} className="input col-span-2" placeholder="Qty" value={it.qty} onChange={e=>setCreditItems(arr=>arr.map(x=>x.id===it.id?{...x,qty:Number(e.target.value)}:x))}/>
              <input type="number" min={0} className="input col-span-3" placeholder="Price" value={it.price} onChange={e=>setCreditItems(arr=>arr.map(x=>x.id===it.id?{...x,price:Number(e.target.value)}:x))}/>
              {creditItems.length>1&&(<button onClick={()=>setCreditItems(arr=>arr.filter(x=>x.id!==it.id))} className="btn-xs text-red-600 col-span-1">✕</button>)}
            </div>))}
            <div className="flex justify-between"><button className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300" onClick={()=>setCreditItems(arr=>[...arr,{id:uid(),name:'',qty:1,price:0}])}>+ Add Item</button><div className="text-sm text-gray-700 self-center">Total ₹{inr(creditItems.reduce((s,i)=>s+Number(i.qty||0)*Number(i.price||0),0))}</div></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><button className="px-3 py-2 rounded-lg border" onClick={()=>setShowCredit(false)}>Cancel</button><button className="px-3 py-2 rounded-lg bg-amber-600 text-white" onClick={addCredit}>Save Record</button></div>
        </div>
      </Modal>)}

      {showPayment&&current&&(<Modal title={`Money Received — ${current.name}`} onClose={()=>setShowPayment(false)}>
        <div className="space-y-3">
          <label className="block text-sm font-medium">Date</label>
          <input className="input" type="datetime-local" value={toLocalInput(payment.dateISO)} onChange={e=>setPayment(v=>({...v,dateISO:fromLocalInput(e.target.value)}))}/>
          <input className="input" type="number" placeholder="Amount ₹" value={payment.amount} onChange={e=>setPayment(v=>({...v,amount:e.target.value}))}/>
          <select className="input" value={payment.method} onChange={e=>setPayment(v=>({...v,method:e.target.value}))}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option></select>
          <input className="input" placeholder="Note (optional)" value={payment.note} onChange={e=>setPayment(v=>({...v,note:e.target.value}))}/>
          <div className="flex justify-end gap-2 pt-2"><button className="px-3 py-2 rounded-lg border" onClick={()=>setShowPayment(false)}>Cancel</button><button className="px-3 py-2 rounded-lg bg-emerald-600 text-white" onClick={addPayment}>Save Payment</button></div>
        </div>
      </Modal>)}

      {confirm.open&&(<ConfirmModal text={confirm.text} onCancel={()=>setConfirm({open:false,text:'',onYes:null})} onConfirm={()=>{const y=confirm.onYes;setConfirm({open:false,text:'',onYes:null});y&&y();}}/>) }

      <style>{`
        .input { @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500; }
        .btn-xs { @apply px-2 py-1 rounded-md border bg-white hover:bg-gray-100 text-xs; }
      `}</style>
    </div>
  );
}

function Modal({title,children,onClose}){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-semibold">{title}</h3><button className="btn-xs" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}
function ConfirmModal({text,onCancel,onConfirm}){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-5">
        <div className="text-base mb-4">{text}</div>
        <div className="flex justify-end gap-2"><button className="px-3 py-2 rounded-lg border" onClick={onCancel}>Cancel</button><button className="px-3 py-2 rounded-lg bg-red-600 text-white" onClick={onConfirm}>Delete</button></div>
      </div>
    </div>
  );
}
