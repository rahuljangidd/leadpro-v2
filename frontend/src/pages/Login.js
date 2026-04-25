import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LeadPro</h1>
          <p className="text-gray-500 text-sm mt-1">Interior Design CRM</p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-2.5">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600 mb-1">Demo credentials:</p>
            <p>Admin: admin@leadpro.com / admin123</p>
            <p>Manager: manager@leadpro.com / manager123</p>
            <p>Executive: rahul@leadpro.com / exec123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
