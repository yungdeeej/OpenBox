import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/admin/claims/${id}`).then(setClaim).catch(() => navigate('/admin'));
  }, [id]);

  const handleApprove = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api.post(`/admin/claims/${id}/approve`, { notes });
      setClaim(data.claim);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!notes.trim()) {
      setError('Denial reason is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post(`/admin/claims/${id}/deny`, { notes });
      const updated = await api.get(`/admin/claims/${id}`);
      setClaim(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!claim) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-sm text-gray-500 hover:text-black">
            &larr; Back
          </button>
          <h1 className="text-lg font-bold">Claim #{claim.id}</h1>
          <StatusBadge status={claim.status} />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Student Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Student Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name</span>
              <p className="font-medium">{claim.student_name}</p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="font-medium">{claim.student_email}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone</span>
              <p className="font-medium">{claim.student_phone || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Student ID</span>
              <p className="font-medium">{claim.student_id_number || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Program</span>
              <p className="font-medium">{claim.program_name}</p>
            </div>
            <div>
              <span className="text-gray-500">Institution</span>
              <p className="font-medium">{claim.institution_name}</p>
            </div>
          </div>
        </div>

        {/* Laptop Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Laptop Selected</h2>
          <div className="flex gap-6">
            {claim.image_url ? (
              <img src={claim.image_url} alt={claim.laptop_name} className="w-32 h-24 object-cover rounded-lg" />
            ) : (
              <div className="w-32 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                No image
              </div>
            )}
            <div className="text-sm space-y-1">
              <p className="font-semibold text-base">{claim.laptop_name}</p>
              <p className="text-gray-500">{claim.brand} {claim.model}</p>
              {claim.specs && <p className="text-gray-400">{claim.specs}</p>}
              <p className="font-bold text-lg">${parseFloat(claim.price_cad).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Review Section */}
        {claim.status === 'pending_review' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Review</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Finance Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional for approval, required for denial"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none resize-none"
                />
              </div>
              {error && (
                <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleDeny}
                  disabled={loading}
                  className="flex-1 border border-red-300 text-red-700 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Deny
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Trail */}
        {claim.reviewed_at && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Audit Trail</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Reviewed at</span>
                <span>{new Date(claim.reviewed_at).toLocaleString('en-CA')}</span>
              </div>
              {claim.finance_notes && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Notes</span>
                  <span>{claim.finance_notes}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Submitted</span>
                <span>{new Date(claim.created_at).toLocaleString('en-CA')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
