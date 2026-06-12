import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import CheckoutScreen from './components/CheckoutScreen';
import OrdersScreen from './components/OrdersScreen';
import CustomersScreen from './components/CustomersScreen';
import InventoryScreen from './components/InventoryScreen';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'checkout':
        return <CheckoutScreen setActiveTab={setActiveTab} />;
      case 'orders':
        return <OrdersScreen />;
      case 'customers':
        return <CustomersScreen />;
      case 'inventory':
        return <InventoryScreen />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'checkout', label: 'New Sale', icon: '➕' },
    { id: 'orders', label: 'Orders', icon: '🧾' },
    { id: 'customers', label: 'Customers', icon: '👤' },
    { id: 'inventory', label: 'Inventory', icon: '📦' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 lg:pb-0 font-sans">
      
      {/* Top Brand Bar for desktop/tablet layout */}
      <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xl">🕶️</span>
          <span className="text-lg font-black tracking-tight text-slate-800">OPTISOFT</span>
        </div>
        
        {/* Top Navbar */}
        <nav className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95 ${
                activeTab === item.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="mr-1.5">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main page content area */}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>

      {/* Bottom Sticky Tab Bar for mobile/tablet usage (Highly Optimized) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2.5 flex justify-around items-center z-40 shadow-2xl">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center gap-1 py-1 active:scale-95 transition-all text-center"
            >
              <span className={`text-lg transition-transform ${isActive ? 'scale-110' : 'opacity-70'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-black tracking-wide ${isActive ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}

export default App;
