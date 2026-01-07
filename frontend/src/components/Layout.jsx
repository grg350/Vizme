import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import './Layout.css';

function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand">
            Metrics Tracker
          </Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/metric-configs" className="nav-link">Metric Configs</Link>
            <Link to="/api-keys" className="nav-link">API Keys</Link>
            <Link to="/code-generation" className="nav-link">Code Generation</Link>
          </div>
          <div className="nav-user">
            <span className="user-email">{user?.email}</span>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;

