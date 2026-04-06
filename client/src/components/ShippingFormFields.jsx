const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
];

export default function ShippingFormFields({ form, onChange }) {
  const handleChange = (e) => {
    onChange({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input
          name="shipping_name"
          value={form.shipping_name || ''}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
        <input
          name="shipping_address_line1"
          value={form.shipping_address_line1 || ''}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
        <input
          name="shipping_address_line2"
          value={form.shipping_address_line2 || ''}
          onChange={handleChange}
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            name="shipping_city"
            value={form.shipping_city || ''}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
          <select
            name="shipping_province"
            value={form.shipping_province || ''}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
          >
            <option value="">Select province</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
          <input
            name="shipping_postal_code"
            value={form.shipping_postal_code || ''}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            name="shipping_phone"
            value={form.shipping_phone || ''}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
