import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LEAD_STATUSES, formatDateTime, formatDate, isOverdue } from '../utils/constants';
import { toast } from 'react-toastify';
import { Users, FolderOpen, FileText, Clock, AlertTriangle } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color = 'bg-primary-600', to }) {
  const content = (
    <div className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isOwner = ['ADMIN', 'CO_ADMIN'].includes(user?.role);

  useEffect(() => {
    dashboardAPI.stats()
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  const wonCount   = stats?.byStatus?.WON   || 0;
  const lostCount  = stats?.byStatus?.LOST  || 0;
  const totalClosed = wonCount + lostCount;
  const winRate    = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Leads"     value={stats?.totalLeads}          icon={Users}      color="bg-primary-600" to="/leads" />
        <StatCard label="Active Projects" value={stats?.totalProjects}        icon={FolderOpen} color="bg-blue-500"    to="/projects" />
        {isOwner && <StatCard label="Pending Review"  value={stats?.pendingQuotations} icon={FileText}   color={stats?.pendingQuotations > 0 ? 'bg-yellow-500' : 'bg-gray-400'} to="/quotations?status=SUBMITTED" />}
        <StatCard label="Won Leads"       value={wonCount}                    icon={Users}      color="bg-green-500"  to="/leads" />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Lead Pipeline</h3>
          <div className="space-y-2">
            {Object.entries(LEAD_STATUSES).map(([key, info]) => {
              const count = stats?.byStatus?.[key] || 0;
              const pct = stats?.totalLeads > 0 ? (count / stats.totalLeads) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-36 truncate">{info.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className={`bg-${info.color}-400 h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">Win rate: <span className="font-semibold text-green-600">{winRate}%</span></p>
        </div>

        {/* Upcoming reminders */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock size={14} /> Upcoming Reminders
          </h3>
          <div className="space-y-2">
            {stats?.upcomingReminders?.length > 0 ? (
              stats.upcomingReminders.map(r => (
                <Link key={r.id} to={`/leads/${r.leadId}`} className={`block p-2 rounded border text-xs ${isOverdue(r.dueDate) ? 'border-red-200 bg-red-50' : 'border-yellow-100 bg-yellow-50'}`}>
                  <p className="font-medium text-gray-700 truncate">{r.lead?.name}</p>
                  <p className={`${isOverdue(r.dueDate) ? 'text-red-600' : 'text-orange-600'}`}>{formatDate(r.dueDate)}</p>
                  {r.note && <p className="text-gray-500 truncate">{r.note}</p>}
                </Link>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No upcoming reminders</p>
            )}
          </div>
        </div>
      </div>

      {/* Cold leads warning */}
      {stats?.coldLeads?.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-500" />
            Cold Leads — No activity in 7+ days ({stats.coldLeads.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {stats.coldLeads.map(lead => (
              <Link key={lead.id} to={`/leads/${lead.id}`} className="flex justify-between items-center p-2 border border-orange-100 rounded hover:bg-orange-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{lead.name}</p>
                  <p className="text-xs text-gray-400">{lead.status}</p>
                </div>
                {lead.assignedTo && <span className="text-xs text-gray-400">{lead.assignedTo.name}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent leads */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Recent Leads</h3>
          <Link to="/leads" className="text-xs text-primary-600 hover:underline">View all</Link>
        </div>
        <div className="space-y-2">
          {stats?.recentLeads?.map(lead => (
            <Link key={lead.id} to={`/leads/${lead.id}`} className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">{lead.name}</p>
                <p className="text-xs text-gray-400">{lead.phone}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded-full bg-${LEAD_STATUSES[lead.status]?.color}-100 text-${LEAD_STATUSES[lead.status]?.color}-700`}>
                  {LEAD_STATUSES[lead.status]?.label}
                </span>
                {lead.assignedTo && <p className="text-xs text-gray-400 mt-0.5">{lead.assignedTo.name}</p>}
              </div>
            </Link>
          ))}
          {!stats?.recentLeads?.length && <p className="text-sm text-gray-400 text-center py-4">No leads yet</p>}
        </div>
      </div>

      {/* Team stats — owners only */}
      {isOwner && stats?.teamStats?.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Team Performance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {stats.teamStats.map(u => (
              <div key={u.id} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold mx-auto mb-1">
                  {u.name?.charAt(0)?.toUpperCase()}
                </div>
                <p className="text-xs font-medium text-gray-700 truncate">{u.name}</p>
                <p className="text-lg font-bold text-primary-600">{u._count?.leads || 0}</p>
                <p className="text-xs text-gray-400">leads</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
