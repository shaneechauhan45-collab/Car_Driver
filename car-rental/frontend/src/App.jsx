import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Cars from './pages/Cars';
import CarDetails from './pages/CarDetails';
import Auth from './pages/Auth';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';

function Protected({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, logout } = useAuth();
  return (
    <>
      <nav>
        <Link to="/">Find a car</Link>
        {user && <Link to="/my-bookings">My bookings</Link>}
        {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        <span className="spacer" />
        {user ? <><span style={{ color: '#fff' }}>{user.name}</span><button onClick={logout}>Log out</button></>
              : <><Link to="/login">Log in</Link><Link to="/register">Sign up</Link></>}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Cars />} />
          <Route path="/cars/:id" element={<CarDetails />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/my-bookings" element={<Protected><MyBookings /></Protected>} />
          <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
