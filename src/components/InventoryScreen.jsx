import React, { useState, useEffect } from 'react';

export default function InventoryScreen() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add item form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState('FRAME');
  const [formData, setFormData] = useState({
    name: '',
    skuCode: '',
    stock: 10,
    alertLimit: 2,
    price: 1500,
    brand: '',
    color: '',
    modelNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (e) {
      console.error("Error fetching inventory", e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.skuCode) {
      alert("Name and SKU are required!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: formType
        })
      });

      if (res.ok) {
        alert("Inventory Item added successfully!");
        setShowAddForm(false);
        setFormData({
          name: '',
          skuCode: '',
          stock: 10,
          alertLimit: 2,
          price: 1500,
          brand: '',
          color: '',
          modelNumber: ''
        });
        fetchInventory();
      } else {
        const err = await res.json();
        alert(`Error adding item: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(query) || 
                          item.skuCode.toLowerCase().includes(query) ||
                          (item.brand && item.brand.toLowerCase().includes(query)) ||
                          (item.modelNumber && item.modelNumber.toLowerCase().includes(query));
    
    if (filterType === 'ALL') return matchesSearch;
    return item.type === filterType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
      
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">📦 Inventory & Stock Levels</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track frames (brand, color, model) and lenses, audit stock, and configure alerts
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-5 py-2.5 rounded-2xl shadow-sm transition-all text-xs flex items-center gap-2"
        >
          {showAddForm ? "✕ Close Form" : "➕ Add Stock Item"}
        </button>
      </div>

      {/* ADD ITEM FORM MODAL / EXPANSION */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">New Stock Item</h3>
            
            {/* Form Type Select */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              {['FRAME', 'LENS'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormType(type)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                    formType === type
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  {type}s
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Item Display Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                placeholder="e.g. Aviator Classic, Blue Cut Lens..."
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SKU Code (Unique)</label>
              <input
                type="text"
                value={formData.skuCode}
                onChange={(e) => handleInputChange('skuCode', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 font-mono"
                placeholder="e.g. FRM-RB-3025, LNS-BC-SV"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Price (₹ INR)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                placeholder="Price"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Stock Qty</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alert stock limit</label>
              <input
                type="number"
                value={formData.alertLimit}
                onChange={(e) => handleInputChange('alertLimit', parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                required
              />
            </div>

            {formType === 'FRAME' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                    placeholder="Ray-Ban, Oakley..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Model / Color</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.modelNumber}
                      onChange={(e) => handleInputChange('modelNumber', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold text-slate-800"
                      placeholder="Model"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold text-slate-800"
                      placeholder="Color"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-extrabold py-3 rounded-xl transition-all"
          >
            {isSubmitting ? "Adding to Stock..." : "Submit New Item"}
          </button>
        </form>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Filters Tabs */}
        <div className="flex bg-slate-100 rounded-2xl p-1 shrink-0">
          {['ALL', 'FRAME', 'LENS'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                filterType === type
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              {type === 'ALL' ? 'Show All' : `${type}s`}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full md:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
            placeholder="🔍 Search SKU, brand, model..."
          />
        </div>
      </div>

      {/* Stock Levels List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 font-black border-b border-slate-100">
                <th className="px-5 py-4">Item details</th>
                <th className="px-5 py-4">SKU / Code</th>
                <th className="px-5 py-4">Attributes</th>
                <th className="px-5 py-4">Pricing</th>
                <th className="px-5 py-4 text-center">In Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                    No items in inventory directory. Add some items above!
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const isLow = item.stock <= item.alertLimit;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4.5">
                        <span className="text-sm font-extrabold text-slate-800 block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-0.5 block">
                          Type: {item.type}
                        </span>
                      </td>
                      <td className="px-5 py-4.5">
                        <span className="text-xs font-mono font-bold text-indigo-600 block bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md w-max">
                          {item.skuCode}
                        </span>
                      </td>
                      <td className="px-5 py-4.5 text-xs text-slate-500 font-bold">
                        {item.type === 'FRAME' ? (
                          <span>
                            Brand: {item.brand || 'N/A'} • Model: {item.modelNumber || 'N/A'} • Color: {item.color || 'N/A'}
                          </span>
                        ) : (
                          <span className="italic text-slate-400">Lens specs (custom)</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5">
                        <span className="text-sm font-black text-slate-800">₹{item.price.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4.5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full border text-xs font-black min-w-[3.5rem] ${
                          isLow
                            ? 'bg-amber-50 text-amber-700 border-amber-200 ring-2 ring-amber-100'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {item.stock}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
