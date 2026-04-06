import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

const STEPS = [
  { key: 'pending_review', label: 'Received' },
  { key: 'approved', label: 'Finance Review' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

function getStepIndex(status) {
  if (status === 'pending_review') return 0;
  if (status === 'approved' || status === 'awaiting_shipping') return 1;
  if (status === 'shipped') return 2;
  if (status === 'delivered') return 3;
  return -1; // denied
}

export default function ClaimStatus() {
  const [searchParams] = useSearchParams();
  const [tokenInput, setTokenInput] = useState(searchParams.get('token') || '');
  const [claim, setClaim] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStatus = async (token) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/claims/status/${token}`);
      setClaim(data);
    } catch (err) {
      setError(err.message);
      setClaim(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) fetchStatus(token);
  }, [searchParams]);

  const activeStep = claim ? getStepIndex(claim.status) : -1;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2">Claim Status</h1>
        <p className="text-gray-500 text-center text-sm mb-8">Check the status of your laptop claim</p>

        {!claim && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Your claim token</label>
            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your token here"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none mb-4"
            />
            <button
              onClick={() => fetchStatus(tokenInput)}
              disabled={loading || !tokenInput}
              className="w-full bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Status'}
            </button>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          </div>
        )}

        {claim && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Claim #{claim.id}</h2>
              <StatusBadge status={claim.status} />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Laptop</span>
                <span className="font-medium">{claim.laptop_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Price</span>
                <span>${parseFloat(claim.price_cad).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Program</span>
                <span>{claim.program_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Institution</span>
                <span>{claim.institution_name}</span>
              </div>
              {claim.tracking_number && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Carrier</span>
                    <span>{claim.carrier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tracking #</span>
                    <span className="font-mono">{claim.tracking_number}</span>
                  </div>
                </>
              )}
            </div>

            {claim.status !== 'denied' && (
              <div className="pt-4">
                <div className="flex items-center justify-between">
                  {STEPS.map((step, i) => (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          i <= activeStep
                            ? 'bg-black text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className="text-xs mt-1 text-gray-500">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {claim.status === 'denied' && (
              <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700">
                Your claim was not approved. Please contact admissions@mcgcc.ca for more information.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
