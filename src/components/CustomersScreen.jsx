import React, { useState, useEffect } from 'react';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (e) {
      console.error("Error fetching customers", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomerDetail = async (cPhone) => {
    try {
      const res = await fetch(`http://localhost:5000/api/customers/search?phone=${encodeURIComponent(cPhone)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomer(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(query) || c.phone.includes(query);
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
      
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">👤 Customer Cards & Directory</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Search customer records, historical prescription matrices, and financial status
          </p>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-xs"
            placeholder="🔍 Search by name or phone..."
          />
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-100 font-bold text-slate-400">
            No customer profiles match your search query.
          </div>
        ) : (
          filteredCustomers.map(c => (
            <div
              key={c.id}
              onClick={() => handleSelectCustomerDetail(c.phone)}
              className="bg-white hover:border-indigo-100 hover:shadow-md border border-slate-100 rounded-3xl p-5 shadow-xs transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  {c.totalBalanceDue > 0 && (
                    <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                      ₹{c.totalBalanceDue} Due
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-800 mt-3">{c.name}</h3>
                <span className="text-xs font-mono font-medium text-slate-400 block mt-0.5">{c.phone}</span>
              </div>

              <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center text-[10px] font-bold text-slate-400">
                <div>
                  <span className="block uppercase">Total Orders</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5 block">{c.totalOrders}</span>
                </div>
                <div>
                  <span className="block uppercase text-right">Total Spent</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5 block text-right">₹{c.totalAmountSpent}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CUSTOMER CARD DETAILED MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">Customer Profile Card</span>
                <h2 className="text-xl font-black text-slate-800 mt-1">{selectedCustomer.name}</h2>
                <span className="text-xs font-mono font-medium text-slate-400 mt-0.5 block">Phone: {selectedCustomer.phone}</span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Prescriptions History Tab/Block */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Prescription History</h3>
              {selectedCustomer.orders.length === 0 || !selectedCustomer.orders[0].prescriptionData ? (
                <p className="text-xs text-slate-400 font-bold italic">No prescription records found.</p>
              ) : (
                <div className="space-y-4">
                  {selectedCustomer.orders.map((o, idx) => {
                    const rx = JSON.parse(o.prescriptionData);
                    return (
                      <div key={o.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Order Date: {new Date(o.orderDate).toLocaleDateString()}</span>
                          <span className="text-indigo-600">Rx Record {selectedCustomer.orders.length - idx}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono text-center">
                          <div className="border-r border-slate-200">
                            <span className="font-bold text-slate-400 block text-[9px] uppercase">O.D. (Right Eye)</span>
                            <span className="font-black text-indigo-950 block mt-1">
                              {rx.right.sphSign}{rx.right.sphVal.toFixed(2)} / {rx.right.cylSign}{rx.right.cylVal.toFixed(2)} x {rx.right.axis}°
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5 font-sans font-bold">Add: +{rx.right.add.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block text-[9px] uppercase">O.S. (Left Eye)</span>
                            <span className="font-black text-indigo-950 block mt-1">
                              {rx.left.sphSign}{rx.left.sphVal.toFixed(2)} / {rx.left.cylSign}{rx.left.cylVal.toFixed(2)} x {rx.left.axis}°
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5 font-sans font-bold">Add: +{rx.left.add.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Product purchase history */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Purchased Products</h3>
              <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                {selectedCustomer.orders.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold italic">No orders logged.</p>
                ) : (
                  selectedCustomer.orders.map(o => (
                    <div key={o.id} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                      <div>
                        {o.items.map(item => (
                          <span key={item.id} className="font-extrabold text-slate-700 block">
                            • {item.inventoryItem.name} {item.inventoryItem.brand ? `(${item.inventoryItem.brand})` : ''}
                          </span>
                        ))}
                        <span className="text-[9px] text-slate-400 font-bold block mt-1">
                          Date: {new Date(o.orderDate).toLocaleDateString()} • Order # {o.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-800 block">₹{o.totalAmount}</span>
                        <span className={`text-[9px] font-black uppercase block mt-1 ${
                          o.balanceDue > 0 ? "text-rose-500" : "text-emerald-500"
                        }`}>
                          {o.balanceDue > 0 ? `₹${o.balanceDue} Due` : "Settled"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
