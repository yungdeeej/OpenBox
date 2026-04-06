import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import LaptopCard from '../components/LaptopCard';

const STEPS_TIMELINE = ['Received', 'Finance Review', 'Approved', 'Delivered'];

export default function ClaimPortal() {
  const [searchParams] = useSearchParams();
  const tokenUuid = searchParams.get('token');

  const [tokenData, setTokenData] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [programs, setPrograms] = useState([]);
  const [laptops, setLaptops] = useState([]);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [form, setForm] = useState({
    program_id: '',
    student_id_number: '',
    first_name: '',
    last_name: '',
    phone: '',
    laptop_id: null,
    eligible: false,
  });

  useEffect(() => {
    if (!tokenUuid) {
      setTokenError('No claim token provided. Please use the link from your email.');
      return;
    }
    api.get(`/tokens/validate/${tokenUuid}`)
      .then((data) => {
        setTokenData(data);
        return api.get(`/programs?institution_id=${data.institution_id}`);
      })
      .then(setPrograms)
      .catch((err) => setTokenError(err.message));

    api.get('/laptops').then(setLaptops).catch(() => {});
  }, [tokenUuid]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.post('/claims', {
        token_uuid: tokenUuid,
        student_name: `${form.first_name} ${form.last_name}`,
        student_email: tokenData.student_email,
        student_phone: form.phone,
        student_id_number: form.student_id_number,
        program_id: form.program_id,
        laptop_id: form.laptop_id,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Unable to Load Claim</h2>
          <p className="text-gray-500 text-sm">{tokenError}</p>
        </div>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Claim Submitted!</h2>
          <p className="text-gray-500 text-sm mb-8">
            Your laptop claim has been received. Our finance team will review it within 2-3 business days.
          </p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              {STEPS_TIMELINE.map((label, i) => (
                <div key={label} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      i === 0 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs mt-1 text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Claim Your Free Laptop</h1>
          <p className="text-gray-500 text-sm mt-1">{tokenData.institution_name} — All options covered up to $500</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                s === step ? 'bg-black text-white' : s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Step 1: Enrollment Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Enrollment Info</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
                <input
                  value={tokenData.institution_name}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program of Study</label>
                <select
                  name="program_id"
                  value={form.program_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                >
                  <option value="">Select your program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                <input
                  name="student_id_number"
                  value={form.student_id_number}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!form.program_id}
                className="w-full bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Personal Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  value={tokenData.student_email}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.first_name || !form.last_name}
                  className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Laptop Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Select Your Laptop</h2>
              <p className="text-sm text-gray-500">All options covered up to $500</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {laptops.map((laptop) => (
                  <LaptopCard
                    key={laptop.id}
                    laptop={laptop}
                    selected={form.laptop_id === laptop.id}
                    onSelect={(id) => setForm((prev) => ({ ...prev, laptop_id: id }))}
                  />
                ))}
              </div>
              {laptops.length === 0 && (
                <p className="text-center text-gray-400 py-4">No laptops available at this time.</p>
              )}

              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  name="eligible"
                  checked={form.eligible}
                  onChange={handleChange}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  I confirm that I am a currently enrolled student at {tokenData.institution_name} and eligible for the free laptop benefit.
                </span>
              </label>

              {submitError && (
                <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">{submitError}</div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.laptop_id || !form.eligible || submitting}
                  className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
