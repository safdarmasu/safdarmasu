import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config';

// Preset values for horizontal scroll selection wheels
const SPH_PRESETS = [0.00, 0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 3.25, 3.50, 3.75, 4.00, 4.50, 5.00, 5.50, 6.00];
const CYL_PRESETS = [0.00, 0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 3.50, 4.00];
const ADD_PRESETS = [0.00, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash', icon: '💵' },
  { value: 'UPI', label: 'UPI / QR', icon: '📱' },
  { value: 'Card', label: 'Card', icon: '💳' }
];

export default function CheckoutScreen({ setActiveTab }) {
  // 1. Customer profile details
  const [customer, setCustomer] = useState({
    name: '',
    phone: ''
  });

  // 2. Zero-Type Eye Prescription Matrix
  const [rx, setRx] = useState({
    right: { sphSign: '-', sphVal: 0.00, cylSign: '-', cylVal: 0.00, axis: 0, add: 0.00 },
    left: { sphSign: '-', sphVal: 0.00, cylSign: '-', cylVal: 0.00, axis: 0, add: 0.00 }
  });

  // Specifications
  const [specs, setSpecs] = useState({
    lensType: '',
    frameDetails: '',
    notes: ''
  });

  // 3. Billing state
  const [billing, setBilling] = useState({
    totalAmount: 0.00,
    advancePaid: 0.00,
    balanceDue: 0.00,
    paymentMethod: 'UPI'
  });

  // Active Eye selection tab for mobile collapse layouts
  const [activeEyeTab, setActiveEyeTab] = useState('right');

  // Database Integrations States
  const [inventory, setInventory] = useState([]);
  const [selectedFrameId, setSelectedFrameId] = useState('');
  const [selectedLensId, setSelectedLensId] = useState('');
  
  // Custom lens (Inventory Disconnection) input toggle
  const [isCustomLens, setIsCustomLens] = useState(false);
  const [customLensDetails, setCustomLensDetails] = useState({
    name: 'Custom Polycarbonate Progressive',
    price: 1500.00
  });

  const [searchStatus, setSearchStatus] = useState(''); // success / notfound / error / searching / idle
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Inventory on mount
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch(getApiUrl('/api/inventory'));
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (e) {
      console.error("Failed to fetch inventory", e);
    }
  };

  // Recalculate balance due in real time
  useEffect(() => {
    const total = parseFloat(billing.totalAmount) || 0;
    const advance = parseFloat(billing.advancePaid) || 0;
    const balance = parseFloat((total - advance).toFixed(2));
    
    setBilling(prev => ({
      ...prev,
      balanceDue: balance < 0 ? 0 : balance
    }));
  }, [billing.totalAmount, billing.advancePaid]);

  // Recalculate total amount when frame or lens selection changes
  useEffect(() => {
    const frame = inventory.find(i => i.id === selectedFrameId);
    let sum = 0;
    const updatedSpecs = { ...specs };
    
    if (frame) {
      sum += frame.price;
      updatedSpecs.frameDetails = `${frame.brand || ''} ${frame.modelNumber || ''} (${frame.color || ''})`.trim() || frame.name;
    }

    if (isCustomLens) {
      sum += parseFloat(customLensDetails.price) || 0;
      updatedSpecs.lensType = customLensDetails.name;
    } else {
      const lens = inventory.find(i => i.id === selectedLensId);
      if (lens) {
        sum += lens.price;
        updatedSpecs.lensType = lens.name;
      }
    }
    
    setSpecs(prev => ({
      ...prev,
      frameDetails: updatedSpecs.frameDetails,
      lensType: updatedSpecs.lensType
    }));
    
    setBilling(prev => ({
      ...prev,
      totalAmount: sum
    }));
  }, [selectedFrameId, selectedLensId, isCustomLens, customLensDetails.price, customLensDetails.name, inventory]);

  const handleBillingChange = (field, value) => {
    const numValue = value === '' ? '' : parseFloat(value);
    setBilling(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const applyPaymentPercent = (percent) => {
    const total = parseFloat(billing.totalAmount) || 0;
    const calculatedAdvance = parseFloat(((total * percent) / 100).toFixed(2));
    setBilling(prev => ({
      ...prev,
      advancePaid: calculatedAdvance
    }));
  };

  const handleCustomerSearch = async () => {
    if (!customer.phone.trim()) return;
    setSearchStatus('searching');
    try {
      const res = await fetch(getApiUrl(`/api/customers/search?phone=${encodeURIComponent(customer.phone.trim())}`));
      if (res.ok) {
        const data = await res.json();
        setCustomer({ name: data.name, phone: data.phone });
        setSearchStatus('success');
        
        // Auto-load past prescription data if available
        if (data.orders && data.orders.length > 0) {
          const lastOrder = data.orders[0];
          if (lastOrder.prescriptionData) {
            try {
              const parsedRx = JSON.parse(lastOrder.prescriptionData);
              setRx(parsedRx);
            } catch (e) {
              console.error("Error parsing prescription data", e);
            }
          }
        }
      } else if (res.status === 404) {
        setSearchStatus('notfound');
      } else {
        setSearchStatus('error');
      }
    } catch (e) {
      setSearchStatus('error');
    }
  };

  const handleCheckoutSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!customer.name.trim() || !customer.phone.trim()) {
      alert("Please fill in customer name and WhatsApp mobile number!");
      return;
    }

    const items = [];
    if (selectedFrameId) {
      items.push({ inventoryItemId: selectedFrameId, quantity: 1 });
    }

    if (isCustomLens) {
      // Inventory Disconnection logic: custom lens will be added auto
      items.push({
        isNew: true,
        type: 'LENS',
        name: customLensDetails.name,
        price: parseFloat(customLensDetails.price) || 0,
        quantity: 1
      });
    } else if (selectedLensId) {
      // Find selected lens to see if it needs stock auto-addition
      const lensObj = inventory.find(i => i.id === selectedLensId);
      items.push({
        inventoryItemId: selectedLensId,
        quantity: 1,
        // Backend handles auto-add if lens is out of stock
      });
    }

    if (items.length === 0) {
      alert("Please select a Frame or a Lens for this order!");
      return;
    }

    setIsSubmitting(true);
    const orderData = {
      customerPhone: customer.phone.trim(),
      customerName: customer.name.trim(),
      prescriptionData: rx,
      totalAmount: billing.totalAmount,
      advancePaid: billing.advancePaid,
      paymentMethod: billing.paymentMethod,
      items
    };

    try {
      const res = await fetch(getApiUrl('/api/orders/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const result = await res.json();
      if (res.ok) {
        alert(`Order Placed and Saved Successfully in MySQL!\nOrder ID: ${result.order.id}\nRemaining Balance: ₹${billing.balanceDue}`);
        
        // Reset form and jump to orders screen
        handleReset(true);
        setActiveTab('orders');
      } else {
        alert(`Database Transaction Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Network error connecting to API: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = (force = false) => {
    if (force || confirm("Reset current checkout screen?")) {
      setCustomer({ name: '', phone: '' });
      setRx({
        right: { sphSign: '-', sphVal: 0.00, cylSign: '-', cylVal: 0.00, axis: 0, add: 0.00 },
        left: { sphSign: '-', sphVal: 0.00, cylSign: '-', cylVal: 0.00, axis: 0, add: 0.00 }
      });
      setSpecs({
        lensType: '',
        frameDetails: '',
        notes: ''
      });
      setBilling({
        totalAmount: 0.00,
        advancePaid: 0.00,
        balanceDue: 0.00,
        paymentMethod: 'UPI'
      });
      setSelectedFrameId('');
      setSelectedLensId('');
      setIsCustomLens(false);
      setSearchStatus('');
    }
  };

  // Preset wheel renderer
  const PrescriptionWheel = ({ label, signKey, valKey, eye, presets, hasSign = false }) => {
    const currentEyeRx = rx[eye];
    const selectedVal = currentEyeRx[valKey];
    const selectedSign = hasSign ? currentEyeRx[signKey] : '';

    const handleSignToggle = () => {
      const nextSign = selectedSign === '+' ? '-' : '+';
      setRx(prev => ({
        ...prev,
        [eye]: { ...prev[eye], [signKey]: nextSign }
      }));
    };

    const handleValSelect = (val) => {
      setRx(prev => ({
        ...prev,
        [eye]: { ...prev[eye], [valKey]: val }
      }));
    };

    const handleStep = (increment) => {
      const currentIndex = presets.indexOf(selectedVal);
      if (currentIndex === -1) return;
      const nextIndex = Math.min(Math.max(currentIndex + increment, 0), presets.length - 1);
      handleValSelect(presets[nextIndex]);
    };

    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-3">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => handleStep(-1)}
              type="button" 
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold active:bg-slate-100 transition-all text-xs"
            >
              ▼
            </button>
            <span className="text-xs font-extrabold text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-xs min-w-[3.5rem] text-center">
              {hasSign ? selectedSign : ''}{selectedVal.toFixed ? selectedVal.toFixed(2) : selectedVal}
            </span>
            <button 
              onClick={() => handleStep(1)}
              type="button" 
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold active:bg-slate-100 transition-all text-xs"
            >
              ▲
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {hasSign && (
            <button
              type="button"
              onClick={handleSignToggle}
              className={`flex-none w-10 h-10 rounded-xl font-extrabold border transition-all text-base active:scale-95 flex items-center justify-center ${
                selectedSign === '+'
                  ? 'bg-rose-500 border-rose-600 text-white'
                  : 'bg-indigo-600 border-indigo-700 text-white'
              }`}
            >
              {selectedSign}
            </button>
          )}

          <div className="flex-1 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex gap-1.5 px-0.5">
              {presets.map((preset) => {
                const isSelected = selectedVal === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleValSelect(preset)}
                    className={`flex-none w-12 h-10 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center justify-center ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white font-extrabold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {preset.toFixed ? preset.toFixed(2) : preset}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEyePrescriptionGroup = (eyeTitle, eyeKey) => {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs">
        <h3 className="text-xs font-black text-slate-800 mb-3 border-b border-slate-100 pb-2 uppercase tracking-wide flex justify-between items-center">
          <span>{eyeTitle}</span>
          <span className="text-[10px] text-indigo-600 px-3 py-1 rounded-full bg-indigo-50 font-extrabold">
            {eyeKey === 'right' ? 'RIGHT EYE (OD)' : 'LEFT EYE (OS)'}
          </span>
        </h3>
        <div className="space-y-3">
          <PrescriptionWheel label="Sphere (SPH)" signKey="sphSign" valKey="sphVal" eye={eyeKey} presets={SPH_PRESETS} hasSign={true} />
          <PrescriptionWheel label="Cylinder (CYL)" signKey="cylSign" valKey="cylVal" eye={eyeKey} presets={CYL_PRESETS} hasSign={true} />
          
          {/* AXIS selection */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Axis (AXIS°)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="180"
                value={rx[eyeKey].axis}
                onChange={(e) => {
                  const val = Math.min(Math.max(parseInt(e.target.value) || 0, 0), 180);
                  setRx(prev => ({ ...prev, [eyeKey]: { ...prev[eyeKey], axis: val } }));
                }}
                className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-extrabold text-slate-800 text-center focus:outline-none focus:border-indigo-500"
              />
              <div className="flex-1 overflow-x-auto no-scrollbar flex gap-1">
                {[0, 45, 90, 135, 180].map((anglePreset) => (
                  <button
                    key={anglePreset}
                    type="button"
                    onClick={() => setRx(prev => ({ ...prev, [eyeKey]: { ...prev[eyeKey], axis: anglePreset } }))}
                    className={`flex-1 min-w-[2.25rem] h-8 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                      rx[eyeKey].axis === anglePreset
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {anglePreset}°
                  </button>
                ))}
              </div>
            </div>
          </div>

          <PrescriptionWheel label="Addition (ADD)" valKey="add" eye={eyeKey} presets={ADD_PRESETS} hasSign={false} />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl w-full mx-auto bg-slate-50 rounded-b-3xl relative flex flex-col pb-24 lg:pb-8 overflow-hidden font-sans select-none">
      
      {/* HEADER BAR */}
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-5 py-6 lg:px-8 rounded-b-[2rem] shadow-lg flex-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full uppercase">
              OPTISOFT POS
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-1">Checkout & New Sale</h1>
          <p className="text-xs text-indigo-100 mt-0.5">Input customer info, zero-type Rx, and complete the bill</p>
        </div>
      </header>

      {/* CORE BODY WRAPPER */}
      <div className="flex-1 px-4 py-6 lg:p-8 space-y-6">

        {/* CUSTOMER DETAILS & PRESCRIPTION LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: CUSTOMER HEADER & PRESCRIPTION GRID */}
          <main className="lg:col-span-7 xl:col-span-8 space-y-6">

            {/* CUSTOMER PROFILE HEADER CARD WITH INSTANT SEARCH */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 lg:p-6 shadow-xs">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                👤 Customer Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">WhatsApp Phone Number</label>
                  <div className="relative flex gap-2">
                    <input
                      type="text"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 font-mono focus:outline-none focus:border-indigo-500 placeholder-slate-400"
                      placeholder="e.g., +919876543210"
                    />
                    <button
                      type="button"
                      onClick={handleCustomerSearch}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center shrink-0"
                    >
                      {searchStatus === 'searching' ? '...' : 'Find'}
                    </button>
                  </div>
                  {searchStatus === 'success' && <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Customer found! Loaded last prescription.</p>}
                  {searchStatus === 'notfound' && <p className="text-[10px] text-amber-600 font-bold mt-1">ℹ New profile will be created.</p>}
                  {searchStatus === 'error' && <p className="text-[10px] text-rose-600 font-bold mt-1">⚠ Search failed.</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-400"
                    placeholder="Customer Name"
                  />
                </div>
              </div>
            </div>

            {/* PRESCRIPTION ENTRY MATRIX GRID */}
            <div>
              <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  👁️ Zero-Type Prescription Matrix
                </h2>
                <span className="text-[9px] text-slate-400 font-bold bg-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  No Keyboard Required
                </span>
              </div>

              {/* Side-by-side eyes on Desktop view */}
              <div className="hidden lg:grid lg:grid-cols-2 gap-4">
                {renderEyePrescriptionGroup('Right Eye (OD)', 'right')}
                {renderEyePrescriptionGroup('Left Eye (OS)', 'left')}
              </div>

              {/* Tabbed eye layout for mobile viewport */}
              <div className="lg:hidden space-y-4">
                <div className="flex rounded-2xl bg-slate-200/70 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveEyeTab('right')}
                    className={`flex-1 text-center py-2.5 rounded-xl text-xs font-black transition-all ${
                      activeEyeTab === 'right'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-600'
                    }`}
                  >
                    Right Eye (OD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEyeTab('left')}
                    className={`flex-1 text-center py-2.5 rounded-xl text-xs font-black transition-all ${
                      activeEyeTab === 'left'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-600'
                    }`}
                  >
                    Left Eye (OS)
                  </button>
                </div>
                {renderEyePrescriptionGroup(activeEyeTab === 'right' ? 'Right Eye (OD)' : 'Left Eye (OS)', activeEyeTab)}
              </div>

              {/* LIVE VIEW PREVIEW MATRIX */}
              <div className="mt-4 bg-indigo-50/50 border border-indigo-100 rounded-3xl p-4">
                <div className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-2 text-center">
                  Live Prescription Output
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono text-center">
                  <div className="border-r border-indigo-100">
                    <span className="font-extrabold text-slate-500 block text-[8px] uppercase tracking-wider mb-0.5">O.D. (Right)</span>
                    <span className="font-black text-indigo-950 text-sm">
                      {rx.right.sphSign}{rx.right.sphVal.toFixed(2)} / {rx.right.cylSign}{rx.right.cylVal.toFixed(2)} x {rx.right.axis}°
                      <span className="block text-[9px] text-slate-500 font-sans font-bold mt-0.5">Add: +{rx.right.add.toFixed(2)}</span>
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-500 block text-[8px] uppercase tracking-wider mb-0.5">O.S. (Left)</span>
                    <span className="font-black text-indigo-950 text-sm">
                      {rx.left.sphSign}{rx.left.sphVal.toFixed(2)} / {rx.left.cylSign}{rx.left.cylVal.toFixed(2)} x {rx.left.axis}°
                      <span className="block text-[9px] text-slate-500 font-sans font-bold mt-0.5">Add: +{rx.left.add.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* INVENTORY SELECTIONS & ADDITIONAL OPTICAL SPECS */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 lg:p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                📦 Products Selection
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Frame</label>
                  <select
                    value={selectedFrameId}
                    onChange={(e) => setSelectedFrameId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Choose Frame --</option>
                    {inventory.filter(i => i.type === 'FRAME').map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.brand ? `[${item.brand}]` : ''} - ₹{item.price} (Stock: {item.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Lens</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomLens(!isCustomLens)}
                      className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded"
                    >
                      {isCustomLens ? "Use Inventory Lens" : "Add Custom/Out-Of-Stock Lens"}
                    </button>
                  </div>
                  
                  {isCustomLens ? (
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <input
                        type="text"
                        value={customLensDetails.name}
                        onChange={(e) => setCustomLensDetails({ ...customLensDetails, name: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                        placeholder="Lens Name/Description"
                      />
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          value={customLensDetails.price}
                          onChange={(e) => setCustomLensDetails({ ...customLensDetails, price: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-bold text-slate-800"
                          placeholder="Price"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold">⚠️ Lens will be auto-added to inventory & sold</p>
                    </div>
                  ) : (
                    <select
                      value={selectedLensId}
                      onChange={(e) => setSelectedLensId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Choose Lens --</option>
                      {inventory.filter(i => i.type === 'LENS').map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} - ₹{item.price} (Stock: {item.stock})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Additional Order Notes</label>
                <textarea
                  value={specs.notes}
                  onChange={(e) => setSpecs({ ...specs, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  placeholder="Polishing requirements, frame fitting notes, express turnaround..."
                  rows={2}
                />
              </div>
            </div>

          </main>

          {/* RIGHT COLUMN: SPLIT CHECKOUT BLOCK (STICKY SIDEBAR) */}
          <aside className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6 lg:self-start">
            
            {/* SPLIT CHECKOUT BILLING BLOCK */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-[2.2rem] p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/15 via-transparent to-transparent"></div>
              
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2 mb-4 relative z-10">
                💰 Two-Table Billing (Split)
              </h2>

              <div className="space-y-4 relative z-10">
                
                {/* Total amount */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bill Amount</label>
                    <span className="text-[9px] font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-md">₹ (INR)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">₹</span>
                    <input 
                      type="number"
                      step="1"
                      min="0"
                      value={billing.totalAmount}
                      onChange={(e) => handleBillingChange('totalAmount', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xl font-black text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Advance Deposit */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Advance Deposit Paid</label>
                    <div className="flex gap-1">
                      {[30, 50, 100].map(pct => (
                        <button 
                          key={pct}
                          type="button" 
                          onClick={() => applyPaymentPercent(pct)}
                          className="text-[9px] font-bold text-indigo-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
                        >
                          {pct === 100 ? 'Full' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">₹</span>
                    <input 
                      type="number" 
                      step="1"
                      min="0"
                      max={billing.totalAmount}
                      value={billing.advancePaid}
                      onChange={(e) => handleBillingChange('advancePaid', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xl font-black text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Payment Method Selector Grid */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Deposit Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = billing.paymentMethod === method.value;
                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setBilling({ ...billing, paymentMethod: method.value })}
                          className={`py-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-white text-slate-900 border-white shadow-md'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-sm">{method.icon}</span>
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-white/10 my-3"></div>

                {/* Remaining Balance Due */}
                <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Remaining Balance Due</span>
                    {billing.balanceDue === 0 ? (
                      <span className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-2 py-0.5 rounded mt-1 uppercase tracking-wider">
                        Settle Paid
                      </span>
                    ) : (
                      <span className="inline-block bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black px-2 py-0.5 rounded mt-1 uppercase tracking-wider">
                        Pending Due
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-black tracking-tight ${
                      billing.balanceDue === 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      ₹{billing.balanceDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Actions Block */}
            <div className="hidden lg:flex flex-col gap-2.5 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
              <button
                type="button"
                onClick={handleCheckoutSubmit}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold py-3.5 rounded-2xl shadow-md hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save & Create Order"}
              </button>
              <button
                type="button"
                onClick={() => handleReset()}
                className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 active:scale-95 transition-all text-xs text-center"
              >
                Reset Billing Form
              </button>
            </div>

          </aside>

        </div>
      </div>

      {/* Mobile Actions Drawer Footer */}
      <footer className="lg:hidden fixed bottom-14 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 px-5 py-3.5 flex gap-3 z-10 shadow-2xl">
        <button
          type="button"
          onClick={() => handleReset()}
          className="flex-none px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 active:scale-95 transition-all text-xs"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleCheckoutSubmit}
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold py-3.5 rounded-2xl shadow-md hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save & Create Order"}
        </button>
      </footer>

      {/* Scrollbar styling */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
