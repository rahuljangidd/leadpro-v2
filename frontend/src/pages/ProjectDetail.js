import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsAPI, quotationsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Camera, Plus, CheckCircle, Clock, AlertCircle, ChevronDown, Trash2, Upload, Image, FileText } from 'lucide-react';
import { formatDate } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const TABS = ['Overview', 'Design', 'Site Photos', 'Payments'];

const STATUS_BADGE = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REVISION: 'bg-red-100 text-red-700',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhase, setUploadingPhase] = useState(null);
  const [uploadingSite, setUploadingSite] = useState(false);
  const [newPhase, setNewPhase] = useState('');
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const isOwner = ['ADMIN', 'CO_ADMIN'].includes(user?.role);

  const load = async () => {
    try {
      const res = await projectsAPI.get(id);
      setProject(res.data);
    } catch { toast.error('Failed to load project'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (status) => {
    try {
      await projectsAPI.update(id, { status });
      setProject(p => ({ ...p, status }));
      toast.success('Status updated');
    } catch { toast.error('Failed'); }
  };

  // ── Design ────────────────────────────────────────────────────────────────

  const addPhase = async () => {
    if (!newPhase.trim()) return;
    try {
      const res = await projectsAPI.addDesignPhase(id, { name: newPhase });
      setProject(p => ({ ...p, designPhases: [...p.designPhases, res.data] }));
      setNewPhase('');
      setShowPhaseForm(false);
    } catch { toast.error('Failed'); }
  };

  const updatePhaseStatus = async (phaseId, status, clientNote) => {
    try {
      const res = await projectsAPI.updateDesignPhase(id, phaseId, { status, clientNote });
      setProject(p => ({
        ...p,
        designPhases: p.designPhases.map(ph => ph.id === phaseId ? { ...ph, ...res.data } : ph)
      }));
    } catch { toast.error('Failed'); }
  };

  const uploadDesignImages = async (phaseId, files) => {
    setUploadingPhase(phaseId);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const res = await projectsAPI.uploadDesignImages(id, phaseId, fd);
      setProject(p => ({
        ...p,
        designPhases: p.designPhases.map(ph =>
          ph.id === phaseId ? { ...ph, images: [...ph.images, ...res.data] } : ph
        )
      }));
      toast.success(`${res.data.length} image(s) uploaded`);
    } catch { toast.error('Upload failed'); }
    finally { setUploadingPhase(null); }
  };

  const updateImageStatus = async (phaseId, imageId, status, note) => {
    try {
      const res = await projectsAPI.updateDesignImage(id, imageId, { status, note });
      setProject(p => ({
        ...p,
        designPhases: p.designPhases.map(ph =>
          ph.id === phaseId
            ? { ...ph, images: ph.images.map(img => img.id === imageId ? { ...img, ...res.data } : img) }
            : ph
        )
      }));
    } catch { toast.error('Failed'); }
  };

  // ── Site photos ───────────────────────────────────────────────────────────

  const uploadSiteImages = async (files) => {
    setUploadingSite(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const res = await projectsAPI.uploadSiteImages(id, fd);
      setProject(p => ({ ...p, siteImages: [...res.data, ...(p.siteImages || [])] }));
      toast.success(`${res.data.length} photo(s) added`);
    } catch { toast.error('Upload failed'); }
    finally { setUploadingSite(false); }
  };

  const deleteSiteImage = async (imageId) => {
    try {
      await projectsAPI.deleteSiteImage(id, imageId);
      setProject(p => ({ ...p, siteImages: p.siteImages.filter(i => i.id !== imageId) }));
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!project) return null;

  const STATUS_COLORS = { ACTIVE: 'bg-green-100 text-green-700', ON_HOLD: 'bg-yellow-100 text-yellow-700', COMPLETED: 'bg-blue-100 text-blue-700', CANCELLED: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/projects" className="text-xs text-gray-400 hover:text-primary-600 block mb-1">← Back to Projects</Link>
          <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
          <p className="text-sm text-gray-400">{project.refNo} · {project.clientName}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>{project.status}</span>
          {isOwner && (
            <select className="input w-auto text-sm" value={project.status} onChange={e => updateStatus(e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          )}
          <Link to={`/quotations/new?projectId=${id}`} className="btn btn-primary text-sm">+ Quotation</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 border-b pb-2">Project Info</h3>
            {[
              ['Client', project.clientName],
              ['Phone', project.clientPhone],
              ['Email', project.clientEmail],
              ['Address', project.projectAddress],
              ['Type', project.projectType],
              ['Area', project.areaSqft ? `${project.areaSqft} sq ft` : null],
              ['Designer', project.designerName],
              ['Project Manager', project.projectManager],
              ['Execution Lead', project.executionLead],
              ['Expected End', project.expectedEnd ? formatDate(project.expectedEnd) : null],
            ].map(([k, v]) => v ? (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-400">{k}</span>
                <span className="text-gray-900 text-right max-w-48">{v}</span>
              </div>
            ) : null)}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-sm text-gray-700 border-b pb-2 mb-3">Quotations</h3>
            {project.quotations?.length > 0 ? (
              <div className="space-y-2">
                {project.quotations.map(q => (
                  <Link key={q.id} to={`/quotations/${q.id}`} className="flex justify-between items-center p-2 border border-gray-100 rounded hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium">{q.refNo}</p>
                      <p className="text-xs text-gray-400">v{q.version} · {q.createdBy?.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${q.status === 'APPROVED' || q.status === 'SENT' ? 'bg-green-100 text-green-700' : q.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{q.status}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No quotations yet</p>
            )}
          </div>
        </div>
      )}

      {/* ── DESIGN ── */}
      {tab === 'Design' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{project.designPhases?.length || 0} phase(s)</p>
            <button onClick={() => setShowPhaseForm(true)} className="btn btn-primary text-sm">+ Add Phase</button>
          </div>
          {showPhaseForm && (
            <div className="card p-4 flex gap-2">
              <input className="input flex-1" placeholder="Phase name (e.g. Concept Render, Floor Plan…)" value={newPhase} onChange={e => setNewPhase(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPhase()} />
              <button onClick={addPhase} className="btn btn-primary text-sm">Add</button>
              <button onClick={() => setShowPhaseForm(false)} className="btn btn-secondary text-sm">Cancel</button>
            </div>
          )}
          {project.designPhases?.map(phase => (
            <div key={phase.id} className="card p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-800">{phase.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[phase.status]}`}>{phase.status}</span>
                  {isOwner && (
                    <select className="text-xs border rounded px-2 py-0.5" value={phase.status} onChange={e => updatePhaseStatus(phase.id, e.target.value, phase.clientNote)}>
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REVISION">Revision</option>
                    </select>
                  )}
                </div>
              </div>
              {phase.clientNote && <p className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded mb-3">{phase.clientNote}</p>}

              {/* Images */}
              <div className="flex flex-wrap gap-2 mb-3">
                {phase.images?.map(img => (
                  <div key={img.id} className="relative group">
                    <a href={img.fileUrl} target="_blank" rel="noreferrer">
                      <img src={img.fileUrl} alt={img.fileName} className="w-20 h-20 object-cover rounded border border-gray-200" />
                    </a>
                    <span className={`absolute bottom-0 left-0 right-0 text-center text-xs py-0.5 rounded-b ${STATUS_BADGE[img.status] || ''}`}>{img.status}</span>
                    {isOwner && (
                      <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                        <button onClick={() => updateImageStatus(phase.id, img.id, 'APPROVED', null)} title="Approve" className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</button>
                        <button onClick={() => { const note = prompt('Revision note:'); if (note !== null) updateImageStatus(phase.id, img.id, 'REVISION', note); }} title="Request revision" className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✗</button>
                      </div>
                    )}
                    {img.note && <p className="text-xs text-gray-400 mt-0.5 max-w-20 truncate" title={img.note}>{img.note}</p>}
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 text-gray-400 hover:text-primary-500">
                  {uploadingPhase === phase.id ? <span className="text-xs animate-pulse">…</span> : <><Upload size={18} /><span className="text-xs mt-1">Upload</span></>}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => uploadDesignImages(phase.id, e.target.files)} disabled={uploadingPhase === phase.id} />
                </label>
              </div>
              {phase.images?.length === 0 && <p className="text-xs text-gray-400">No images yet — upload designs above.</p>}
            </div>
          ))}
          {!project.designPhases?.length && <div className="text-center py-12 text-gray-400"><Image size={36} className="mx-auto mb-2 opacity-40" /><p>No design phases yet. Add a phase to start tracking approvals.</p></div>}
        </div>
      )}

      {/* ── SITE PHOTOS ── */}
      {tab === 'Site Photos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{project.siteImages?.length || 0} photos</p>
            <label className="btn btn-primary text-sm cursor-pointer flex items-center gap-1">
              {uploadingSite ? 'Uploading…' : <><Camera size={15} /> Add Photos</>}
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => uploadSiteImages(e.target.files)} disabled={uploadingSite} />
            </label>
          </div>
          {project.siteImages?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {project.siteImages.map(img => (
                <div key={img.id} className="relative group">
                  <a href={img.fileUrl} target="_blank" rel="noreferrer">
                    <img src={img.fileUrl} alt={img.fileName} className="w-full aspect-square object-cover rounded border border-gray-200" />
                  </a>
                  {img.caption && <p className="text-xs text-gray-500 mt-1 truncate">{img.caption}</p>}
                  <p className="text-xs text-gray-400">{formatDate(img.takenAt)}</p>
                  {isOwner && (
                    <button onClick={() => deleteSiteImage(img.id)} className="absolute top-1 right-1 hidden group-hover:flex bg-red-500 text-white rounded-full w-5 h-5 items-center justify-center text-xs">×</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Camera size={40} className="mx-auto mb-2 opacity-40" />
              <p>No site photos yet</p>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {tab === 'Payments' && (
        <div className="space-y-4">
          {project.paymentSchedule?.length > 0 ? (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Milestone</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-left">Due</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-right">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {project.paymentSchedule.map(pm => {
                    const received = pm.entries?.reduce((s, e) => s + parseFloat(e.amount), 0) || 0;
                    return (
                      <tr key={pm.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium">{pm.milestone}</td>
                        <td className="px-4 py-3 text-right">₹{parseFloat(pm.amount).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-gray-500">{pm.dueDate ? formatDate(pm.dueDate) : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${pm.status === 'PAID' ? 'bg-green-100 text-green-700' : pm.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{pm.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-green-700">₹{received.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>No payment schedule. Create a quotation with milestones to set this up.</p>
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">All payment entries are managed in the Finance module.</p>
        </div>
      )}
    </div>
  );
}
