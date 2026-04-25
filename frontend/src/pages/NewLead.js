import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsAPI, usersAPI } from '../services/api';
import { LEAD_SOURCES, PROJECT_TYPES, BUDGET_RANGES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function NewLead() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const isManagerPlus = user?.role !== 'EXECUTIVE';

  const [form, setForm] = useState({
    name: '', phone: '', phone2: '', email: '', city: '',
    source: 'OTHER', sourceDetail: '',
    projectType: 'RESIDENTIAL', propertyType: '', areaSqft: '', rooms: '',
    style: '', budget: 'NOT_DISCLOSED', expectedStart: '', notes: '',
    assignedToId: user?.role === 'EXECUTIVE' ? user.id : '',
    tags: '',
  });

  useEffect(() => {
    if (isManagerPlus) usersAPI.getAll().then(r => setUsers(r.data)).catch(() => {});
  }, [isManagerPlus]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...form,
        areaSqft: form.areaSqft ? parseInt(form.areaSqft) : null,
        rooms: form.rooms ? parseInt(form.rooms) : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        assignedToId: form.assignedToId || null,
      };
      const res = await leadsAPI.create(data);
      toast.success('Lead added!');
      navigate(`/leads/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create lead');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Add new lead</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Contact information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Client full name" />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} required placeholder="Primary phone" />
            </div>
            <div>
              <label className="label">Alternate phone</label>
              <input className="input" value={form.phone2} onChange={e => set('phone2', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="client@email.com" />
            </div>
            <div>
              <label className="label">City / Area</label>
              <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Pune, Mumbai..." />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Lead source</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Source</label>
              <select className="input" value={form.source} onChange={e => set('source', e.target.value)}>
                {Object.entries(LEAD_SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {form.source === 'REFERRAL' && (
              <div>
                <label className="label">Referred by</label>
                <input className="input" value={form.sourceDetail} onChange={e => set('sourceDetail', e.target.value)} placeholder="Referrer name" />
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Project details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Project type</label>
              <select className="input" value={form.projectType} onChange={e => set('projectType', e.target.value)}>
                {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Property type</label>
              <input className="input" value={form.propertyType} onChange={e => set('propertyType', e.target.value)} placeholder="Flat, Villa, Office..." />
            </div>
            <div>
              <label className="label">Area (sq. ft.)</label>
              <input className="input" type="number" value={form.areaSqft} onChange={e => set('areaSqft', e.target.value)} placeholder="e.g. 1200" />
            </div>
            <div>
              <label className="label">Number of rooms</label>
              <input className="input" type="number" value={form.rooms} onChange={e => set('rooms', e.target.value)} placeholder="e.g. 3" />
            </div>
            <div>
              <label className="label">Style preference</label>
              <input className="input" value={form.style} onChange={e => set('style', e.target.value)} placeholder="Modern, Classic, Minimalist..." />
            </div>
            <div>
              <label className="label">Budget range</label>
              <select className="input" value={form.budget} onChange={e => set('budget', e.target.value)}>
                {Object.entries(BUDGET_RANGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expected start</label>
              <input className="input" value={form.expectedStart} onChange={e => set('expectedStart', e.target.value)} placeholder="e.g. March 2025, Q2 2025" />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Notes / Requirements</label>
            <textarea className="input min-h-[80px]" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What does the client want? Any specific requirements, style notes, constraints..." />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Assignment & tags</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isManagerPlus && (
              <div>
                <label className="label">Assign to</label>
                <select className="input" value={form.assignedToId} onChange={e => set('assignedToId', e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Tags (comma separated)</label>
              <input className="input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="high-budget, instagram, urgent" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary px-8 py-2.5">
            {loading ? 'Saving...' : 'Create lead'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary px-6">Cancel</button>
        </div>
      </form>
    </div>
  );
}
