import React, { useEffect, useState } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getInitials, formatDate } from '../utils/constants';
import { toast } from 'react-toastify';

export default function Team() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EXECUTIVE' });
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  const load = () => usersAPI.getAll().then(r => setUsers(r.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersAPI.create(form);
      toast.success('Team member added');
      setForm({ name: '', email: '', password: '', role: 'EXECUTIVE' });
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this team member?')) return;
    try {
      await usersAPI.delete(id);
      setUsers(u => u.filter(x => x.id !== id));
      toast.success('Removed');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-400">{users.length} members</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add member
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New team member</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rahul Verma" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="rahul@company.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" minLength={6} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="EXECUTIVE">Executive</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary px-6">{saving ? 'Adding...' : 'Add member'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-4">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">{getInitials(u.name)}</div>
                    <span className="font-medium text-gray-900">{u.name}</span>
                    {u.id === user?.id && <span className="badge bg-primary-50 text-primary-700 text-xs">You</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{formatDate(u.createdAt)}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    {u.id !== user?.id && (
                      <button onClick={() => handleDelete(u.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
