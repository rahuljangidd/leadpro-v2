import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { projectsAPI, leadsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FolderOpen, Plus, Search } from 'lucide-react';

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [wonLeads, setWonLeads] = useState([]);
  const [form, setForm] = useState({ leadId: '', title: '', clientName: '', clientPhone: '', projectAddress: '', projectType: 'RESIDENTIAL' });
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    load();
    leadsAPI.getAll({ status: 'WON' }).then(r => setWonLeads(r.data)).catch(() => {});
    if (searchParams.get('createFor')) {
      const leadId = searchParams.get('createFor');
      setForm(f => ({ ...f, leadId }));
      setShowCreate(true);
    }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await projectsAPI.getAll({ search, status });
      setProjects(res.data);
    } catch { toast.error('Failed to load projects'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, status]);

  // Auto-fill from lead
  useEffect(() => {
    if (form.leadId) {
      const lead = wonLeads.find(l => l.id === form.leadId);
      if (lead) setForm(f => ({ ...f, clientName: lead.name, clientPhone: lead.phone, title: `${lead.name} — Interior Project` }));
    }
  }, [form.leadId]);

  const createProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await projectsAPI.create(form);
      toast.success('Project created!');
      setShowCreate(false);
      setProjects(p => [res.data, ...p]);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Projects</h1>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary text-sm flex items-center gap-1">
          <Plus size={16} /> New Project
        </button>
      </div>

      {showCreate && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Create New Project</h2>
          <form onSubmit={createProject} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">From Lead (WON) *</label>
              <select className="input" required value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}>
                <option value="">Select lead…</option>
                {wonLeads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Project Title *</label>
              <input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. 3BHK Interior Pune" />
            </div>
            <div>
              <label className="label">Client Name *</label>
              <input className="input" required value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Client Phone *</label>
              <input className="input" required value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Project Type</label>
              <select className="input" value={form.projectType} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}>
                <option value="RESIDENTIAL">Residential</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="OFFICE">Office</option>
                <option value="VILLA">Villa</option>
              </select>
            </div>
            <div>
              <label className="label">Designer Name</label>
              <input className="input" value={form.designerName || ''} onChange={e => setForm(f => ({ ...f, designerName: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Project Address</label>
              <input className="input" value={form.projectAddress || ''} onChange={e => setForm(f => ({ ...f, projectAddress: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Creating…' : 'Create Project'}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p>No projects yet. Convert a WON lead into a project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} className="card p-4 hover:shadow-md transition-shadow block">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{p.title}</p>
                  <p className="text-xs text-gray-400">{p.refNo}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
              </div>
              <p className="text-sm text-gray-600">{p.clientName} · {p.clientPhone}</p>
              {p.projectAddress && <p className="text-xs text-gray-400 mt-1 truncate">{p.projectAddress}</p>}
              <div className="flex gap-3 mt-3 text-xs text-gray-400">
                <span>{p._count?.designPhases || 0} design phases</span>
                <span>{p._count?.siteImages || 0} site photos</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
