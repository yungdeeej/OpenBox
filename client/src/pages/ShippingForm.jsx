import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import ShippingFormFields from '../components/ShippingFormFields';

export default function ShippingForm() {
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get('claim');
  const tokenUuid = searchParams.get('token');
  const [form, setForm] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/claims/${claimId}/shipping`, {
        token_uuid: tokenUuid,
        ...form,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!claimId || !tokenUuid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Invalid Link</h2>
          <p className="text-gray-500 text-sm">This shipping form link is missing required parameters. Please use the link from your email.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Shipping Address Submitted</h2>
          <p className="text-gray-500 text-sm">Your shipping details have been received. You'll get a tracking number once your laptop ships.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2">Shipping Address</h1>
        <p className="text-gray-500 text-center text-sm mb-8">
          Please provide your shipping details so we can send your laptop.
        </p>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
          )}
          <ShippingFormFields form={form} onChange={setForm} />
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Shipping Address'}
          </button>
        </form>
      </div>
    </div>
  );
}
