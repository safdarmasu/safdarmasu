import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config';

const STATUS_OPTS = [
  { value: 'Placed', label: 'Placed', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { value: 'In_Lab', label: 'In Lab', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { value: 'Ready_For_Pickup', label: 'Ready', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'Completed', label: 'Completed', bg: 'bg-green-700 text-white border-green-800', dot: 'bg-white' },
];

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(getApiUrl('/api/orders'));
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        // Refresh selected order modal if open
        if (selectedOrder) {
          const updated = data.find(o => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (e) {
      console.error("Error fetching orders", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await fetch(getApiUrl(`/api/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        alert(`Status updated to "${newStatus}"`);
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Error updating status: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive payment amount!");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch(getApiUrl(`/api/orders/${selectedOrder.id}/payments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: amount,
          paymentMethod,
          notes: paymentNotes
        })
      });

      if (res.ok) {
        alert("Payment logged successfully!");
        setPaymentAmount('');
        setPaymentNotes('');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Error logging payment: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const generateWhatsAppUrl = (order) => {
    const cleanPhone = order.customer.phone.replace(/[^\d+]/g, '');
    let text = "";
    if (order.status === 'Ready_For_Pickup') {
      text = `Hi ${order.customer.name}, your glasses are ready for pickup at OPTISOFT! Your remaining balance is ₹${order.balanceDue.toFixed(2)}. See you soon!`;
    } else if (order.status === 'Completed') {
      text = `Hi ${order.customer.name}, thank you for choosing OPTISOFT! Your order is completed and settled. Have a wonderful day!`;
    } else {
      text = `Hi ${order.customer.name}, your optical order status is now "${order.status.replace('_', ' ')}". Total bill: ₹${order.totalAmount}. Thank you, OPTISOFT!`;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
      
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">🧾 Orders & Billing Logs</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Manage active customer orders, update lifecycles, log payments, and send WhatsApp alerts
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 font-black border-b border-slate-100">
                <th className="px-5 py-4">Order Details</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Financials</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                    No orders found. Go to "Checkout" to place a new order!
                  </td>
                </tr>
              ) : (
                orders.map(order => {
                  const statusConf = STATUS_OPTS.find(o => o.value === order.status) || STATUS_OPTS[0];
                  const rxData = JSON.parse(order.prescriptionData);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4.5">
                        <span className="text-xs font-mono font-black text-indigo-600 block">
                          # {order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-4.5">
                        <span className="text-sm font-extrabold text-slate-800 block">{order.customer.name}</span>
                        <span className="text-xs font-mono font-medium text-slate-400 block mt-0.5">{order.customer.phone}</span>
                      </td>
                      <td className="px-5 py-4.5">
                        <span className="text-sm font-black text-slate-800 block">₹{order.totalAmount}</span>
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                          Paid: ₹{order.advancePaid} • Due: <span className={order.balanceDue > 0 ? "text-rose-500 font-black" : "text-emerald-500"}>₹{order.balanceDue}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase ${statusConf.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`}></span>
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-5 py-4.5 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-4 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-xl transition-all"
                        >
                          👁️ View & Log Payments
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED ORDER CARD MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[9px] font-mono font-black text-indigo-500 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase">
                  Order Details # {selectedOrder.id.slice(0, 8).toUpperCase()}
                </span>
                <h2 className="text-xl font-black text-slate-800 mt-1">{selectedOrder.customer.name}</h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="bg-slate-50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-500">
                Current Status: <span className="font-extrabold text-slate-800">{selectedOrder.status.replace('_', ' ')}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {['Placed', 'In_Lab', 'Ready_For_Pickup', 'Completed'].map(status => {
                  const isActive = selectedOrder.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(selectedOrder.id, status)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {status === 'Ready_For_Pickup' ? 'Ready' : status.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* WhatsApp notification trigger */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="text-xs text-emerald-800 font-medium">
                📱 Send order update message to client via WhatsApp
              </div>
              <a
                href={generateWhatsAppUrl(selectedOrder)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1 shadow-sm"
              >
                💬 WhatsApp
              </a>
            </div>

            {/* Eye Prescription Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Prescription Grid</h3>
              {(() => {
                const rx = JSON.parse(selectedOrder.prescriptionData);
                return (
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-mono text-center">
                    <div className="border-r border-slate-200">
                      <span className="font-bold text-slate-400 block text-[9px] uppercase">O.D. (Right)</span>
                      <span className="font-black text-indigo-950 block mt-1 text-sm">
                        {rx.right.sphSign}{rx.right.sphVal.toFixed(2)} / {rx.right.cylSign}{rx.right.cylVal.toFixed(2)} x {rx.right.axis}°
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-sans font-bold">Add: +{rx.right.add.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block text-[9px] uppercase">O.S. (Left)</span>
                      <span className="font-black text-indigo-950 block mt-1 text-sm">
                        {rx.left.sphSign}{rx.left.sphVal.toFixed(2)} / {rx.left.cylSign}{rx.left.cylVal.toFixed(2)} x {rx.left.axis}°
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-sans font-bold">Add: +{rx.left.add.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Products & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sold Items</h4>
                <div className="mt-2 space-y-1">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="text-xs font-bold text-slate-700">
                      • {item.inventoryItem.name} (x{item.quantity})
                      {item.inventoryItem.brand && <span className="text-[10px] text-slate-400 font-medium block ml-2">Brand: {item.inventoryItem.brand} | Model: {item.inventoryItem.modelNumber}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Order Notes</h4>
                <p className="text-xs text-slate-600 font-bold mt-2 italic">
                  {selectedOrder.notes || "No extra order specifications."}
                </p>
              </div>
            </div>

            {/* Two-Table Billing Payment Logs */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Table B - Payments Log</h3>
                <span className="text-xs font-black text-slate-700">
                  Remaining Due: <span className={selectedOrder.balanceDue > 0 ? "text-rose-500 animate-pulse font-black" : "text-emerald-500"}>₹{selectedOrder.balanceDue}</span>
                </span>
              </div>

              {/* Payments History List */}
              <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar">
                {selectedOrder.payments.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold italic">No payments logged yet.</p>
                ) : (
                  selectedOrder.payments.map(log => (
                    <div key={log.id} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                      <div>
                        <span className="font-extrabold text-slate-700 block">₹{log.amountPaid}</span>
                        <span className="text-[10px] text-slate-400 font-bold block">{new Date(log.paymentDate).toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                          {log.paymentMethod}
                        </span>
                        {log.notes && <span className="block text-[9px] text-slate-400 italic font-bold mt-0.5">{log.notes}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Payment Form */}
              {selectedOrder.balanceDue > 0 && (
                <form onSubmit={handleAddPayment} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Log New Payment Receipt</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedOrder.balanceDue}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                        placeholder={`Max ₹${selectedOrder.balanceDue}`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-800"
                      >
                        <option value="UPI">UPI / QR</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes / Ref</label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                        placeholder="Transaction note"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-extrabold py-2.5 rounded-xl transition-all"
                  >
                    {isSubmittingPayment ? "Registering..." : "Submit Receipt & Reduce Balance"}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
