import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { quotationsAPI, leadsAPI, masterlistAPI, projectsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Trash2, ChevronDown, Search } from 'lucide-react';

function ItemRow({ item, idx, roomIdx, onUpdate, onDelete, masterItems }) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const filtered = masterItems.filter(m =>
    !pickerSearch || m.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    m.category.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const pick = (mi) => {
    onUpdate(roomIdx, idx, { masterItemId: mi.id, description: mi.name, unit: mi.unit, unitRate: parseFloat(mi.baseRate) });
    setShowPicker(false);
    setPickerSearch('');
  };

  const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.unitRate) || 0);

  return (
    <tr className="border-t border-gray-100">
      <td className="px-2 py-1.5">
        <div className="flex gap-1 items-center">
          <input
            className="input text-xs flex-1"
            value={item.description}
            placeholder="Item description"
            onChange={e => onUpdate(roomIdx, idx, { description: e.target.value })}
          />
          <button type="button" onClick={() => setShowPicker(!showPicker)} title="Pick from master list" className="p-1 text-gray-400 hover:text-primary-600">
            <ChevronDown size={14} />
          </button>
          {showPicker && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto top-full">
              <div className="p-2 border-b">
                <input autoFocus className="input text-xs w-full" placeholder="Search items…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
              </div>
              {filtered.slice(0, 40).map(m => (
                <button key={m.id} type="button" onClick={() => pick(m)} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-gray-400 ml-2">{m.category} · {m.unit} · ₹{parseFloat(m.baseRate).toLocaleString('en-IN')}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No items found</p>}
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-1.5 w-20">
        <input className="input text-xs text-right" type="number" min="0" step="0.01" value={item.qty} onChange={e => onUpdate(roomIdx, idx, { qty: e.target.value })} />
      </td>
      <td className="px-2 py-1.5 w-24">
        <select className="input text-xs" value={item.unit} onChange={e => onUpdate(roomIdx, idx, { unit: e.target.value })}>
          {['SQFT','RFT','PER_UNIT','LOT','HOURS','SQMT','RUNNING_MT'].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td className="px-2 py-1.5 w-28">
        <input className="input text-xs text-right" type="number" min="0" step="0.01" value={item.unitRate} onChange={e => onUpdate(roomIdx, idx, { unitRate: e.target.value })} />
      </td>
      <td className="px-2 py-1.5 w-28 text-right text-sm font-medium text-gray-700">
        ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-2 py-1.5 w-8">
        <button type="button" onClick={() => onDelete(roomIdx, idx)} className="text-gray-300 hover:text-red-500">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

const emptyItem = () => ({ masterItemId: null, description: '', qty: '1', unit: 'SQFT', unitRate: '0', remarks: '' });
const emptyRoom = (name = '') => ({ name, items: [emptyItem()] });

const DEFAULT_MILESTONES = [
  { milestone: 'Booking Amount', percentage: '10' },
  { milestone: 'Raw Material', percentage: '40' },
  { milestone: 'Hardware / Fixtures', percentage: '30' },
  { milestone: 'Before Handover', percentage: '15' },
  { milestone: 'Handover', percentage: '5' },
];

export default function QuotationBuilder() {
  const navigate = useNavigate();
  const { id } = useParams(); // edit mode
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const projectId = searchParams.get('projectId');

  const [leads, setLeads] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [form, setForm] = useState({
    leadId: leadId || '',
    projectId: projectId || '',
    gstType: 'NONE',
    gstPercent: '18',
    discountAmount: '0',
    discountNote: '',
  });
  const [rooms, setRooms] = useState([emptyRoom('Living Room')]);
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES.map(m => ({ ...m, amount: '0' })));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    leadsAPI.getAll().then(r => setLeads(r.data)).catch(() => {});
    masterlistAPI.getAll({ active: 'true' }).then(r => setMasterItems(r.data)).catch(() => {});
    if (id) loadExisting();
  }, []);

  const loadExisting = async () => {
    try {
      const res = await quotationsAPI.get(id);
      const q = res.data;
      setForm({ leadId: q.leadId, projectId: q.projectId || '', gstType: q.gstType, gstPercent: q.gstPercent || '18', discountAmount: q.discountAmount || '0', discountNote: q.discountNote || '' });
      setRooms(q.rooms.map(r => ({ name: r.name, items: r.items.map(i => ({ masterItemId: i.masterItemId, description: i.description, qty: String(i.qty), unit: i.unit, unitRate: String(i.unitRate), remarks: i.remarks || '' })) })));
      setMilestones(q.paymentSchedule.map(m => ({ milestone: m.milestone, percentage: String(m.percentage), amount: String(m.amount) })));
    } catch { toast.error('Failed to load quotation'); }
    finally { setLoading(false); }
  };

  // Totals
  const subtotal = rooms.reduce((s, r) => s + r.items.reduce((ss, i) => ss + (parseFloat(i.qty) || 0) * (parseFloat(i.unitRate) || 0), 0), 0);
  const gstAmt = form.gstType === 'FULL' ? subtotal * (parseFloat(form.gstPercent) || 18) / 100
    : form.gstType === 'HALF' ? subtotal * (parseFloat(form.gstPercent) || 18) / 200 : 0;
  const discount = parseFloat(form.discountAmount) || 0;
  const total = subtotal + gstAmt - discount;

  // Auto-update milestone amounts when total changes
  useEffect(() => {
    setMilestones(ms => ms.map(m => ({
      ...m,
      amount: String(((parseFloat(m.percentage) || 0) / 100 * total).toFixed(2))
    })));
  }, [total]);

  const updateItem = useCallback((roomIdx, itemIdx, patch) => {
    setRooms(rs => rs.map((r, ri) => ri !== roomIdx ? r : {
      ...r,
      items: r.items.map((item, ii) => ii !== itemIdx ? item : { ...item, ...patch })
    }));
  }, []);

  const deleteItem = useCallback((roomIdx, itemIdx) => {
    setRooms(rs => rs.map((r, ri) => ri !== roomIdx ? r : {
      ...r, items: r.items.filter((_, ii) => ii !== itemIdx)
    }));
  }, []);

  const addItem = (roomIdx) => setRooms(rs => rs.map((r, ri) => ri !== roomIdx ? r : { ...r, items: [...r.items, emptyItem()] }));
  const addRoom = () => setRooms(rs => [...rs, emptyRoom('')]);
  const deleteRoom = (ri) => setRooms(rs => rs.filter((_, i) => i !== ri));

  const handleSubmit = async (action) => {
    if (!form.leadId) return toast.error('Please select a lead');
    setSaving(true);
    try {
      const payload = {
        ...form,
        rooms: rooms.map(r => ({ name: r.name, items: r.items.map(i => ({ ...i, qty: parseFloat(i.qty) || 0, unitRate: parseFloat(i.unitRate) || 0, amount: (parseFloat(i.qty) || 0) * (parseFloat(i.unitRate) || 0) })) })),
        paymentSchedule: milestones.map(m => ({ milestone: m.milestone, percentage: parseFloat(m.percentage) || 0, amount: parseFloat(m.amount) || 0 })),
      };
      let res;
      if (id) {
        res = await quotationsAPI.update(id, payload);
        if (action === 'submit') await quotationsAPI.submit(id);
      } else {
        res = await quotationsAPI.create(payload);
        if (action === 'submit') await quotationsAPI.submit(res.data.id);
      }
      toast.success(action === 'submit' ? 'Submitted for review!' : 'Saved as draft');
      navigate(`/quotations/${id || res.data.id}`);
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{id ? 'Edit Quotation' : 'New Quotation'}</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      {/* Lead / GST */}
      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Lead / Client *</label>
          <select className="input" required value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))} disabled={!!id}>
            <option value="">Select lead…</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}
          </select>
        </div>
        <div>
          <label className="label">GST</label>
          <div className="flex gap-2">
            <select className="input flex-1" value={form.gstType} onChange={e => setForm(f => ({ ...f, gstType: e.target.value }))}>
              <option value="NONE">No GST</option>
              <option value="HALF">Half GST (client pays 50%)</option>
              <option value="FULL">Full GST</option>
            </select>
            {form.gstType !== 'NONE' && (
              <input className="input w-20" type="number" value={form.gstPercent} onChange={e => setForm(f => ({ ...f, gstPercent: e.target.value }))} placeholder="18" />
            )}
          </div>
        </div>
      </div>

      {/* Rooms & Items */}
      <div className="space-y-4">
        {rooms.map((room, ri) => (
          <div key={ri} className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b">
              <span className="text-sm font-semibold text-gray-500 w-6">{String.fromCharCode(65 + ri)}.</span>
              <input
                className="input font-semibold text-sm flex-1"
                value={room.name}
                placeholder="Room / Section name"
                onChange={e => setRooms(rs => rs.map((r, i) => i === ri ? { ...r, name: e.target.value } : r))}
              />
              {rooms.length > 1 && (
                <button onClick={() => deleteRoom(ri)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400 bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Description</th>
                    <th className="px-2 py-1.5 text-right">Qty</th>
                    <th className="px-2 py-1.5 text-left">Unit</th>
                    <th className="px-2 py-1.5 text-right">Rate (₹)</th>
                    <th className="px-2 py-1.5 text-right">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {room.items.map((item, ii) => (
                    <tr key={ii} className="border-t border-gray-50 relative">
                      <ItemRow item={item} idx={ii} roomIdx={ri} onUpdate={updateItem} onDelete={deleteItem} masterItems={masterItems} />
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-100">
                    <td colSpan={4} className="px-2 py-1.5">
                      <button type="button" onClick={() => addItem(ri)} className="text-xs text-primary-600 hover:underline flex items-center gap-1"><Plus size={12} /> Add item</button>
                    </td>
                    <td className="px-2 py-1.5 text-right text-sm font-semibold">
                      ₹{room.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.unitRate) || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
        <button type="button" onClick={addRoom} className="btn btn-secondary text-sm flex items-center gap-1">
          <Plus size={15} /> Add Room / Section
        </button>
      </div>

      {/* Totals */}
      <div className="card p-5">
        <div className="flex justify-end">
          <div className="space-y-2 w-72 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            {form.gstType !== 'NONE' && <div className="flex justify-between text-gray-500"><span>GST ({form.gstType === 'HALF' ? '50% of ' : ''}{form.gstPercent}%)</span><span>₹{gstAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Discount</span>
              <input className="input w-32 text-right text-sm" type="number" min="0" step="100" value={form.discountAmount} onChange={e => setForm(f => ({ ...f, discountAmount: e.target.value }))} />
            </div>
            {discount > 0 && (
              <input className="input text-xs w-full" placeholder="Discount note (optional)" value={form.discountNote} onChange={e => setForm(f => ({ ...f, discountNote: e.target.value }))} />
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand Total</span><span>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
          </div>
        </div>
      </div>

      {/* Payment milestones */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Payment Schedule</h3>
        <div className="space-y-2">
          {milestones.map((m, mi) => (
            <div key={mi} className="flex gap-2 items-center">
              <input className="input flex-1 text-sm" value={m.milestone} onChange={e => setMilestones(ms => ms.map((x, i) => i === mi ? { ...x, milestone: e.target.value } : x))} />
              <input className="input w-20 text-right text-sm" type="number" min="0" max="100" step="5" value={m.percentage} onChange={e => setMilestones(ms => ms.map((x, i) => i === mi ? { ...x, percentage: e.target.value } : x))} placeholder="%" />
              <span className="text-xs text-gray-500 w-4">%</span>
              <span className="text-sm font-medium text-gray-700 w-32 text-right">₹{parseFloat(m.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              <button type="button" onClick={() => setMilestones(ms => ms.filter((_, i) => i !== mi))} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
          <button type="button" onClick={() => setMilestones(ms => [...ms, { milestone: '', percentage: '0', amount: '0' }])} className="text-xs text-primary-600 hover:underline flex items-center gap-1"><Plus size={12} /> Add milestone</button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => handleSubmit('draft')} disabled={saving} className="btn btn-secondary">{saving ? 'Saving…' : 'Save as Draft'}</button>
        <button onClick={() => handleSubmit('submit')} disabled={saving} className="btn btn-primary">{saving ? 'Submitting…' : 'Submit for Review'}</button>
      </div>
    </div>
  );
}
