import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { quotationsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FileText, Plus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/constants';

const STATUS_BADGE = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED:  'bg-green-100 text-green-700',
  SENT:      'bg-purple-100 text-purple-700',
  REJECTED:  'bg-red-100 text-red-700',
};

export default function Quotations() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const isOwner = ['ADMIN', 'CO_ADMIN'].includes(user?.role);

  useEffect(() => { load(); }, [status]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await quotationsAPI.getAll({ status });
      setQuotations(res.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Quotations</h1>
        <Link to="/quotations/new" className="btn btn-primary text-sm flex items-center gap-1">
          <Plus size={16} /> New Quotation
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'SENT', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${status === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Pending review banner for owners */}
      {isOwner && quotations.filter(q => q.status === 'SUBMITTED').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-center gap-2">
          <span className="font-semibold">{quotations.filter(q => q.status === 'SUBMITTED').length}</span> quotation(s) waiting for your review
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p>No quotations found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Ref No</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-center">Version</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Created By</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/quotations/${q.id}`}>
                  <td className="px-4 py-3 font-medium text-primary-600">{q.refNo}</td>
                  <td className="px-4 py-3 text-gray-800">{q.lead?.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">v{q.version}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[q.status]}`}>{q.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{q.createdBy?.name}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
