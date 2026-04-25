import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import NewLead from './pages/NewLead';
import Team from './pages/Team';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Quotations from './pages/Quotations';
import QuotationDetail from './pages/QuotationDetail';
import QuotationBuilder from './pages/QuotationBuilder';
import MasterList from './pages/MasterList';
import Finance from './pages/Finance';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function OwnerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!['ADMIN', 'CO_ADMIN'].includes(user.role)) return <Navigate to="/" />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/new" element={<NewLead />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<QuotationBuilder />} />
            <Route path="quotations/:id" element={<QuotationDetail />} />
            <Route path="quotations/:id/edit" element={<QuotationBuilder />} />
            <Route path="master-list" element={<OwnerRoute><MasterList /></OwnerRoute>} />
            <Route path="finance" element={<OwnerRoute><Finance /></OwnerRoute>} />
            <Route path="team" element={<Team />} />
          </Route>
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </BrowserRouter>
    </AuthProvider>
  );
}
