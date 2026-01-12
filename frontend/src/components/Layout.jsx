import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
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
            <span className="brand-icon">📊</span>
            <span className="brand-text">UVP</span>
          </Link>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🏠</span>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/alerts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🔔</span>
              <span>Alerts</span>
            </NavLink>
            <NavLink to="/metric-configs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">⚙️</span>
              <span>Configs</span>
            </NavLink>
            <NavLink to="/api-keys" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🔑</span>
              <span>API Keys</span>
            </NavLink>
            <NavLink to="/code-generation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">💻</span>
              <span>Code</span>
            </NavLink>
          </div>
          <div className="nav-user">
            <span className="user-email">{user?.email}</span>
            <button onClick={handleLogout} className="btn btn-logout">
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

