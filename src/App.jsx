import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import CheckoutScreen from './components/CheckoutScreen';
import OrdersScreen from './components/OrdersScreen';
import CustomersScreen from './components/CustomersScreen';
import InventoryScreen from './components/InventoryScreen';
import { getApiUrl } from './config';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiConnected, setApiConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch(getApiUrl('/api/inventory'));
        if (res.ok) {
          setApiConnected(true);
        } else {
          setApiConnected(false);
        }
      } catch (e) {
        setApiConnected(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkConnection();
    // Re-check every 15 seconds to auto-recover if backend starts
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

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
        {!apiConnected && !isChecking && (
          <div className="max-w-6xl w-full mx-auto px-4 pt-6">
            <div className="bg-rose-50 border border-rose-200/60 text-rose-800 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-950">Database Connection Failed</h3>
              </div>
              
              <p className="text-xs font-semibold text-rose-800/90 leading-relaxed">
                The OPTISOFT app cannot reach the database server at <code className="bg-white border border-rose-200 px-2 py-0.5 rounded-lg font-mono text-rose-950 font-black">{getApiUrl()}</code>. 
                Because your database is hosted locally on the main shop PC, other devices (mobile/tablet) cannot connect to it using the cloud Vercel URL.
              </p>

              <div className="bg-white/80 rounded-2xl p-4 border border-rose-200/40 text-xs space-y-3 text-slate-700 font-medium">
                <p className="font-extrabold text-slate-800">Please follow these steps to connect this device:</p>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 pl-1">
                  <li>Ensure the main Windows PC is turned on and running the backend server (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-600 font-bold">npm run server</code>).</li>
                  <li>Ensure this device (mobile/tablet) is connected to the **same Wi-Fi network** as the PC.</li>
                  <li>Open the PC's local Wi-Fi address in your browser: <a href="http://10.90.85.155:5173/" className="font-extrabold text-indigo-600 hover:underline">http://10.90.85.155:5173/</a></li>
                  <li>If it still fails, run these commands in **PowerShell (as Administrator)** on the main PC to allow connections through the firewall:
                    <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl mt-2 overflow-x-auto font-mono text-[10px] select-all leading-normal">
{`New-NetFirewallRule -DisplayName "OPTISOFT Vite Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "OPTISOFT Node API Server" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow`}
                    </pre>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
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
