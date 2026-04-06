import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClaimPortal from './pages/ClaimPortal';
import ClaimStatus from './pages/ClaimStatus';
import ShippingForm from './pages/ShippingForm';
import AdminLogin from './pages/AdminLogin';
import FinanceDashboard from './pages/FinanceDashboard';
import ClaimDetail from './pages/ClaimDetail';
import VendorDashboard from './pages/VendorDashboard';

function PrivateRoute({ children, role }) {
  const token = localStorage.getItem('jwt');
  const userRole = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role && userRole !== 'admin') return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Student surfaces */}
        <Route path="/claim" element={<ClaimPortal />} />
        <Route path="/status" element={<ClaimStatus />} />
        <Route path="/shipping" element={<ShippingForm />} />

        {/* Internal */}
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/admin" element={<PrivateRoute role="finance"><FinanceDashboard /></PrivateRoute>} />
        <Route path="/admin/claims/:id" element={<PrivateRoute role="finance"><ClaimDetail /></PrivateRoute>} />
        <Route path="/vendor" element={<PrivateRoute role="vendor"><VendorDashboard /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/claim" />} />
      </Routes>
    </BrowserRouter>
  );
}
