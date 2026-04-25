import React, { useEffect, useState } from 'react';
import { masterlistAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, Search, Package } from 'lucide-react';

const CATEGORIES = ['MATERIAL', 'PRODUCT', 'SERVICE', 'FIXTURE', 'FURNITURE', 'CIVIL'];
const UNITS = ['SQFT', 'RFT', 'PER_UNIT', 'LOT', 'HOURS', 'SQMT', 'RUNNING_MT', 'KG', 'BOX'];

const CAT_COLORS = {
  MATERIAL:  'bg-blue-100 text-blue-700',
  PRODUCT:   'bg-purple-100 text-purple-700',
  SERVICE:   'bg-green-100 text-green-700',
  FIXTURE:   'bg-orange-100 text-orange-700',
  FURNITURE: 'bg-pink-100 text-pink-700',
  CIVIL:     'bg-gray-200 text-gray-700',
};

const emptyForm = { category: 'MATERIAL', name: '', description: '', unit: 'SQFT', baseRate: '' };

export default function MasterList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await masterlistAPI.getAll({ active: 'all' });
      setItems(res.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const filtered = items.filter(i => {
    const matchCat = !filterCat || i.category === filterCat;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.description || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filtered.filter(i => i.category === cat);
    return acc;
  }, {});

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const res = await masterlistAPI.update(editId, form);
        setItems(items.map(i => i.id === editId ? res.data : i));
        toast.success('Updated');
      } else {
        const res = await masterlistAPI.create(form);
        setItems(prev => [...prev, res.data]);
        toast.success('Added to master list');
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this item? It won\'t appear in future quotations.')) return;
    try {
      await masterlistAPI.delete(id);
      setItems(items.map(i => i.id === id ? { ...i, isActive: false } : i));
      toast.success('Item deactivated');
    } catch { toast.error('Failed'); }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setForm({ category: item.category, name: item.name, description: item.description || '', unit: item.unit, baseRate: item.baseRate });
    setShowForm(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Master List</h1>
          <p className="text-sm text-gray-400">Your catalogue of materials, products & services</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="btn btn-primary text-sm flex items-center gap-1">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {showForm && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Item' : 'Add New Item'}</h2>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Category *</label>
              <select className="input" required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Item Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 18mm BWR Plywood" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description or specification" />
            </div>
            <div>
              <label className="label">Unit *</label>
              <select className="input" required value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Base Rate (₹) *</label>
              <input className="input" required type="number" min="0" step="0.01" value={form.baseRate} onChange={e => setForm(f => ({ ...f, baseRate: e.target.value }))} placeholder="Rate per unit" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : editId ? 'Update' : 'Add Item'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(cat => {
            const catItems = grouped[cat];
            if (!catItems?.length) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[cat]}`}>{cat}</span>
                  <span className="text-xs text-gray-400">{catItems.length} items</span>
                </div>
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left hidden md:table-cell">Description</th>
                        <th className="px-4 py-2 text-center">Unit</th>
                        <th className="px-4 py-2 text-right">Base Rate</th>
                        <th className="px-4 py-2 text-center">Status</th>
                        <th className="px-4 py-2 w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {catItems.map(item => (
                        <tr key={item.id} className={`border-t border-gray-100 ${!item.isActive ? 'opacity-40' : ''}`}>
                          <td className="px-4 py-2 font-medium">{item.name}</td>
                          <td className="px-4 py-2 text-gray-400 hidden md:table-cell">{item.description || '—'}</td>
                          <td className="px-4 py-2 text-center text-gray-500">{item.unit}</td>
                          <td className="px-4 py-2 text-right font-medium">₹{parseFloat(item.baseRate).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => startEdit(item)} className="p-1 text-gray-400 hover:text-primary-600"><Edit2 size={14} /></button>
                              {item.isActive && <button onClick={() => deactivate(item.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Package size={40} className="mx-auto mb-3 opacity-40" />
              <p>No items found. Start adding your materials and services.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
