import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { leadsAPI, interactionsAPI, remindersAPI, attachmentsAPI, usersAPI } from '../services/api';
import { LEAD_STATUSES, LEAD_SOURCES, PROJECT_TYPES, BUDGET_RANGES,
  INTERACTION_TYPES, OUTCOMES, STATUS_PIPELINE, formatDate, formatDateTime,
  getInitials, isOverdue } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Camera, Trash2, Plus, Image, ExternalLink, CheckCircle, Clock } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value || '—'}</p>
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showInteraction, setShowInteraction] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [intForm, setIntForm] = useState({ type: 'PHONE_CALL', summary: '', outcome: 'NEUTRAL', followUpDate: '' });
  const [remForm, setRemForm] = useState({ dueDate: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingInteractionId, setUploadingInteractionId] = useState(null);
  const imgInputRef = useRef(null);
  const isOwner = ['ADMIN', 'CO_ADMIN'].includes(user?.role);

  const load = async () => {
    try {
      const res = await leadsAPI.get(id);
      setLead(res.data);
      setEditForm(res.data);
    } catch { navigate('/leads'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (isOwner) usersAPI.getAll().then(r => setUsers(r.data)).catch(() => {});
  }, [isOwner]);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await leadsAPI.update(id, editForm);
      setLead(res.data);
      setEditing(false);
      toast.success('Lead updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (status) => {
    try {
      await leadsAPI.update(id, { status });
      setLead(l => ({ ...l, status }));
      toast.success(`Status updated to ${LEAD_STATUSES[status]?.label}`);
    } catch { toast.error('Failed'); }
  };

  const logInteraction = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await interactionsAPI.create(id, intForm);
      setLead(l => ({ ...l, interactions: [res.data, ...l.interactions] }));
      setShowInteraction(false);
      setIntForm({ type: 'PHONE_CALL', summary: '', outcome: 'NEUTRAL', followUpDate: '' });
      toast.success('Interaction logged');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const deleteInteraction = async (intId) => {
    if (!window.confirm('Delete this interaction?')) return;
    try {
      await interactionsAPI.delete(intId);
      setLead(l => ({ ...l, interactions: l.interactions.filter(i => i.id !== intId) }));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  // Upload images to an existing interaction
  const handleImageUpload = async (interactionId, files) => {
    if (!files.length) return;
    setUploadingInteractionId(interactionId);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const res = await interactionsAPI.uploadImages(interactionId, fd);
      setLead(l => ({
        ...l,
        interactions: l.interactions.map(i =>
          i.id === interactionId
            ? { ...i, images: [...(i.images || []), ...res.data] }
            : i
        )
      }));
      toast.success(`${res.data.length} image(s) uploaded`);
    } catch { toast.error('Image upload failed'); }
    finally { setUploadingInteractionId(null); }
  };

  const deleteInteractionImage = async (interactionId, imageId) => {
    try {
      await interactionsAPI.deleteImage(interactionId, imageId);
      setLead(l => ({
        ...l,
        interactions: l.interactions.map(i =>
          i.id === interactionId
            ? { ...i, images: i.images.filter(img => img.id !== imageId) }
            : i
        )
      }));
    } catch { toast.error('Failed'); }
  };

  const addReminder = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await remindersAPI.create(id, remForm);
      setLead(l => ({ ...l, reminders: [...l.reminders, res.data] }));
      setShowReminder(false);
      setRemForm({ dueDate: '', note: '' });
      toast.success('Reminder set');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const completeReminder = async (remId) => {
    try {
      await remindersAPI.complete(remId);
      setLead(l => ({
        ...l,
        reminders: l.reminders.map(r => r.id === remId ? { ...r, isDone: true } : r)
      }));
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!lead) return null;

  const st = LEAD_STATUSES[lead.status] || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/leads" className="text-xs text-gray-400 hover:text-primary-600 mb-1 block">← Back to Leads</Link>
          <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
          <p className="text-sm text-gray-500">{lead.phone}{lead.phone2 ? ` · ${lead.phone2}` : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {lead.status === 'WON' && isOwner && (
            <Link to={`/projects?createFor=${id}`} className="btn btn-primary text-sm">
              + Create Project
            </Link>
          )}
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn btn-secondary text-sm">Edit</button>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="btn btn-secondary text-sm">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="btn btn-primary text-sm">{saving ? 'Saving…' : 'Save'}</button>
            </>
          )}
        </div>
      </div>

      {/* Status pipeline */}
      <div className="card p-3 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {STATUS_PIPELINE.map(s => {
            const info = LEAD_STATUSES[s] || {};
            const active = lead.status === s;
            return (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active ? `bg-${info.color}-100 text-${info.color}-700 ring-2 ring-${info.color}-400`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lead info */}
        <div className="md:col-span-2 space-y-4">
          <Section title="Lead Information">
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                {[['name','Name'],['phone','Phone'],['phone2','Phone 2'],['email','Email'],['city','City']].map(([k,l]) => (
                  <div key={k}>
                    <label className="text-xs text-gray-500">{l}</label>
                    <input className="input mt-0.5" value={editForm[k] || ''} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500">Source</label>
                  <select className="input mt-0.5" value={editForm.source || ''} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}>
                    {Object.entries(LEAD_SOURCES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Budget</label>
                  <select className="input mt-0.5" value={editForm.budget || ''} onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))}>
                    {Object.entries(BUDGET_RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                {isOwner && (
                  <div>
                    <label className="text-xs text-gray-500">Assigned To</label>
                    <select className="input mt-0.5" value={editForm.assignedToId || ''} onChange={e => setEditForm(f => ({ ...f, assignedToId: e.target.value }))}>
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Notes</label>
                  <textarea className="input mt-0.5" rows={3} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" value={lead.phone} />
                <Field label="Phone 2" value={lead.phone2} />
                <Field label="Email" value={lead.email} />
                <Field label="City" value={lead.city} />
                <Field label="Source" value={LEAD_SOURCES[lead.source]?.label} />
                <Field label="Budget" value={BUDGET_RANGES[lead.budget]?.label} />
                <Field label="Project Type" value={PROJECT_TYPES[lead.projectType]?.label} />
                <Field label="Area (sq ft)" value={lead.areaSqft} />
                <Field label="Rooms" value={lead.rooms} />
                <Field label="Assigned To" value={lead.assignedTo?.name} />
                {lead.notes && <div className="col-span-2"><Field label="Notes" value={lead.notes} /></div>}
              </div>
            )}
          </Section>

          {/* Interactions */}
          <Section title="Interactions">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-gray-400">{lead.interactions?.length || 0} total</span>
              <button onClick={() => setShowInteraction(!showInteraction)} className="btn btn-primary text-xs py-1 px-3">
                + Log Interaction
              </button>
            </div>

            {showInteraction && (
              <form onSubmit={logInteraction} className="border rounded-lg p-3 bg-gray-50 mb-4 space-y-2">
                <select className="input" value={intForm.type} onChange={e => setIntForm(f => ({ ...f, type: e.target.value }))}>
                  {Object.entries(INTERACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <textarea className="input" rows={3} placeholder="Summary of interaction..." required value={intForm.summary} onChange={e => setIntForm(f => ({ ...f, summary: e.target.value }))} />
                <select className="input" value={intForm.outcome} onChange={e => setIntForm(f => ({ ...f, outcome: e.target.value }))}>
                  {Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <div>
                  <label className="text-xs text-gray-500">Follow-up date (optional)</label>
                  <input type="datetime-local" className="input" value={intForm.followUpDate} onChange={e => setIntForm(f => ({ ...f, followUpDate: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="btn btn-primary text-sm">{saving ? 'Saving…' : 'Save'}</button>
                  <button type="button" onClick={() => setShowInteraction(false)} className="btn btn-secondary text-sm">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {lead.interactions?.map(interaction => (
                <div key={interaction.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                        {INTERACTION_TYPES[interaction.type]?.label || interaction.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        interaction.outcome === 'POSITIVE' ? 'bg-green-50 text-green-700'
                        : interaction.outcome === 'NEGATIVE' ? 'bg-red-50 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {OUTCOMES[interaction.outcome]?.label || interaction.outcome}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Upload images to this interaction */}
                      <label className="p-1 text-gray-400 hover:text-primary-600 cursor-pointer" title="Attach images">
                        <Camera size={14} />
                        <input
                          type="file" accept="image/*" multiple className="hidden"
                          onChange={e => handleImageUpload(interaction.id, e.target.files)}
                          disabled={uploadingInteractionId === interaction.id}
                        />
                      </label>
                      <button onClick={() => deleteInteraction(interaction.id)} className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{interaction.summary}</p>
                  {interaction.followUpDate && (
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <Clock size={11} /> Follow-up: {formatDate(interaction.followUpDate)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {interaction.user?.name} · {formatDateTime(interaction.createdAt)}
                  </p>

                  {/* Interaction images */}
                  {uploadingInteractionId === interaction.id && (
                    <p className="text-xs text-primary-600 mt-2 animate-pulse">Uploading images…</p>
                  )}
                  {interaction.images?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {interaction.images.map(img => (
                        <div key={img.id} className="relative group">
                          <a href={img.fileUrl} target="_blank" rel="noreferrer">
                            <img
                              src={img.fileUrl}
                              alt={img.fileName}
                              className="w-16 h-16 object-cover rounded border border-gray-200"
                            />
                          </a>
                          <button
                            onClick={() => deleteInteractionImage(interaction.id, img.id)}
                            className="absolute -top-1 -right-1 hidden group-hover:flex bg-red-500 text-white rounded-full w-4 h-4 items-center justify-center text-xs"
                          >×</button>
                          {img.caption && <p className="text-xs text-gray-400 mt-0.5 max-w-16 truncate">{img.caption}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {!lead.interactions?.length && (
                <p className="text-sm text-gray-400 text-center py-6">No interactions yet</p>
              )}
            </div>
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Reminders */}
          <Section title="Reminders">
            <button onClick={() => setShowReminder(!showReminder)} className="btn btn-secondary text-xs w-full mb-3">+ Add Reminder</button>
            {showReminder && (
              <form onSubmit={addReminder} className="space-y-2 mb-3">
                <input type="datetime-local" className="input" required value={remForm.dueDate} onChange={e => setRemForm(f => ({ ...f, dueDate: e.target.value }))} />
                <input className="input" placeholder="Note (optional)" value={remForm.note} onChange={e => setRemForm(f => ({ ...f, note: e.target.value }))} />
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary text-xs">Save</button>
                  <button type="button" onClick={() => setShowReminder(false)} className="btn btn-secondary text-xs">Cancel</button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {lead.reminders?.map(r => (
                <div key={r.id} className={`flex items-start gap-2 p-2 rounded border ${r.isDone ? 'bg-gray-50 opacity-50' : isOverdue(r.dueDate) && !r.isDone ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                  {!r.isDone && (
                    <button onClick={() => completeReminder(r.id)} className="mt-0.5 text-gray-300 hover:text-green-500">
                      <CheckCircle size={14} />
                    </button>
                  )}
                  {r.isDone && <CheckCircle size={14} className="mt-0.5 text-green-500 shrink-0" />}
                  <div>
                    <p className={`text-xs font-medium ${isOverdue(r.dueDate) && !r.isDone ? 'text-red-700' : 'text-gray-700'}`}>{formatDate(r.dueDate)}</p>
                    {r.note && <p className="text-xs text-gray-500">{r.note}</p>}
                  </div>
                </div>
              ))}
              {!lead.reminders?.length && <p className="text-xs text-gray-400 text-center py-3">No reminders</p>}
            </div>
          </Section>

          {/* Quotations for this lead */}
          <Section title="Quotations">
            <Link to={`/quotations/new?leadId=${id}`} className="btn btn-secondary text-xs w-full mb-3 block text-center">+ New Quotation</Link>
            {lead.quotations?.length > 0 ? (
              <div className="space-y-2">
                {lead.quotations?.map(q => (
                  <Link key={q.id} to={`/quotations/${q.id}`} className="flex justify-between items-center p-2 border border-gray-100 rounded hover:bg-gray-50">
                    <div>
                      <p className="text-xs font-medium">{q.refNo}</p>
                      <p className="text-xs text-gray-400">v{q.version}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      q.status === 'APPROVED' || q.status === 'SENT' ? 'bg-green-100 text-green-700'
                      : q.status === 'REJECTED' ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                    }`}>{q.status}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">No quotations yet</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
