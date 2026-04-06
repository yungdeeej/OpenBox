import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

const ORDER_TABS = [
  { key: '', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'awaiting_shipping', label: 'Awaiting Shipping' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [laptops, setLaptops] = useState([]);
  const [showSection, setShowSection] = useState('orders'); // 'orders' | 'catalog'

  // Shipping modal
  const [shipModal, setShipModal] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  // Add laptop form
  const [laptopForm, setLaptopForm] = useState({
    name: '', brand: '', model: '', specs: '', price_cad: '', stock_available: '', image_url: ''
  });
  const [laptopMsg, setLaptopMsg] = useState('');

  const fetchOrders = async () => {
    try {
      const data = await api.get(`/vendor/orders${activeTab ? `?status=${activeTab}` : ''}`);
      setOrders(data);
    } catch (err) {
      if (err.message.includes('401')) { localStorage.clear(); navigate('/login'); }
    }
  };

  const fetchLaptops = async () => {
    try {
      const data = await api.get('/laptops');
      setLaptops(data);
    } catch {}
  };

  useEffect(() => { fetchOrders(); }, [activeTab]);
  useEffect(() => { fetchLaptops(); }, []);

  const handleSendShippingForm = async (orderId) => {
    try {
      await api.post(`/vendor/orders/${orderId}/send-shipping-form`);
      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleShip = async () => {
    try {
      await api.post(`/vendor/orders/${shipModal}/ship`, {
        tracking_number: trackingNumber, carrier
      });
      setShipModal(null);
      setTrackingNumber('');
      setCarrier('');
      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeliver = async (orderId) => {
    try {
      await api.post(`/vendor/orders/${orderId}/deliver`);
      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddLaptop = async (e) => {
    e.preventDefault();
    setLaptopMsg('');
    try {
      await api.post('/laptops', {
        ...laptopForm,
        price_cad: parseFloat(laptopForm.price_cad),
        stock_available: parseInt(laptopForm.stock_available),
      });
      setLaptopForm({ name: '', brand: '', model: '', specs: '', price_cad: '', stock_available: '', image_url: '' });
      setLaptopMsg('Laptop added!');
      fetchLaptops();
    } catch (err) {
      setLaptopMsg(`Error: ${err.message}`);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const data = await api.upload('/laptops/upload-image', formData);
      setLaptopForm((prev) => ({ ...prev, image_url: data.url }));
    } catch (err) {
      alert('Image upload failed: ' + err.message);
    }
  };

  const handleToggleLaptop = async (laptop) => {
    try {
      await api.put(`/laptops/${laptop.id}`, { ...laptop, active: !laptop.active });
      fetchLaptops();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold">OpenBox Vendor Portal</h1>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setShowSection('orders')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium ${showSection === 'orders' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            >
              Orders
            </button>
            <button
              onClick={() => setShowSection('catalog')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium ${showSection === 'catalog' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            >
              Catalog
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{localStorage.getItem('name')}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-black">Sign out</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Orders Section */}
        {showSection === 'orders' && (
          <>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
              {ORDER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key ? 'bg-white shadow-sm text-black' : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">Claim #{order.id} — {order.student_name}</h3>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.laptop_name} ({order.brand} {order.model}) — ${parseFloat(order.price_cad).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {order.institution_name} | {order.program_name} | Approved: {order.reviewed_at ? new Date(order.reviewed_at).toLocaleDateString('en-CA') : 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'approved' && (
                        <button
                          onClick={() => handleSendShippingForm(order.id)}
                          className="bg-black text-white rounded-xl px-4 py-2 text-xs font-medium hover:bg-gray-800"
                        >
                          Send Shipping Form
                        </button>
                      )}
                      {(order.status === 'awaiting_shipping' || order.status === 'approved') && (
                        <button
                          onClick={() => setShipModal(order.id)}
                          className="border border-gray-300 rounded-xl px-4 py-2 text-xs font-medium hover:bg-gray-50"
                        >
                          Mark Shipped
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button
                          onClick={() => handleDeliver(order.id)}
                          className="border border-green-300 text-green-700 rounded-xl px-4 py-2 text-xs font-medium hover:bg-green-50"
                        >
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                  {order.tracking_number && (
                    <p className="text-xs text-gray-500">
                      Tracking: {order.carrier} — {order.tracking_number}
                    </p>
                  )}
                </div>
              ))}
              {orders.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                  No orders found
                </div>
              )}
            </div>
          </>
        )}

        {/* Catalog Section */}
        {showSection === 'catalog' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Add New Laptop</h2>
              <form onSubmit={handleAddLaptop} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    value={laptopForm.name}
                    onChange={(e) => setLaptopForm({ ...laptopForm, name: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    value={laptopForm.brand}
                    onChange={(e) => setLaptopForm({ ...laptopForm, brand: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    value={laptopForm.model}
                    onChange={(e) => setLaptopForm({ ...laptopForm, model: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (CAD, max $500)</label>
                  <input
                    type="number"
                    step="0.01"
                    max="500"
                    value={laptopForm.price_cad}
                    onChange={(e) => setLaptopForm({ ...laptopForm, price_cad: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={laptopForm.stock_available}
                    onChange={(e) => setLaptopForm({ ...laptopForm, stock_available: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-sm text-gray-500"
                  />
                  {laptopForm.image_url && <p className="text-xs text-green-600 mt-1">Image uploaded</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specs</label>
                  <textarea
                    value={laptopForm.specs}
                    onChange={(e) => setLaptopForm({ ...laptopForm, specs: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none resize-none"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-4">
                  <button
                    type="submit"
                    className="bg-black text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-gray-800"
                  >
                    Add Laptop
                  </button>
                  {laptopMsg && (
                    <p className={`text-sm ${laptopMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                      {laptopMsg}
                    </p>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Laptop Catalog</h2>
              <div className="space-y-3">
                {laptops.map((laptop) => (
                  <div key={laptop.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-4">
                      {laptop.image_url ? (
                        <img src={laptop.image_url} alt={laptop.name} className="w-16 h-12 object-cover rounded-lg" />
                      ) : (
                        <div className="w-16 h-12 bg-gray-100 rounded-lg" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{laptop.name}</p>
                        <p className="text-xs text-gray-500">{laptop.brand} {laptop.model} — ${parseFloat(laptop.price_cad).toFixed(2)} — Stock: {laptop.stock_available}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleLaptop(laptop)}
                      className={`text-xs px-3 py-1 rounded-lg font-medium ${
                        laptop.active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {laptop.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
                {laptops.length === 0 && (
                  <p className="text-center text-gray-400 py-4">No laptops in catalog</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ship Modal */}
      {shipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Mark as Shipped</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                <input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. Canada Post, FedEx, UPS"
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShipModal(null); setTrackingNumber(''); setCarrier(''); }}
                  className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShip}
                  disabled={!trackingNumber || !carrier}
                  className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  Confirm Ship
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
