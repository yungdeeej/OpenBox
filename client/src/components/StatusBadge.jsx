const statusConfig = {
  pending_review: { label: 'Pending Review', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  approved: { label: 'Approved', bg: 'bg-green-100', text: 'text-green-800' },
  denied: { label: 'Denied', bg: 'bg-red-100', text: 'text-red-800' },
  awaiting_shipping: { label: 'Awaiting Shipping', bg: 'bg-blue-100', text: 'text-blue-800' },
  shipped: { label: 'Shipped', bg: 'bg-purple-100', text: 'text-purple-800' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
