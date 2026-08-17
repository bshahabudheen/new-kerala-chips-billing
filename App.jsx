import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutGrid, Package, ArrowDownCircle, ArrowUpCircle, Factory,
  Undo2, RotateCcw, BarChart3, Plus, Trash2, Search, X, Loader2, Save,
  Receipt, Printer, Share2, Wallet, Phone, CheckCircle2, Circle
} from "lucide-react";

// ---------- storage helpers ----------
const STORAGE_KEY = "nkc-data";
const emptyData = { items: [], entries: [], payments: [], nextBillNo: { purchase: 1, sale: 1, production: 1, purchase_return: 1, sales_return: 1 } };

// Works in a normal browser/Vite build and also keeps compatibility with
// environments that provide window.storage.
async function readNKCStorage(key) {
  try {
    if (window.storage?.get) {
      const res = await window.storage.get(key, false);
      if (res?.value) return res.value;
    }
  } catch (_) {}
  return window.localStorage.getItem(key);
}

async function writeNKCStorage(key, value) {
  try {
    if (window.storage?.set) {
      await window.storage.set(key, value, false);
      return;
    }
  } catch (_) {}
  window.localStorage.setItem(key, value);
}

const TYPE_META = {
  purchase:        { label: "Stock In / Purchase",  sign: +1, needsParty: true,  partyLabel: "Supplier", color: "#4C7A51" },
  sale:             { label: "Stock Out / Sale",      sign: -1, needsParty: true,  partyLabel: "Customer", color: "#C0392B" },
  production:       { label: "Production",            sign: +1, needsParty: false, partyLabel: "",         color: "#D4A017" },
  purchase_return:  { label: "Purchase Return",        sign: -1, needsParty: true,  partyLabel: "Supplier", color: "#8A5A2B" },
  sales_return:     { label: "Sales Return",           sign: +1, needsParty: true,  partyLabel: "Customer", color: "#7A6B58" },
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmtMoney(n) {
  return "₹" + (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtQty(n) {
  const r = Math.round((n + Number.EPSILON) * 1000) / 1000;
  return r.toLocaleString("en-IN");
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await readNKCStorage(STORAGE_KEY);

if (stored) {
  const parsed = JSON.parse(stored);
  setData({ ...emptyData, ...parsed });
} else {
  setData(emptyData);
}
        }
      } catch (e) {
        setData(emptyData);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setData(next);
    setSaving(true);
    try {
      await writeNKCStorage(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      showToast("Couldn't save — check connection and try again.", true);
    } finally {
      setSaving(false);
    }
  }, []);

  function showToast(msg, isError) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 2800);
  }

  const stockByItem = useMemo(() => {
    const map = {};
    if (!data) return map;
    data.items.forEach((it) => { map[it.id] = it.opening || 0; });
    data.entries.forEach((e) => {
      const meta = TYPE_META[e.type];
      if (!meta) return;
      map[e.itemId] = (map[e.itemId] || 0) + meta.sign * e.qty;
    });
    return map;
  }, [data]);

  const paidByBill = useMemo(() => {
    const map = {};
    if (!data) return map;
    (data.payments || []).forEach((p) => { map[p.billId] = (map[p.billId] || 0) + p.amount; });
    return map;
  }, [data]);

  const [invoiceBill, setInvoiceBill] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading || !data) {
    return (
      <div style={{ ...S.appShell, alignItems: "center", justifyContent: "center", display: "flex" }}>
        <Loader2 className="spin" size={28} color="#C0392B" />
        <style>{`.spin{animation:spin 0.9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "items", label: "Items", icon: Package },
    { id: "purchase", label: "Stock In", icon: ArrowDownCircle },
    { id: "sale", label: "Stock Out", icon: ArrowUpCircle },
    { id: "production", label: "Production", icon: Factory },
    { id: "purchase_return", label: "Purchase Return", icon: Undo2 },
    { id: "sales_return", label: "Sales Return", icon: RotateCcw },
    { id: "dues", label: "Customer Dues", icon: Wallet },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <div style={S.appShell} className="nkc-shell">
      <style>{globalCSS}</style>

      <header className="nkc-topbar" style={S.topbar}>
        <div style={S.brand}>
          <div style={S.brandMark}>NK</div>
          <div>
            <div style={S.brandName}>New Kerala Chips</div>
            <div style={S.brandSub}>Stock &amp; Billing</div>
          </div>
        </div>
        <button className="nkc-hamburger" style={S.hamburgerBtn} onClick={() => setMobileNavOpen((v) => !v)} aria-label="Menu">
          <LayoutGrid size={19} />
        </button>
      </header>

      <aside className={"nkc-sidebar" + (mobileNavOpen ? " nkc-sidebar-open" : "")} style={S.sidebar}>
        <nav className="nkc-nav" style={{ marginTop: 4 }}>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { setTab(n.id); setMobileNavOpen(false); }}
                className="nkc-navbtn"
                style={{ ...S.navBtn, ...(active ? S.navBtnActive : {}) }}
              >
                <Icon size={17} strokeWidth={2} />
                <span className="nkc-navlabel">{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="nkc-saveindicator" style={S.saveIndicator}>
          {saving ? (<><Loader2 className="spin" size={13} /> saving…</>) : (<><Save size={13} /> saved</>)}
        </div>
      </aside>

      <main style={S.main} className="nkc-main">
        {toast && (
          <div style={{ ...S.toast, ...(toast.isError ? S.toastError : {}) }}>{toast.msg}</div>
        )}
        {tab === "dashboard" && <Dashboard data={data} stockByItem={stockByItem} paidByBill={paidByBill} />}
        {tab === "items" && <ItemsTab data={data} persist={persist} showToast={showToast} stockByItem={stockByItem} />}
        {["purchase", "sale", "production", "purchase_return", "sales_return"].includes(tab) && (
          <EntryTab
            type={tab}
            data={data}
            persist={persist}
            showToast={showToast}
            stockByItem={stockByItem}
            paidByBill={paidByBill}
            onOpenInvoice={setInvoiceBill}
          />
        )}
        {tab === "dues" && (
          <DuesTab data={data} persist={persist} showToast={showToast} paidByBill={paidByBill} onOpenInvoice={setInvoiceBill} />
        )}
        {tab === "reports" && <ReportsTab data={data} />}
      </main>

      {invoiceBill && <InvoiceModal bill={invoiceBill} paid={paidByBill[invoiceBill.billId] || 0} onClose={() => setInvoiceBill(null)} />}
    </div>
  );
}

// ---------------- Dashboard ----------------
function Dashboard({ data, stockByItem, paidByBill }) {
  const totalItems = data.items.length;
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = data.entries.filter((e) => e.date === today);
  const todaySales = todayEntries.filter((e) => e.type === "sale").reduce((s, e) => s + e.amount, 0);
  const todayPurchases = todayEntries.filter((e) => e.type === "purchase").reduce((s, e) => s + e.amount, 0);

  const salesByBill = useMemo(() => {
    const map = {};
    data.entries.filter((e) => e.type === "sale").forEach((e) => {
      if (!map[e.billId]) map[e.billId] = 0;
      map[e.billId] += e.amount;
    });
    return map;
  }, [data.entries]);
  const totalDues = Object.entries(salesByBill).reduce((s, [billId, total]) => {
    const bal = total - (paidByBill[billId] || 0);
    return s + Math.max(0, bal);
  }, 0);

  const maxStock = Math.max(1, ...data.items.map((it) => stockByItem[it.id] || 0));

  return (
    <div>
      <Header title="Dashboard" subtitle="Today's snapshot and current stock levels" />
      <div style={S.statRow}>
        <StatCard label="Items tracked" value={totalItems} accent="#D4A017" />
        <StatCard label="Today's sales" value={fmtMoney(todaySales)} accent="#C0392B" />
        <StatCard label="Today's purchases" value={fmtMoney(todayPurchases)} accent="#4C7A51" />
        <StatCard label="Outstanding dues" value={fmtMoney(totalDues)} accent="#8A5A2B" />
      </div>

      <div style={S.card}>
        <div style={S.cardHeadRow}>
          <h3 style={S.cardTitle}>Stock levels</h3>
        </div>
        {data.items.length === 0 ? (
          <EmptyState text="No items yet. Add items in the Items tab to start tracking stock." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            {data.items.map((it) => {
              const qty = stockByItem[it.id] || 0;
              const pct = Math.max(3, Math.min(100, (qty / maxStock) * 100));
              const low = qty <= (it.reorder || 0);
              return (
                <div key={it.id} style={S.stockRow}>
                  <div style={S.stockRowLabel}>
                    <span style={{ fontWeight: 600 }}>{it.name}</span>
                    <span style={{ color: "#7A6B58", fontSize: 12.5 }}>{fmtQty(qty)} {it.unit}</span>
                  </div>
                  <div style={S.packetTrack}>
                    <div style={{ ...S.packetFill, width: pct + "%", background: low ? "#C0392B" : "#D4A017" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...S.statCard, borderTop: `3px solid ${accent}` }}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

// ---------------- Items ----------------
function ItemsTab({ data, persist, showToast, stockByItem }) {
  const [form, setForm] = useState({ name: "", unit: "kg", rate: "", opening: "", reorder: "" });
  const [editingId, setEditingId] = useState(null);

  function resetForm() {
    setForm({ name: "", unit: "kg", rate: "", opening: "", reorder: "" });
    setEditingId(null);
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Item name is required.", true); return; }
    const next = { ...data, items: [...data.items] };
    if (editingId) {
      const idx = next.items.findIndex((i) => i.id === editingId);
      next.items[idx] = { ...next.items[idx], name: form.name.trim(), unit: form.unit, rate: parseFloat(form.rate) || 0, reorder: parseFloat(form.reorder) || 0 };
    } else {
      next.items.push({
        id: uid(),
        name: form.name.trim(),
        unit: form.unit,
        rate: parseFloat(form.rate) || 0,
        opening: parseFloat(form.opening) || 0,
        reorder: parseFloat(form.reorder) || 0,
      });
    }
    persist(next);
    showToast(editingId ? "Item updated." : "Item added.");
    resetForm();
  }

  function editItem(it) {
    setEditingId(it.id);
    setForm({ name: it.name, unit: it.unit, rate: String(it.rate), opening: String(it.opening), reorder: String(it.reorder || "") });
  }

  function removeItem(id) {
    const used = data.entries.some((e) => e.itemId === id);
    if (used) { showToast("Can't delete — item has stock movement history.", true); return; }
    persist({ ...data, items: data.items.filter((i) => i.id !== id) });
    showToast("Item removed.");
  }

  return (
    <div>
      <Header title="Items" subtitle="Manage the products you make, buy, and sell" />

      <div style={S.card}>
        <h3 style={S.cardTitle}>{editingId ? "Edit item" : "Add an item"}</h3>
        <form onSubmit={submit} style={S.formGrid}>
          <Field label="Item name">
            <input style={S.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Banana Chips 200g" />
          </Field>
          <Field label="Unit">
            <select style={S.input} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {["kg", "g", "pcs", "packet", "box", "l"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Default rate (₹)">
            <input style={S.input} type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="0.00" />
          </Field>
          {!editingId && (
            <Field label="Opening stock">
              <input style={S.input} type="number" step="0.001" value={form.opening} onChange={(e) => setForm({ ...form, opening: e.target.value })} placeholder="0" />
            </Field>
          )}
          <Field label="Reorder level">
            <input style={S.input} type="number" step="0.001" value={form.reorder} onChange={(e) => setForm({ ...form, reorder: e.target.value })} placeholder="0" />
          </Field>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button type="submit" style={S.primaryBtn}><Plus size={15} /> {editingId ? "Save changes" : "Add item"}</button>
            {editingId && <button type="button" onClick={resetForm} style={S.ghostBtn}>Cancel</button>}
          </div>
        </form>
      </div>

      <div style={S.card}>
        <h3 style={S.cardTitle}>All items ({data.items.length})</h3>
        {data.items.length === 0 ? <EmptyState text="No items yet — add your first one above." /> : (
          <table style={S.table}>
            <thead>
              <tr><th>Name</th><th>Unit</th><th>Rate</th><th>Current stock</th><th>Reorder at</th><th></th></tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id}>
                  <td style={{ fontWeight: 600 }}>{it.name}</td>
                  <td>{it.unit}</td>
                  <td>{fmtMoney(it.rate)}</td>
                  <td style={(stockByItem[it.id] || 0) <= (it.reorder || 0) ? { color: "#C0392B", fontWeight: 600 } : {}}>
                    {fmtQty(stockByItem[it.id] || 0)}
                  </td>
                  <td>{it.reorder || 0}</td>
                  <td style={{ textAlign: "right" }}>
                    <button style={S.iconBtn} onClick={() => editItem(it)} title="Edit">✎</button>
                    <button style={S.iconBtn} onClick={() => removeItem(it.id)} title="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------- Entry (Purchase / Sale / Production / Returns) ----------------
function EntryTab({ type, data, persist, showToast, stockByItem, paidByBill, onOpenInvoice }) {
  const meta = TYPE_META[type];
  const isSale = type === "sale";
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [party, setParty] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [cart, setCart] = useState([]);
  const [lineItem, setLineItem] = useState({ itemId: "", qty: "", rate: "" });
  const [payInput, setPayInput] = useState({});

  const billNo = data.nextBillNo[type];

  function recordPayment(bill) {
    const raw = payInput[bill.billId];
    const amount = parseFloat(raw);
    if (!amount || amount <= 0) { showToast("Enter a valid payment amount.", true); return; }
    const balance = bill.total - (paidByBill[bill.billId] || 0);
    if (amount - balance > 0.009) {
      showToast(`That's more than the balance due (${fmtMoney(balance)}).`, true);
      return;
    }
    const payment = { id: uid(), billId: bill.billId, party: bill.party, date: new Date().toISOString().slice(0, 10), amount: Math.round(amount * 100) / 100 };
    persist({ ...data, payments: [...(data.payments || []), payment] });
    showToast(`Payment of ${fmtMoney(amount)} recorded for #${bill.billNo}.`);
    setPayInput({ ...payInput, [bill.billId]: "" });
  }

  function addLine() {
    if (!lineItem.itemId) { showToast("Pick an item first.", true); return; }
    const qty = parseFloat(lineItem.qty);
    if (!qty || qty <= 0) { showToast("Enter a valid quantity.", true); return; }
    const item = data.items.find((i) => i.id === lineItem.itemId);
    const rate = lineItem.rate === "" ? item.rate : parseFloat(lineItem.rate);
    if ((type === "sale" || type === "purchase_return") && (stockByItem[item.id] || 0) - cartQtyFor(item.id) < qty) {
      showToast(`Only ${fmtQty((stockByItem[item.id] || 0) - cartQtyFor(item.id))} ${item.unit} of ${item.name} in stock.`, true);
      return;
    }
    setCart([...cart, { id: uid(), itemId: item.id, itemName: item.name, unit: item.unit, qty, rate }]);
    setLineItem({ itemId: "", qty: "", rate: "" });
  }

  function cartQtyFor(itemId) {
    return cart.filter((c) => c.itemId === itemId).reduce((s, c) => s + c.qty, 0);
  }

  function removeLine(id) { setCart(cart.filter((c) => c.id !== id)); }

  function saveBill() {
    if (cart.length === 0) { showToast("Add at least one item line.", true); return; }
    if (meta.needsParty && !party.trim()) { showToast(`${meta.partyLabel} name is required.`, true); return; }
    const billId = uid();
    const newEntries = cart.map((c) => ({
      id: uid(),
      billId,
      billNo,
      type,
      date,
      party: party.trim(),
      partyPhone: partyPhone.trim(),
      itemId: c.itemId,
      itemName: c.itemName,
      unit: c.unit,
      qty: c.qty,
      rate: c.rate,
      amount: Math.round(c.qty * c.rate * 100) / 100,
    }));
    const next = {
      ...data,
      entries: [...data.entries, ...newEntries],
      nextBillNo: { ...data.nextBillNo, [type]: billNo + 1 },
    };
    persist(next);
    showToast(`${meta.label} #${billNo} saved.`);
    setCart([]);
    setParty("");
    setPartyPhone("");
  }

  const cartTotal = cart.reduce((s, c) => s + c.qty * c.rate, 0);

  const bills = useMemo(() => {
    const grouped = {};
    data.entries.filter((e) => e.type === type).forEach((e) => {
      if (!grouped[e.billId]) grouped[e.billId] = { billId: e.billId, billNo: e.billNo, date: e.date, party: e.party, partyPhone: e.partyPhone || "", lines: [], total: 0 };
      grouped[e.billId].lines.push(e);
      grouped[e.billId].total += e.amount;
    });
    return Object.values(grouped).sort((a, b) => b.billNo - a.billNo);
  }, [data.entries, type]);

  return (
    <div>
      <Header title={meta.label} subtitle={`Bill #${billNo}`} />

      <div style={S.card}>
        <div style={S.formGrid}>
          <Field label="Date">
            <input style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {meta.needsParty && (
            <Field label={meta.partyLabel}>
              <input style={S.input} value={party} onChange={(e) => setParty(e.target.value)} placeholder={meta.partyLabel + " name"} />
            </Field>
          )}
          {isSale && (
            <Field label="Phone (optional)">
              <input style={S.input} value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} placeholder="For WhatsApp share" />
            </Field>
          )}
        </div>

        <div style={{ ...S.formGrid, marginTop: 14, alignItems: "flex-end" }}>
          <Field label="Item">
            <select style={S.input} value={lineItem.itemId} onChange={(e) => {
              const item = data.items.find((i) => i.id === e.target.value);
              setLineItem({ itemId: e.target.value, qty: "", rate: item ? String(item.rate) : "" });
            }}>
              <option value="">Select item…</option>
              {data.items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity">
            <input style={S.input} type="number" step="0.001" value={lineItem.qty} onChange={(e) => setLineItem({ ...lineItem, qty: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Rate (₹)">
            <input style={S.input} type="number" step="0.01" value={lineItem.rate} onChange={(e) => setLineItem({ ...lineItem, rate: e.target.value })} placeholder="0.00" />
          </Field>
          <button style={S.primaryBtn} onClick={addLine}><Plus size={15} /> Add line</button>
        </div>

        {cart.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <table style={S.table}>
              <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {cart.map((c) => (
                  <tr key={c.id}>
                    <td>{c.itemName}</td>
                    <td>{fmtQty(c.qty)} {c.unit}</td>
                    <td>{fmtMoney(c.rate)}</td>
                    <td>{fmtMoney(c.qty * c.rate)}</td>
                    <td style={{ textAlign: "right" }}><button style={S.iconBtn} onClick={() => removeLine(c.id)}><X size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Total</td><td style={{ fontWeight: 700 }}>{fmtMoney(cartTotal)}</td><td></td></tr></tfoot>
            </table>
            <button style={{ ...S.primaryBtn, marginTop: 12, background: meta.color }} onClick={saveBill}>
              <Save size={15} /> Save {meta.label.toLowerCase()}
            </button>
          </div>
        )}
      </div>

      <div style={S.card}>
        <h3 style={S.cardTitle}>{isSale ? "Invoices" : `Recent ${meta.label.toLowerCase()} entries`} ({bills.length})</h3>
        {bills.length === 0 ? <EmptyState text="No entries yet." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bills.slice(0, 30).map((b) => {
              const paid = paidByBill ? (paidByBill[b.billId] || 0) : 0;
              const balance = Math.round((b.total - paid) * 100) / 100;
              const status = balance <= 0.009 ? "paid" : paid > 0 ? "partial" : "unpaid";
              return (
                <div key={b.billId} style={S.billCard}>
                  <div style={S.billCardHead}>
                    <span>#{b.billNo} · {b.date}{b.party ? " · " + b.party : ""}</span>
                    <span style={{ fontWeight: 700 }}>{fmtMoney(b.total)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#7A6B58" }}>
                    {b.lines.map((l) => `${l.itemName} (${fmtQty(l.qty)} ${l.unit})`).join(", ")}
                  </div>
                  {isSale && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <span style={{ ...S.statusBadge, ...(status === "paid" ? S.badgePaid : status === "partial" ? S.badgePartial : S.badgeUnpaid) }}>
                          {status === "paid" ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                          {status === "paid" ? "Paid" : status === "partial" ? `Balance ${fmtMoney(balance)}` : `Due ${fmtMoney(balance)}`}
                        </span>
                        <button style={S.linkBtn} onClick={() => onOpenInvoice && onOpenInvoice(b)}><Receipt size={13} /> Invoice</button>
                      </div>
                      {status !== "paid" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <input
                            style={{ ...S.input, flex: 1, padding: "6px 9px" }}
                            type="number" step="0.01"
                            placeholder={`Receive amount (max ${fmtMoney(balance)})`}
                            value={payInput[b.billId] || ""}
                            onChange={(e) => setPayInput({ ...payInput, [b.billId]: e.target.value })}
                          />
                          <button style={{ ...S.ghostBtn, height: "auto", padding: "6px 12px" }} onClick={() => recordPayment(b)}>
                            <Wallet size={13} /> Record
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Customer Dues ----------------
function DuesTab({ data, persist, showToast, paidByBill, onOpenInvoice }) {
  const [payInput, setPayInput] = useState({});
  const [filter, setFilter] = useState("");

  const customers = useMemo(() => {
    const byBill = {};
    data.entries.filter((e) => e.type === "sale").forEach((e) => {
      if (!byBill[e.billId]) byBill[e.billId] = { billId: e.billId, billNo: e.billNo, date: e.date, party: e.party, partyPhone: e.partyPhone || "", lines: [], total: 0 };
      byBill[e.billId].lines.push(e);
      byBill[e.billId].total += e.amount;
    });
    const byCustomer = {};
    Object.values(byBill).forEach((b) => {
      const name = b.party || "Walk-in";
      if (!byCustomer[name]) byCustomer[name] = { name, phone: b.partyPhone, invoiced: 0, paid: 0, bills: [] };
      const paid = paidByBill[b.billId] || 0;
      byCustomer[name].invoiced += b.total;
      byCustomer[name].paid += Math.min(paid, b.total);
      byCustomer[name].bills.push({ ...b, paid, balance: Math.round((b.total - paid) * 100) / 100 });
    });
    return Object.values(byCustomer)
      .map((c) => ({ ...c, balance: Math.round((c.invoiced - c.paid) * 100) / 100 }))
      .filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => b.balance - a.balance);
  }, [data.entries, paidByBill, filter]);

  const totalDue = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);

  function recordPayment(bill, party) {
    const raw = payInput[bill.billId];
    const amount = parseFloat(raw);
    if (!amount || amount <= 0) { showToast("Enter a valid payment amount.", true); return; }
    if (amount - bill.balance > 0.009) { showToast(`That's more than the balance due (${fmtMoney(bill.balance)}).`, true); return; }
    const payment = { id: uid(), billId: bill.billId, party, date: new Date().toISOString().slice(0, 10), amount: Math.round(amount * 100) / 100 };
    persist({ ...data, payments: [...(data.payments || []), payment] });
    showToast(`Payment of ${fmtMoney(amount)} recorded for #${bill.billNo}.`);
    setPayInput({ ...payInput, [bill.billId]: "" });
  }

  return (
    <div>
      <Header title="Customer Dues" subtitle="Who owes what, across all invoices" />
      <div style={S.statRow}>
        <StatCard label="Customers with dues" value={customers.filter((c) => c.balance > 0.009).length} accent="#8A5A2B" />
        <StatCard label="Total outstanding" value={fmtMoney(totalDue)} accent="#C0392B" />
      </div>
      <div style={S.card}>
        <Field label="Search customer">
          <input style={S.input} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Type a name…" />
        </Field>
      </div>
      {customers.length === 0 ? (
        <div style={S.card}><EmptyState text="No sales invoiced yet." /></div>
      ) : (
        customers.map((c) => (
          <div key={c.name} style={{ ...S.card }}>
            <div style={S.cardHeadRow}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.name}</div>
                {c.phone && <div style={{ fontSize: 12, color: "#7A6B58", display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} />{c.phone}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#7A6B58" }}>Invoiced {fmtMoney(c.invoiced)} · Paid {fmtMoney(c.paid)}</div>
                <div style={{ fontWeight: 700, color: c.balance > 0.009 ? "#C0392B" : "#4C7A51" }}>{c.balance > 0.009 ? `Due ${fmtMoney(c.balance)}` : "Settled"}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {c.bills.filter((b) => b.balance > 0.009).map((b) => (
                <div key={b.billId} style={{ ...S.billCard, background: "#FBF6EC" }}>
                  <div style={S.billCardHead}>
                    <span>#{b.billNo} · {b.date}</span>
                    <span style={{ fontWeight: 700 }}>Due {fmtMoney(b.balance)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <button style={S.linkBtn} onClick={() => onOpenInvoice && onOpenInvoice(b)}><Receipt size={13} /> Invoice</button>
                    <input
                      style={{ ...S.input, flex: 1, minWidth: 120, padding: "6px 9px" }}
                      type="number" step="0.01"
                      placeholder={`Receive (max ${fmtMoney(b.balance)})`}
                      value={payInput[b.billId] || ""}
                      onChange={(e) => setPayInput({ ...payInput, [b.billId]: e.target.value })}
                    />
                    <button style={{ ...S.ghostBtn, height: "auto", padding: "6px 12px" }} onClick={() => recordPayment(b, c.name)}>
                      <Wallet size={13} /> Record
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---------------- Invoice modal ----------------
function InvoiceModal({ bill, paid, onClose }) {
  const balance = Math.round((bill.total - paid) * 100) / 100;

  function share() {
    const lines = bill.lines.map((l) => `${l.itemName} - ${fmtQty(l.qty)} ${l.unit} x ${fmtMoney(l.rate)} = ${fmtMoney(l.qty * l.rate)}`).join("\n");
    const text = `New Kerala Chips\nInvoice #${bill.billNo} · ${bill.date}\n${bill.party ? "Customer: " + bill.party + "\n" : ""}\n${lines}\n\nTotal: ${fmtMoney(bill.total)}\nPaid: ${fmtMoney(paid)}\nBalance: ${fmtMoney(balance)}`;
    if (navigator.share) {
      navigator.share({ title: `Invoice #${bill.billNo}`, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  function print() {
    window.print();
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #nkc-invoice-print, #nkc-invoice-print * { visibility: visible; }
          #nkc-invoice-print { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
        <button style={S.modalClose} onClick={onClose}><X size={18} /></button>
        <div id="nkc-invoice-print" style={S.invoiceSheet}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 19 }}>New Kerala Chips</div>
            <div style={{ fontSize: 12, color: "#7A6B58" }}>Invoice #{bill.billNo} · {bill.date}</div>
          </div>
          {bill.party && (
            <div style={{ fontSize: 13, marginBottom: 10 }}>
              <strong>Customer:</strong> {bill.party}{bill.partyPhone ? " · " + bill.partyPhone : ""}
            </div>
          )}
          <table style={S.table}>
            <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>
              {bill.lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.itemName}</td>
                  <td>{fmtQty(l.qty)} {l.unit}</td>
                  <td>{fmtMoney(l.rate)}</td>
                  <td>{fmtMoney(l.qty * l.rate)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Total</td><td style={{ fontWeight: 700 }}>{fmtMoney(bill.total)}</td></tr>
              <tr><td colSpan={3} style={{ textAlign: "right" }}>Paid</td><td>{fmtMoney(paid)}</td></tr>
              <tr><td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Balance</td><td style={{ fontWeight: 700, color: balance > 0.009 ? "#C0392B" : "#4C7A51" }}>{fmtMoney(balance)}</td></tr>
            </tfoot>
          </table>
          <div style={{ textAlign: "center", fontSize: 11, color: "#9A8B76", marginTop: 16 }}>Thank you for your business</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }} className="nkc-no-print">
          <button style={{ ...S.primaryBtn, flex: 1 }} onClick={print}><Printer size={15} /> Print</button>
          <button style={{ ...S.ghostBtn, flex: 1 }} onClick={share}><Share2 size={15} /> Share</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Reports ----------------
function ReportsTab({ data }) {
  const [reportType, setReportType] = useState("sale");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const filtered = data.entries.filter((e) => {
      if (e.type !== reportType) return false;
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    });
    const byItem = {};
    filtered.forEach((e) => {
      if (!byItem[e.itemId]) byItem[e.itemId] = { itemName: e.itemName, unit: e.unit, qty: 0, amount: 0, count: 0 };
      byItem[e.itemId].qty += e.qty;
      byItem[e.itemId].amount += e.amount;
      byItem[e.itemId].count += 1;
    });
    return Object.values(byItem).sort((a, b) => b.amount - a.amount);
  }, [data.entries, reportType, from, to]);

  const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
  const label = reportType === "sale" ? "Item-wise Sale Report" : "Item-wise Purchase Report";

  return (
    <div>
      <Header title="Reports" subtitle="Item-wise summaries for sales and purchases" />
      <div style={S.card}>
        <div style={S.formGrid}>
          <Field label="Report">
            <select style={S.input} value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="sale">Item-wise Sale Report</option>
              <option value="purchase">Item-wise Purchase Report</option>
            </select>
          </Field>
          <Field label="From"><input style={S.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><input style={S.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </div>

      <div style={S.card}>
        <h3 style={S.cardTitle}>{label}</h3>
        {rows.length === 0 ? <EmptyState text="No matching entries for this range." /> : (
          <table style={S.table}>
            <thead><tr><th>Item</th><th>Bills</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itemName}>
                  <td style={{ fontWeight: 600 }}>{r.itemName}</td>
                  <td>{r.count}</td>
                  <td>{fmtQty(r.qty)} {r.unit}</td>
                  <td>{fmtMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Grand total</td><td style={{ fontWeight: 700 }}>{fmtMoney(grandTotal)}</td></tr></tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------- shared bits ----------------
function Header({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h1 style={S.h1}>{title}</h1>
      {subtitle && <div style={S.subtitle}>{subtitle}</div>}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label style={S.fieldWrap}>
      <span style={S.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
function EmptyState({ text }) {
  return <div style={S.empty}>{text}</div>;
}

// ---------------- styles ----------------
const globalCSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  input, select, button { font-family: inherit; }
  input:focus, select:focus, button:focus-visible { outline: 2px solid #D4A017; outline-offset: 1px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 8px 10px; font-size: 13.5px; border-bottom: 1px solid #EEE4D2; }
  th { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #7A6B58; font-weight: 600; }
  tfoot td { border-bottom: none; border-top: 2px solid #E8DFCB; }
  .nkc-topbar { display: none; }
  .nkc-hamburger { display: none; }

  @media (max-width: 760px) {
    .nkc-shell { flex-direction: column; }
    .nkc-topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; background: #fff; border-bottom: 1px solid #E8DFCB;
      position: sticky; top: 0; z-index: 30;
    }
    .nkc-hamburger {
      display: flex; align-items: center; justify-content: center;
      width: 38px; height: 38px; border-radius: 8px; border: 1px solid #E0D5BE;
      background: #FFFDF9; color: #4A3F32; cursor: pointer;
    }
    .nkc-sidebar {
      position: fixed; top: 61px; left: 0; right: 0; bottom: 0;
      width: 100% !important; border-right: none !important;
      z-index: 25; transform: translateY(-110%); transition: transform 0.18s ease-out;
      padding: 10px 14px 20px !important; overflow-y: auto;
      box-shadow: 0 8px 20px rgba(43,33,24,0.12);
    }
    .nkc-sidebar-open { transform: translateY(0); }
    .nkc-navbtn { font-size: 15px !important; padding: 12px 10px !important; }
    .nkc-saveindicator { display: none; }
    .nkc-main { padding: 16px 14px !important; max-width: 100% !important; }
  }

  @media print {
    .nkc-no-print, .nkc-topbar, .nkc-sidebar { display: none !important; }
  }
`;

const S = {
  appShell: { display: "flex", minHeight: "100vh", background: "#FBF6EC", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#2B2118" },
  sidebar: { width: 208, flexShrink: 0, background: "#FFFFFF", borderRight: "1px solid #E8DFCB", padding: "18px 12px", display: "flex", flexDirection: "column" },
  brand: { display: "flex", alignItems: "center", gap: 10, padding: "4px 6px" },
  brandMark: { width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#C0392B,#D4A017)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 13 },
  brandName: { fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 14.5, lineHeight: 1.15 },
  brandSub: { fontSize: 11, color: "#7A6B58" },
  navBtn: { display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", marginBottom: 2, border: "none", background: "transparent", borderRadius: 8, fontSize: 13.5, color: "#4A3F32", cursor: "pointer", textAlign: "left" },
  navBtnActive: { background: "#FBEFD9", color: "#8A5A2B", fontWeight: 600 },
  saveIndicator: { marginTop: "auto", fontSize: 11, color: "#7A6B58", display: "flex", alignItems: "center", gap: 5, padding: "6px 8px" },
  main: { flex: 1, padding: "26px 34px", maxWidth: 980 },
  h1: { fontFamily: "Georgia, serif", fontSize: 24, margin: 0, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#7A6B58", marginTop: 3 },
  statRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 },
  statCard: { background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 2px rgba(43,33,24,0.06)" },
  statValue: { fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif" },
  statLabel: { fontSize: 12, color: "#7A6B58", marginTop: 2 },
  card: { background: "#fff", borderRadius: 12, padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 2px rgba(43,33,24,0.06)", border: "1px solid #F0E8D6" },
  cardHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 5 },
  fieldLabel: { fontSize: 11.5, color: "#7A6B58", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" },
  input: { padding: "8px 10px", border: "1px solid #E0D5BE", borderRadius: 7, fontSize: 13.5, background: "#FFFDF9", color: "#2B2118" },
  primaryBtn: { display: "flex", alignItems: "center", gap: 6, justifyContent: "center", background: "#C0392B", color: "#fff", border: "none", borderRadius: 7, padding: "9px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", height: 36 },
  ghostBtn: { background: "transparent", border: "1px solid #E0D5BE", borderRadius: 7, padding: "9px 14px", fontSize: 13.5, cursor: "pointer", height: 36, color: "#4A3F32" },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#7A6B58", fontSize: 13, padding: "2px 6px" },
  table: { fontSize: 13.5 },
  stockRow: { display: "flex", flexDirection: "column", gap: 4 },
  stockRowLabel: { display: "flex", justifyContent: "space-between", fontSize: 13.5 },
  packetTrack: { height: 8, background: "#F0E8D6", borderRadius: 5, overflow: "hidden" },
  packetFill: { height: "100%", borderRadius: 5 },
  billCard: { border: "1px solid #F0E8D6", borderRadius: 8, padding: "9px 12px" },
  billCardHead: { display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 3 },
  empty: { padding: "20px 10px", textAlign: "center", color: "#9A8B76", fontSize: 13.5 },
  topbar: {},
  hamburgerBtn: {},
  toast: { position: "fixed", top: 16, right: 16, zIndex: 100, background: "#2B2118", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" },
  toastError: { background: "#C0392B" },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 20 },
  badgePaid: { background: "#E8F1E5", color: "#4C7A51" },
  badgePartial: { background: "#FBEFD9", color: "#8A5A2B" },
  badgeUnpaid: { background: "#F7E2DE", color: "#C0392B" },
  linkBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid #E0D5BE", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, cursor: "pointer", color: "#4A3F32" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(43,33,24,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 },
  modalCard: { background: "#fff", borderRadius: 14, padding: "22px 22px 18px", width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "0 14px 40px rgba(0,0,0,0.25)" },
  modalClose: { position: "absolute", top: 12, right: 12, background: "transparent", border: "none", cursor: "pointer", color: "#7A6B58", padding: 4 },
  invoiceSheet: { padding: "4px 2px" },
};
