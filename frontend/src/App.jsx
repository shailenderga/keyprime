import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';

import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import CustomerDashboard from './pages/CustomerDashboard';
import EngineerDashboard from './pages/EngineerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SalesExecutiveDashboard from './pages/SalesExecutiveDashboard';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div className="flex h-screen items-center justify-center text-indigo-400 font-display text-xl animate-pulse">Loading SupportDesk...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  
  return children;
};

const AppRoutes = () => {
  const { user } = useContext(AuthContext);
  return (
    <div className="min-h-screen text-slate-200">
      {user && <Navbar />}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Routes>
          <Route path="/" element={<Navigate to={user ? `/${user.role}` : "/login"} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/customer" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/engineer" element={<ProtectedRoute allowedRoles={['engineer']}><EngineerDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/sales_executive" element={<ProtectedRoute allowedRoles={['sales_executive']}><SalesExecutiveDashboard /></ProtectedRoute>} />
        </Routes>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
