import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { leadsAPI, usersAPI } from '../services/api';
import { LEAD_STATUSES, LEAD_SOURCES, PROJECT_TYPES, BUDGET_RANGES, formatDate } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

export default function Leads() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    source: '', assignedToId: '', budget: '',
    page: 1
  });

  const isManagerPlus = user?.role !== 'EXECUTIVE';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await leadsAPI.getAll(params);
      setLeads(res.data.leads);
      setTotal(res.data.total);
    } catch { } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isManagerPlus) usersAPI.getAll().then(r => setUsers(r.data)).catch(() => {});
  }, [isManagerPlus]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-400">{total} total</p>
        </div>
        <Link to="/leads/new" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add lead
        </Link>
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <input className="input col-span-2 md:col-span-1" placeholder="Search name, phone, email..." value={filters.search} onChange={e => setFilter('search', e.target.value)} />
          <select className="input" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(LEAD_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="input" value={filters.source} onChange={e => setFilter('source', e.target.value)}>
            <option value="">All sources</option>
            {Object.entries(LEAD_SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input" value={filters.budget} onChange={e => setFilter('budget', e.target.value)}>
            <option value="">All budgets</option>
            {Object.entries(BUDGET_RANGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {isManagerPlus && (
            <select className="input" value={filters.assignedToId} onChange={e => setFilter('assignedToId', e.target.value)}>
              <option value="">All executives</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="font-medium">No leads found</p>
          <Link to="/leads/new" className="btn-primary mt-4 inline-flex">Add first lead</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Budget</th>
                  {isManagerPlus && <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned to</th>}
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-primary-700">{lead.name}</Link>
                      {lead.city && <p className="text-xs text-gray-400">{lead.city}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.phone}</td>
                    <td className="px-4 py-3"><span className={`badge ${LEAD_STATUSES[lead.status]?.color}`}>{LEAD_STATUSES[lead.status]?.label}</span></td>
                    <td className="px-4 py-3 text-gray-500">{LEAD_SOURCES[lead.source]}</td>
                    <td className="px-4 py-3 text-gray-500">{BUDGET_RANGES[lead.budget]}</td>
                    {isManagerPlus && <td className="px-4 py-3 text-gray-500">{lead.assignedTo?.name || '—'}</td>}
                    <td className="px-4 py-3 text-gray-400">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 20 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {filters.page}</p>
              <div className="flex gap-2">
                <button disabled={filters.page === 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="btn-secondary text-xs px-3">Previous</button>
                <button disabled={leads.length < 20} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="btn-secondary text-xs px-3">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
