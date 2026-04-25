import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { quotationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { formatDate } from '../utils/constants';
import { Printer, CheckCircle, XCircle, Send, Edit, Plus, Trash2 } from 'lucide-react';

const STATUS_BADGE = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED:  'bg-green-100 text-green-700',
  SENT:      'bg-purple-100 text-purple-700',
  REJECTED:  'bg-red-100 text-red-700',
};

function PrintableQuotation({ q, firmName, firmAddress, firmPhone, firmGST }) {
  const subtotal = q.rooms.reduce((s, r) => s + r.items.reduce((ss, i) => ss + parseFloat(i.amount), 0), 0);
  const gst = q.gstType === 'FULL' ? subtotal * parseFloat(q.gstPercent || 18) / 100
    : q.gstType === 'HALF' ? subtotal * parseFloat(q.gstPercent || 18) / 200 : 0;
  const discount = parseFloat(q.discountAmount || 0);
  const total = subtotal + gst - discount;

  return (
    <div id="printable-quotation" className="hidden print:block p-8 text-sm font-sans text-gray-900">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{firmName || 'Your Firm Name'}</h1>
          <p className="text-gray-500">{firmAddress}</p>
          <p className="text-gray-500">{firmPhone}</p>
          {firmGST && <p className="text-gray-500">GST: {firmGST}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">QUOTATION</h2>
          <p><span className="text-gray-500">Ref: </span>{q.refNo}</p>
          <p><span className="text-gray-500">Version: </span>v{q.version}</p>
          <p><span className="text-gray-500">Date: </span>{formatDate(q.createdAt)}</p>
        </div>
      </div>
      <div className="mb-6 p-3 border rounded">
        <p><strong>Client:</strong> {q.lead?.name}</p>
        <p><strong>Phone:</strong> {q.lead?.phone}</p>
        {q.lead?.email && <p><strong>Email:</strong> {q.lead.email}</p>}
        {q.lead?.city && <p><strong>City:</strong> {q.lead.city}</p>}
      </div>
      {q.rooms.map((room, ri) => (
        <div key={ri} className="mb-6">
          <h3 className="font-bold bg-gray-100 px-3 py-1 rounded mb-2">
            {String.fromCharCode(65 + ri)}. {room.name}
          </h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1 px-2">#</th>
                <th className="text-left py-1 px-2">Description</th>
                <th className="text-right py-1 px-2">Qty</th>
                <th className="text-left py-1 px-2">Unit</th>
                <th className="text-right py-1 px-2">Rate</th>
                <th className="text-right py-1 px-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {room.items.map((item, ii) => (
                <tr key={ii} className="border-b border-gray-100">
                  <td className="py-1 px-2">{ii + 1}</td>
                  <td className="py-1 px-2">{item.description}</td>
                  <td className="py-1 px-2 text-right">{parseFloat(item.qty)}</td>
                  <td className="py-1 px-2">{item.unit}</td>
                  <td className="py-1 px-2 text-right">₹{parseFloat(item.unitRate).toLocaleString('en-IN')}</td>
                  <td className="py-1 px-2 text-right">₹{parseFloat(item.amount).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              <tr className="font-semibold border-t">
                <td colSpan={5} className="py-1 px-2 text-right">Room Subtotal</td>
                <td className="py-1 px-2 text-right">₹{room.items.reduce((s, i) => s + parseFloat(i.amount), 0).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
      <div className="flex justify-end mb-6">
        <table className="text-sm w-64">
          <tbody>
            <tr><td className="py-0.5 text-gray-500">Subtotal</td><td className="text-right">₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
            {gst > 0 && <tr><td className="py-0.5 text-gray-500">GST</td><td className="text-right">₹{gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>}
            {discount > 0 && <tr><td className="py-0.5 text-gray-500">Discount {q.discountNote ? `(${q.discountNote})` : ''}</td><td className="text-right">-₹{discount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>}
            <tr className="font-bold text-base border-t"><td className="pt-1">Grand Total</td><td className="text-right pt-1">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
          </tbody>
        </table>
      </div>
      {q.paymentSchedule?.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold mb-2">Payment Schedule</h3>
          <table className="w-full border-collapse text-xs">
            <thead><tr className="border-b"><th className="text-left py-1 px-2">Milestone</th><th className="text-right py-1 px-2">%</th><th className="text-right py-1 px-2">Amount</th></tr></thead>
            <tbody>
              {q.paymentSchedule.map((m, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 px-2">{m.milestone}</td>
                  <td className="py-1 px-2 text-right">{m.percentage}%</td>
                  <td className="py-1 px-2 text-right">₹{parseFloat(m.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-16 flex justify-between">
        <div><div className="border-b border-gray-400 w-48 mb-1" /><p className="text-xs">Client Signature & Date</p></div>
        <div><div className="border-b border-gray-400 w-48 mb-1" /><p className="text-xs">Authorized Signatory & Stamp</p></div>
      </div>
    </div>
  );
}

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [itemRevisions, setItemRevisions] = useState([]);
  const [showSignoffForm, setShowSignoffForm] = useState(false);
  const [scopeIncludes, setScopeIncludes] = useState([]);
  const [scopeExcludes, setScopeExcludes] = useState([]);
  const [materialNotes, setMaterialNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const isOwner = ['ADMIN', 'CO_ADMIN'].includes(user?.role);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const res = await quotationsAPI.get(id);
      const q = res.data;
      setQ(q);
      if (q.signoffDoc) {
        setScopeIncludes(JSON.parse(q.signoffDoc.scopeIncludes || '[]'));
        setScopeExcludes(JSON.parse(q.signoffDoc.scopeExcludes || '[]'));
        setMaterialNotes(q.signoffDoc.materialNotes || '');
      }
    } catch { toast.error('Failed to load'); navigate('/quotations'); }
    finally { setLoading(false); }
  };

  const approve = async () => {
    setSaving(true);
    try {
      const res = await quotationsAPI.approve(id, {});
      setQ(r => ({ ...r, ...res.data }));
      toast.success('Quotation approved!');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const reject = async () => {
    setSaving(true);
    try {
      const res = await quotationsAPI.reject(id, { reviewNote: rejectNote, itemRevisions });
      setQ(r => ({ ...r, ...res.data }));
      setShowRejectForm(false);
      toast.success('Sent back to employee');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const markSent = async () => {
    setSaving(true);
    try {
      const res = await quotationsAPI.markSent(id);
      setQ(r => ({ ...r, ...res.data }));
      toast.success('Marked as sent to client');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const markSigned = async () => {
    setSaving(true);
    try {
      const res = await quotationsAPI.markSigned(id);
      setQ(r => ({ ...r, ...res.data }));
      toast.success('Marked as signed');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const newVersion = async () => {
    setSaving(true);
    try {
      const res = await quotationsAPI.newVersion(id);
      toast.success('New version created');
      navigate(`/quotations/${res.data.id}/edit`);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveSignoff = async () => {
    setSaving(true);
    try {
      await quotationsAPI.saveSignoff(id, { scopeIncludes, scopeExcludes, materialNotes });
      toast.success('Signoff document saved');
      setShowSignoffForm(false);
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!q) return null;

  const subtotal = q.rooms.reduce((s, r) => s + r.items.reduce((ss, i) => ss + parseFloat(i.amount), 0), 0);
  const gst = q.gstType === 'FULL' ? subtotal * parseFloat(q.gstPercent || 18) / 100
    : q.gstType === 'HALF' ? subtotal * parseFloat(q.gstPercent || 18) / 200 : 0;
  const discount = parseFloat(q.discountAmount || 0);
  const total = subtotal + gst - discount;

  return (
    <div className="space-y-5 max-w-4xl">
      <PrintableQuotation q={q} firmName={process.env.REACT_APP_FIRM_NAME} firmAddress={process.env.REACT_APP_FIRM_ADDRESS} firmPhone={process.env.REACT_APP_FIRM_PHONE} firmGST={process.env.REACT_APP_FIRM_GST} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/quotations" className="text-xs text-gray-400 hover:text-primary-600 block mb-1">← Quotations</Link>
          <h1 className="text-xl font-bold text-gray-900">{q.refNo}</h1>
          <p className="text-sm text-gray-500">{q.lead?.name} · v{q.version}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[q.status]}`}>{q.status}</span>
          <button onClick={() => window.print()} className="btn btn-secondary text-sm flex items-center gap-1"><Printer size={14} /> Print</button>
          {(q.status === 'DRAFT' || q.status === 'REJECTED') && (
            <Link to={`/quotations/${id}/edit`} className="btn btn-secondary text-sm flex items-center gap-1"><Edit size={14} /> Edit</Link>
          )}
        </div>
      </div>

      {/* Review note */}
      {q.reviewNote && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Review Notes from Owner:</p>
          <p className="text-sm text-red-600">{q.reviewNote}</p>
        </div>
      )}

      {/* Owner actions */}
      {isOwner && q.status === 'SUBMITTED' && (
        <div className="card p-4 bg-blue-50 border-blue-200 space-y-3">
          <p className="text-sm font-semibold text-blue-800">This quotation needs your review</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={approve} disabled={saving} className="btn btn-primary text-sm flex items-center gap-1"><CheckCircle size={14} /> Approve</button>
            <button onClick={() => setShowRejectForm(true)} className="btn bg-red-500 text-white hover:bg-red-600 text-sm flex items-center gap-1"><XCircle size={14} /> Send Back</button>
          </div>
          {showRejectForm && (
            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-medium text-gray-600">General note to employee</label>
              <textarea className="input text-sm" rows={3} value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="What needs to be changed?" />
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Mark specific items for revision (optional)</label>
                {q.rooms.flatMap(r => r.items).map(item => (
                  <label key={item.id} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" onChange={e => {
                      if (e.target.checked) setItemRevisions(prev => [...prev, { itemId: item.id, note: '' }]);
                      else setItemRevisions(prev => prev.filter(x => x.itemId !== item.id));
                    }} />
                    {item.description}
                    {itemRevisions.find(x => x.itemId === item.id) && (
                      <input className="input text-xs flex-1" placeholder="Note for this item" onChange={e => setItemRevisions(prev => prev.map(x => x.itemId === item.id ? { ...x, note: e.target.value } : x))} />
                    )}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={reject} disabled={saving} className="btn btn-primary text-sm">Send Back</button>
                <button onClick={() => setShowRejectForm(false)} className="btn btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Owner: approved → can mark sent, mark signed, generate signoff */}
      {isOwner && q.status === 'APPROVED' && (
        <div className="card p-4 bg-green-50 border-green-200 flex gap-2 flex-wrap items-center">
          <span className="text-sm text-green-700 font-medium">Ready to send to client</span>
          <button onClick={markSent} disabled={saving} className="btn btn-primary text-sm flex items-center gap-1"><Send size={14} /> Mark as Sent</button>
          <button onClick={() => setShowSignoffForm(true)} className="btn btn-secondary text-sm">Generate Signoff Doc</button>
        </div>
      )}
      {isOwner && q.status === 'SENT' && !q.signedAt && (
        <div className="card p-4 bg-purple-50 border-purple-200 flex gap-2 flex-wrap items-center">
          <span className="text-sm text-purple-700">Client has received. Once physically signed:</span>
          <button onClick={markSigned} disabled={saving} className="btn btn-primary text-sm"><CheckCircle size={14} className="inline mr-1" />Mark as Signed</button>
        </div>
      )}
      {q.signedAt && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 font-medium">✓ Signed on {formatDate(q.signedAt)}</div>}

      {/* New version (for REJECTED quotations) */}
      {(q.status === 'REJECTED') && (
        <button onClick={newVersion} disabled={saving} className="btn btn-secondary text-sm">Create New Version from This</button>
      )}

      {/* Signoff form */}
      {showSignoffForm && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">Signoff Document Details</h3>
          <div>
            <label className="label">Scope Includes (one per line)</label>
            <textarea className="input" rows={4} value={scopeIncludes.join('\n')} onChange={e => setScopeIncludes(e.target.value.split('\n'))} placeholder="All furniture as per quotation&#10;False ceiling work&#10;Electrical points" />
          </div>
          <div>
            <label className="label">Scope Excludes (one per line)</label>
            <textarea className="input" rows={4} value={scopeExcludes.join('\n')} onChange={e => setScopeExcludes(e.target.value.split('\n'))} placeholder="Appliances&#10;Civil/structural work&#10;ACs and electrical fittings" />
          </div>
          <div>
            <label className="label">Material & Finish Notes</label>
            <textarea className="input" rows={3} value={materialNotes} onChange={e => setMaterialNotes(e.target.value)} placeholder="Laminate: Century brand, shade as per sample board approved on…" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveSignoff} disabled={saving} className="btn btn-primary text-sm">{saving ? 'Saving…' : 'Save & Print Signoff'}</button>
            <button onClick={() => setShowSignoffForm(false)} className="btn btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Quotation table */}
      <div className="space-y-4">
        {q.rooms.map((room, ri) => (
          <div key={ri} className="card overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b font-semibold text-sm text-gray-700">
              {String.fromCharCode(65 + ri)}. {room.name}
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {room.items.map((item, ii) => (
                  <tr key={ii} className={`border-t border-gray-50 ${item.hasRevision ? 'bg-yellow-50' : ''}`}>
                    <td className="px-3 py-2 text-gray-400">{ii + 1}</td>
                    <td className="px-3 py-2">
                      {item.description}
                      {item.hasRevision && <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">Revision: {item.revisionNote}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{parseFloat(item.qty)}</td>
                    <td className="px-3 py-2">{item.unit}</td>
                    <td className="px-3 py-2 text-right">₹{parseFloat(item.unitRate).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right font-medium">₹{parseFloat(item.amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                <tr className="border-t font-semibold bg-gray-50">
                  <td colSpan={5} className="px-3 py-2 text-right text-gray-500">Room Subtotal</td>
                  <td className="px-3 py-2 text-right">₹{room.items.reduce((s, i) => s + parseFloat(i.amount), 0).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="card p-5 flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
          {gst > 0 && <div className="flex justify-between text-gray-500"><span>GST ({q.gstType === 'HALF' ? '50% of ' : ''}{q.gstPercent}%)</span><span>₹{gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>}
          {discount > 0 && <div className="flex justify-between text-gray-500"><span>Discount {q.discountNote ? `(${q.discountNote})` : ''}</span><span className="text-red-600">-₹{discount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>}
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand Total</span><span>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      {/* Payment schedule */}
      {q.paymentSchedule?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Payment Schedule</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400"><tr><th className="text-left pb-2">Milestone</th><th className="text-right pb-2">%</th><th className="text-right pb-2">Amount</th></tr></thead>
            <tbody>
              {q.paymentSchedule.map((m, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-2">{m.milestone}</td>
                  <td className="py-2 text-right text-gray-500">{m.percentage}%</td>
                  <td className="py-2 text-right font-medium">₹{parseFloat(m.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
