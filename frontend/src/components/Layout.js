import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, UserCircle, LogOut, Menu, X,
  FolderOpen, FileText, Package, Wallet, ChevronDown
} from 'lucide-react';

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-600 text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isOwner = ['ADMIN', 'CO_ADMIN'].includes(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setSidebarOpen(false)} />
      <NavItem to="/leads" icon={Users} label="Leads" onClick={() => setSidebarOpen(false)} />
      <NavItem to="/projects" icon={FolderOpen} label="Projects" onClick={() => setSidebarOpen(false)} />
      <NavItem to="/quotations" icon={FileText} label="Quotations" onClick={() => setSidebarOpen(false)} />
      {isOwner && (
        <>
          <NavItem to="/master-list" icon={Package} label="Master List" onClick={() => setSidebarOpen(false)} />
          <NavItem to="/finance" icon={Wallet} label="Finance" onClick={() => setSidebarOpen(false)} />
        </>
      )}
      <NavItem to="/team" icon={UserCircle} label="Team" onClick={() => setSidebarOpen(false)} />
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed h-full z-20">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-primary-600">LeadPro</h1>
          <p className="text-xs text-gray-400 mt-0.5">Interior Management</p>
        </div>
        {navLinks}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile header + sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-bold text-primary-600">LeadPro</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 text-gray-600">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setSidebarOpen(false)}>
          <div className="bg-white w-64 h-full flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 pt-16 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.role?.replace('_', ' ')}</p>
            </div>
            {navLinks}
            <div className="p-3 border-t border-gray-100">
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
