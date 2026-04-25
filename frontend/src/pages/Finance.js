import React, { useEffect, useState } from 'react';
import { financeAPI, projectsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Wallet, TrendingUp, TrendingDown, IndianRupee, Search, Edit2, XCircle } from 'lucide-react';
import { formatDate } from '../utils/constants';

const TABS = ['Entries', 'Ledger', 'Fixed Costs', 'Monthly P&L'];
const PARTY_TYPES = ['CLIENT', 'VENDOR', 'CONTRACTOR', 'EMPLOYEE', 'SHOP', 'OTHER'];
const FIXED_CATS = ['RENT', 'SALARY', 'MAINTENANCE', 'UTILITY', 'OTHER'];

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900">₹{parseFloat(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
      </div>
    </div>
  );
}

const NOW = new Date();

export default function Finance() {
  const [tab, setTab] = useState('Entries');
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ payIn: 0, payOut: 0, balance: 0 });
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [year, setYear] = useState(NOW.getFullYear());
  const [filterType, setFilterType] = useState('');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState({ type: 'PAY_IN', partyType: 'CLIENT', partyName: '', amount: '', paymentMode: 'CASH', description: '', entryDate: new Date().toISOString().slice(0, 10) });
  const [entryReceipt, setEntryReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ledgerParty, setLedgerParty] = useState('');
  const [ledgerData, setLedgerData] = useState(null);
  const [parties, setParties] = useState([]);
  const [fixedCosts, setFixedCosts] = useState([]);
  const [monthlyPL, setMonthlyPL] = useState(null);
  const [showFixedForm, setShowFixedForm] = useState(false);
  const [fixedForm, setFixedForm] = useState({ month: NOW.getMonth() + 1, year: NOW.getFullYear(), category: 'RENT', description: '', amount: '', paidDate: '', notes: '' });
  const [editEntry, setEditEntry] = useState(null);

  useEffect(() => { loadEntries(); }, [month, year, filterType, tab]);
  useEffect(() => { if (tab === 'Ledger') financeAPI.getParties().then(r => setParties(r.data)).catch(() => {}); }, [tab]);
  useEffect(() => { if (tab === 'Fixed Costs') loadFixedCosts(); }, [tab, month, year]);
  useEffect(() => { if (tab === 'Monthly P&L') loadMonthly(); }, [tab, month, year]);

  const loadEntries = async () => {
    if (tab !== 'Entries') return;
    setLoading(true);
    try {
      const res = await financeAPI.getEntries({ month, year, type: filterType || undefined });
      setEntries(res.data.entries);
      setSummary(res.data.summary);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const loadFixedCosts = async () => {
    setLoading(true);
    try {
      const res = await financeAPI.getFixedCosts({ month, year });
      setFixedCosts(res.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const loadMonthly = async () => {
    setLoading(true);
    try {
      const res = await financeAPI.getMonthly({ month, year });
      setMonthlyPL(res.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const fetchLedger = async () => {
    if (!ledgerParty.trim()) return;
    setLoading(true);
    try {
      const res = await financeAPI.getLedger({ partyName: ledgerParty });
      setLedgerData(res.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const saveEntry = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(entryForm).forEach(([k, v]) => fd.append(k, v));
      if (entryReceipt) fd.append('receipt', entryReceipt);
      if (editEntry) {
        const res = await financeAPI.updateEntry(editEntry.id, entryForm);
        setEntries(entries.map(en => en.id === editEntry.id ? res.data : en));
        toast.success('Updated');
      } else {
        const res = await financeAPI.createEntry(fd);
        setEntries(prev => [res.data, ...prev]);
        // refresh summary
        const sumRes = await financeAPI.getEntries({ month, year, type: filterType || undefined });
        setSummary(sumRes.data.summary);
        toast.success('Entry added');
      }
      setShowEntryForm(false);
      setEditEntry(null);
      setEntryForm({ type: 'PAY_IN', partyType: 'CLIENT', partyName: '', amount: '', paymentMode: 'CASH', description: '', entryDate: new Date().toISOString().slice(0, 10) });
      setEntryReceipt(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const voidEntry = async (id) => {
    const reason = window.prompt('Reason for voiding this entry?');
    if (reason === null) return;
    try {
      await financeAPI.voidEntry(id, { reason });
      setEntries(entries.map(e => e.id === id ? { ...e, isVoid: true } : e));
      toast.success('Entry voided');
    } catch { toast.error('Failed'); }
  };

  const saveFixedCost = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await financeAPI.createFixedCost(fixedForm);
      setFixedCosts(prev => [...prev, res.data]);
      setShowFixedForm(false);
      setFixedForm({ month: NOW.getMonth() + 1, year: NOW.getFullYear(), category: 'RENT', description: '', amount: '', paidDate: '', notes: '' });
      toast.success('Added');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const deleteFixedCost = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await financeAPI.deleteFixedCost(id);
      setFixedCosts(fixedCosts.filter(c => c.id !== id));
    } catch { toast.error('Failed'); }
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const MonthYearPicker = () => (
    <div className="flex gap-2 items-center">
      <select className="input w-auto text-sm" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
        {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
      </select>
      <select className="input w-auto text-sm" value={year} onChange={e => setYear(parseInt(e.target.value))}>
        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Finance</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {/* ── ENTRIES ── */}
      {tab === 'Entries' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <MonthYearPicker />
            <button onClick={() => { setShowEntryForm(true); setEditEntry(null); }} className="btn btn-primary text-sm flex items-center gap-1"><Plus size={15} /> Add Entry</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Money In" value={summary.payIn} icon={TrendingUp} color="bg-green-500" />
            <StatCard label="Money Out" value={summary.payOut} icon={TrendingDown} color="bg-red-500" />
            <StatCard label="Net Balance" value={summary.balance} icon={Wallet} color={summary.balance >= 0 ? 'bg-primary-600' : 'bg-orange-500'} />
          </div>

          {showEntryForm && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">{editEntry ? 'Edit Entry' : 'Add Payment Entry'}</h3>
              <form onSubmit={saveEntry} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Type *</label>
                  <select className="input" value={entryForm.type} onChange={e => setEntryForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="PAY_IN">Pay In (Money received)</option>
                    <option value="PAY_OUT">Pay Out (Money sent)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Party Type *</label>
                  <select className="input" value={entryForm.partyType} onChange={e => setEntryForm(f => ({ ...f, partyType: e.target.value }))}>
                    {PARTY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Party Name *</label>
                  <input className="input" required value={entryForm.partyName} onChange={e => setEntryForm(f => ({ ...f, partyName: e.target.value }))} placeholder="Name of client / vendor / contractor…" />
                </div>
                <div>
                  <label className="label">Amount (₹) *</label>
                  <input className="input" required type="number" min="0" step="0.01" value={entryForm.amount} onChange={e => setEntryForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Payment Mode</label>
                  <select className="input" value={entryForm.paymentMode} onChange={e => setEntryForm(f => ({ ...f, paymentMode: e.target.value }))}>
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online / Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input className="input" type="date" required value={entryForm.entryDate} onChange={e => setEntryForm(f => ({ ...f, entryDate: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Description</label>
                  <input className="input" value={entryForm.description} onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))} placeholder="Purpose / reference" />
                </div>
                {entryForm.paymentMode === 'ONLINE' && !editEntry && (
                  <div className="md:col-span-2">
                    <label className="label">Screenshot / Receipt (optional)</label>
                    <input type="file" accept="image/*,application/pdf" className="input" onChange={e => setEntryReceipt(e.target.files[0])} />
                  </div>
                )}
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : editEntry ? 'Update' : 'Add Entry'}</button>
                  <button type="button" onClick={() => { setShowEntryForm(false); setEditEntry(null); }} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="flex gap-2">
            {['', 'PAY_IN', 'PAY_OUT'].map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 text-xs rounded-full font-medium ${filterType === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t || 'All'}
              </button>
            ))}
          </div>

          {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Party</th>
                    <th className="px-3 py-2 text-left hidden md:table-cell">Description</th>
                    <th className="px-3 py-2 text-center">Mode</th>
                    <th className="px-3 py-2 text-right text-green-600">Pay In</th>
                    <th className="px-3 py-2 text-right text-red-600">Pay Out</th>
                    <th className="px-3 py-2 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className={`border-t border-gray-100 ${e.isVoid ? 'opacity-40 line-through' : ''}`}>
                      <td className="px-3 py-2 text-gray-500">{formatDate(e.entryDate)}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{e.partyName}</p>
                        <p className="text-xs text-gray-400">{e.partyType}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-400 hidden md:table-cell">{e.description || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${e.paymentMode === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{e.paymentMode}</span>
                        {e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="ml-1 text-xs text-primary-600 underline">rcpt</a>}
                      </td>
                      <td className="px-3 py-2 text-right text-green-700 font-medium">{e.type === 'PAY_IN' ? `₹${parseFloat(e.amount).toLocaleString('en-IN')}` : ''}</td>
                      <td className="px-3 py-2 text-right text-red-600 font-medium">{e.type === 'PAY_OUT' ? `₹${parseFloat(e.amount).toLocaleString('en-IN')}` : ''}</td>
                      <td className="px-3 py-2">
                        {!e.isVoid && (
                          <div className="flex gap-1">
                            <button onClick={() => { setEditEntry(e); setEntryForm({ type: e.type, partyType: e.partyType, partyName: e.partyName, amount: String(e.amount), paymentMode: e.paymentMode, description: e.description || '', entryDate: new Date(e.entryDate).toISOString().slice(0,10) }); setShowEntryForm(true); }} className="p-1 text-gray-300 hover:text-primary-600"><Edit2 size={13} /></button>
                            <button onClick={() => voidEntry(e.id)} className="p-1 text-gray-300 hover:text-red-500"><XCircle size={13} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No entries for this period</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── LEDGER ── */}
      {tab === 'Ledger' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input className="input pr-24" value={ledgerParty} onChange={e => setLedgerParty(e.target.value)} placeholder="Enter party name to view ledger…" onKeyDown={e => e.key === 'Enter' && fetchLedger()} list="parties-list" />
              <datalist id="parties-list">
                {parties.map((p, i) => <option key={i} value={p.partyName} />)}
              </datalist>
            </div>
            <button onClick={fetchLedger} className="btn btn-primary text-sm">View Ledger</button>
          </div>
          {loading && <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>}
          {ledgerData && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Ledger: {ledgerData.partyName}</h3>
                <div className="text-sm space-x-4">
                  <span className="text-green-600">Credit: ₹{ledgerData.totals.totalCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  <span className="text-red-600">Debit: ₹{ledgerData.totals.totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  <span className={`font-bold ${ledgerData.totals.closingBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>Balance: ₹{ledgerData.totals.closingBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Debit (Out)</th>
                      <th className="px-3 py-2 text-right">Credit (In)</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.ledger.map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-500">{formatDate(row.date)}</td>
                        <td className="px-3 py-2">{row.description}</td>
                        <td className="px-3 py-2 text-right text-red-600">{row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : ''}</td>
                        <td className="px-3 py-2 text-right text-green-600">{row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : ''}</td>
                        <td className={`px-3 py-2 text-right font-medium ${row.balance < 0 ? 'text-red-600' : 'text-gray-800'}`}>₹{row.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FIXED COSTS ── */}
      {tab === 'Fixed Costs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <MonthYearPicker />
            <button onClick={() => setShowFixedForm(true)} className="btn btn-primary text-sm flex items-center gap-1"><Plus size={15} /> Add Cost</button>
          </div>
          {showFixedForm && (
            <div className="card p-5">
              <form onSubmit={saveFixedCost} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Month & Year</label>
                  <div className="flex gap-2">
                    <select className="input" value={fixedForm.month} onChange={e => setFixedForm(f => ({ ...f, month: parseInt(e.target.value) }))}>
                      {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <select className="input w-24" value={fixedForm.year} onChange={e => setFixedForm(f => ({ ...f, year: parseInt(e.target.value) }))}>
                      {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={fixedForm.category} onChange={e => setFixedForm(f => ({ ...f, category: e.target.value }))}>
                    {FIXED_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Description *</label>
                  <input className="input" required value={fixedForm.description} onChange={e => setFixedForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Office Rent April 2025" />
                </div>
                <div>
                  <label className="label">Amount (₹) *</label>
                  <input className="input" required type="number" min="0" step="0.01" value={fixedForm.amount} onChange={e => setFixedForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Paid Date</label>
                  <input className="input" type="date" value={fixedForm.paidDate} onChange={e => setFixedForm(f => ({ ...f, paidDate: e.target.value }))} />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={saving} className="btn btn-primary text-sm">{saving ? 'Saving…' : 'Add'}</button>
                  <button type="button" onClick={() => setShowFixedForm(false)} className="btn btn-secondary text-sm">Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Paid</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {fixedCosts.map(c => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-3 py-2"><span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.category}</span></td>
                    <td className="px-3 py-2">{c.description}</td>
                    <td className="px-3 py-2 text-right font-medium">₹{parseFloat(c.amount).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-gray-400">{c.paidDate ? formatDate(c.paidDate) : '—'}</td>
                    <td className="px-3 py-2"><button onClick={() => deleteFixedCost(c.id)} className="text-gray-300 hover:text-red-500"><XCircle size={14} /></button></td>
                  </tr>
                ))}
                {fixedCosts.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No fixed costs for this month</td></tr>}
              </tbody>
              {fixedCosts.length > 0 && (
                <tfoot className="border-t">
                  <tr className="font-bold">
                    <td colSpan={2} className="px-3 py-2 text-right">Total</td>
                    <td className="px-3 py-2 text-right">₹{fixedCosts.reduce((s, c) => s + parseFloat(c.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── MONTHLY P&L ── */}
      {tab === 'Monthly P&L' && (
        <div className="space-y-4">
          <MonthYearPicker />
          {loading && <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>}
          {monthlyPL && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Total Money In" value={monthlyPL.totalPayIn} icon={TrendingUp} color="bg-green-500" />
                <StatCard label="Variable Costs (Out)" value={monthlyPL.totalPayOut} icon={TrendingDown} color="bg-orange-500" />
                <StatCard label="Fixed Overhead" value={monthlyPL.totalFixedCost} icon={Wallet} color="bg-gray-500" />
                <div className={`card p-4 flex items-center gap-3 ${monthlyPL.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`p-2 rounded-lg ${monthlyPL.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    <IndianRupee size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Net Profit</p>
                    <p className={`text-lg font-bold ${monthlyPL.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{monthlyPL.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-4">
                  <h3 className="font-semibold text-sm mb-3">Pay Out by Party Type</h3>
                  {Object.entries(monthlyPL.payOutBreakdown || {}).map(([type, amt]) => (
                    <div key={type} className="flex justify-between py-1 border-b border-gray-50 text-sm">
                      <span className="text-gray-500">{type}</span>
                      <span className="font-medium text-red-600">₹{parseFloat(amt).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                  {Object.keys(monthlyPL.payOutBreakdown || {}).length === 0 && <p className="text-xs text-gray-400">No outgoing payments</p>}
                </div>
                <div className="card p-4">
                  <h3 className="font-semibold text-sm mb-3">Fixed Costs by Category</h3>
                  {Object.entries(monthlyPL.fixedCostBreakdown || {}).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between py-1 border-b border-gray-50 text-sm">
                      <span className="text-gray-500">{cat}</span>
                      <span className="font-medium">₹{parseFloat(amt).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                  {Object.keys(monthlyPL.fixedCostBreakdown || {}).length === 0 && <p className="text-xs text-gray-400">No fixed costs logged</p>}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
