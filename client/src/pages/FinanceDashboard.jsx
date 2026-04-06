import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import ClaimTable from '../components/ClaimTable';

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending_review', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'denied', label: 'Denied' },
  { key: 'shipped', label: 'Shipped' },
];

export default function FinanceDashboard() {
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenEmail, setTokenEmail] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenMsg, setTokenMsg] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [claimsData, statsData] = await Promise.all([
        api.get(`/admin/claims${activeTab ? `?status=${activeTab}` : ''}`),
        api.get('/admin/stats'),
      ]);
      setClaims(claimsData);
      setStats(statsData);
    } catch (err) {
      if (err.message.includes('Unauthorized') || err.message.includes('401')) {
        localStorage.clear();
        navigate('/login');
      }
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    setTokenLoading(true);
    setTokenMsg('');
    try {
      await api.post('/tokens/generate', { student_email: tokenEmail, institution_id: 1 });
      setTokenMsg('Token sent successfully!');
      setTokenEmail('');
    } catch (err) {
      setTokenMsg(`Error: ${err.message}`);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Finance Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{localStorage.getItem('name')}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-black">Sign out</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold">{stats.pending || 0}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold">{stats.approved || 0}</p>
            <p className="text-xs text-gray-500">Approved</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold">{stats.denied || 0}</p>
            <p className="text-xs text-gray-500">Denied</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold">{stats.shipped || 0}</p>
            <p className="text-xs text-gray-500">Shipped</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold">${parseFloat(stats.total_committed || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500">Total Committed</p>
          </div>
        </div>

        {/* Tabs + Token button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTokenModal(true)}
            className="bg-black text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Generate Token
          </button>
        </div>

        {/* Claims Table */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <ClaimTable claims={claims} />
        </div>
      </div>

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Generate Claim Token</h2>
            <form onSubmit={handleGenerateToken} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Email</label>
                <input
                  type="email"
                  value={tokenEmail}
                  onChange={(e) => setTokenEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>
              {tokenMsg && (
                <p className={`text-sm ${tokenMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {tokenMsg}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowTokenModal(false); setTokenMsg(''); }}
                  className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tokenLoading}
                  className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {tokenLoading ? 'Sending...' : 'Send Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
