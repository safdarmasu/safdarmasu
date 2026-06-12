import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config';

export default function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState({
    placed: 0,
    inLab: 0,
    ready: 0,
    completed: 0,
    totalSales: 0,
    totalCollected: 0,
    totalOutstanding: 0
  });
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const ordersRes = await fetch(getApiUrl('/api/orders'));
        const stockRes = await fetch(getApiUrl('/api/inventory/low-stock'));
        
        if (ordersRes.ok && stockRes.ok) {
          const orders = await ordersRes.json();
          const lowStockItems = await stockRes.json();
          
          setLowStock(lowStockItems);

          // Calculate statistics
          let placedCount = 0;
          let inLabCount = 0;
          let readyCount = 0;
          let completedCount = 0;
          let totalSales = 0;
          let totalCollected = 0;
          let totalOutstanding = 0;

          orders.forEach(order => {
            totalSales += order.totalAmount;
            totalCollected += order.advancePaid;
            totalOutstanding += order.balanceDue;

            if (order.status === 'Placed') placedCount++;
            else if (order.status === 'In_Lab') inLabCount++;
            else if (order.status === 'Ready_For_Pickup') readyCount++;
            else if (order.status === 'Completed') completedCount++;
          });

          setStats({
            placed: placedCount,
            inLab: inLabCount,
            ready: readyCount,
            completed: completedCount,
            totalSales,
            totalCollected,
            totalOutstanding
          });
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl w-full mx-auto px-4 py-6">
      
      {/* Brand Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="text-indigo-600">🕶️</span> OPTISOFT
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Optical Shop POS, Customer Cards & Inventory Suite
          </p>
        </div>
        <button
          onClick={() => setActiveTab('checkout')}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-5 py-3 rounded-2xl shadow-md transition-all text-sm flex items-center gap-2"
        >
          ➕ New Checkout Order
        </button>
      </div>

      {/* Grid of status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Orders Placed', count: stats.placed, bg: 'bg-blue-50/70 border-blue-100', text: 'text-blue-700', icon: '📋' },
          { label: 'In Lab', count: stats.inLab, bg: 'bg-amber-50/70 border-amber-100', text: 'text-amber-700', icon: '🛠️' },
          { label: 'Ready for Pickup', count: stats.ready, bg: 'bg-emerald-50/70 border-emerald-100', text: 'text-emerald-700', icon: '👓' },
          { label: 'Completed', count: stats.completed, bg: 'bg-slate-50/70 border-slate-200', text: 'text-slate-700', icon: '✅' },
        ].map((c, idx) => (
          <div key={idx} className={`p-4 border rounded-3xl ${c.bg} flex justify-between items-center shadow-xs`}>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">{c.label}</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{c.count}</span>
            </div>
            <span className="text-2xl">{c.icon}</span>
          </div>
        ))}
      </div>

      {/* Financial cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-xl transform translate-x-8 -translate-y-8"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-200 block">Total Sales Revenue</span>
          <span className="text-3xl font-black mt-2 block">₹{stats.totalSales.toLocaleString('en-IN')}</span>
          <span className="text-xs text-indigo-100 font-medium block mt-2">Overall order volume</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-xl transform translate-x-8 -translate-y-8"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-200 block">Total Cash Collected</span>
          <span className="text-3xl font-black mt-2 block">₹{stats.totalCollected.toLocaleString('en-IN')}</span>
          <span className="text-xs text-emerald-100 font-medium block mt-2">Deposits & settle payments</span>
        </div>

        <div className="bg-gradient-to-br from-rose-600 to-rose-800 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-xl transform translate-x-8 -translate-y-8"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-200 block">Dues Outstanding</span>
          <span className="text-3xl font-black mt-2 block">₹{stats.totalOutstanding.toLocaleString('en-IN')}</span>
          <span className="text-xs text-rose-100 font-medium block mt-2">Remaining balances collectable</span>
        </div>
      </div>

      {/* Low stock alerts panel & Quick shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Low stock list */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
          <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            ⚠️ Low Stock & Inventory Alerts
          </h2>
          
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-2xl">🌱</span>
              <p className="text-sm font-bold text-slate-500 mt-2">All stock levels are optimal!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStock.map(item => (
                <div key={item.id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-extrabold text-slate-800 block">{item.name}</span>
                    <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wide">
                      {item.type} • SKU: {item.skuCode}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200 ring-2 ring-amber-100 animate-pulse">
                      {item.stock} left (Limit: {item.alertLimit})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Quick shortcuts */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 mb-3">⚡ Quick Navigation</h2>
            <p className="text-xs font-medium text-slate-400 mb-4">Jump directly to specific actions</p>
          </div>
          <div className="space-y-2.5">
            <button
              onClick={() => setActiveTab('customers')}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl border border-slate-100 active:scale-[0.98] transition-all text-left"
            >
              <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-sm font-bold">👤</span>
              <div>
                <span className="text-sm font-extrabold text-slate-700 block">Customer Cards</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Search & historical Rx</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('orders')}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl border border-slate-100 active:scale-[0.98] transition-all text-left"
            >
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">🧾</span>
              <div>
                <span className="text-sm font-extrabold text-slate-700 block">Orders & Payments</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Installments & Labs</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl border border-slate-100 active:scale-[0.98] transition-all text-left"
            >
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">📦</span>
              <div>
                <span className="text-sm font-extrabold text-slate-700 block">Manage Inventory</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Add frames & lenses</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
