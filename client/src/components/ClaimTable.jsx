import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ClaimTable({ claims }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-3 font-medium">Student</th>
            <th className="pb-3 font-medium">Program</th>
            <th className="pb-3 font-medium">College</th>
            <th className="pb-3 font-medium">Laptop</th>
            <th className="pb-3 font-medium">Price</th>
            <th className="pb-3 font-medium">Submitted</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => (
            <tr
              key={claim.id}
              onClick={() => navigate(`/admin/claims/${claim.id}`)}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="py-3 font-medium">{claim.student_name}</td>
              <td className="py-3 text-gray-600">{claim.program_name}</td>
              <td className="py-3 text-gray-600">{claim.institution_name}</td>
              <td className="py-3 text-gray-600">{claim.laptop_name}</td>
              <td className="py-3">${parseFloat(claim.price_cad).toFixed(2)}</td>
              <td className="py-3 text-gray-500">
                {new Date(claim.created_at).toLocaleDateString('en-CA')}
              </td>
              <td className="py-3">
                <StatusBadge status={claim.status} />
              </td>
            </tr>
          ))}
          {claims.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-400">
                No claims found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
