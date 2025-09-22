import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={`dashboard-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 className="app-logo">
            <i className="bi bi-cash-coin me-2"></i>
            <span className="logo-text">ExpensePro</span>
          </h2>
          <button 
            className="sidebar-toggle" 
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={`bi ${isSidebarCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
          </button>
        </div>

        <div className="user-profile">
          <div className="avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <h5>{user?.name || 'User'}</h5>
            <p>{user?.email || 'user@example.com'}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'active' : ''}>
            <i className="bi bi-house-door"></i>
            <span>Home</span>
          </NavLink>
          <NavLink to="/dashboard/groups" className={({ isActive }) => isActive ? 'active' : ''}>
            <i className="bi bi-people"></i>
            <span>Groups</span>
          </NavLink>
          <NavLink to="/dashboard/expenses" className={({ isActive }) => isActive ? 'active' : ''}>
            <i className="bi bi-receipt"></i>
            <span>Expenses</span>
          </NavLink>
          <NavLink to="/dashboard/settlements" className={({ isActive }) => isActive ? 'active' : ''}>
            <i className="bi bi-cash-stack"></i>
            <span>Settlements</span>
          </NavLink>
          <NavLink to="/dashboard/reports" className={({ isActive }) => isActive ? 'active' : ''}>
            <i className="bi bi-bar-chart"></i>
            <span>Reports</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <i className="bi bi-box-arrow-left"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={toggleSidebar}>
              <i className="bi bi-list"></i>
            </button>
            <h1>Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="notifications">
              <i className="bi bi-bell"></i>
              <span className="badge"></span>
            </div>
            <div className="user-dropdown">
              <span></span>
              <button className="logout-small-btn" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right"></i>
              </button>
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>

        <footer className="dashboard-footer">
          <p>© 2025 ExpensePro. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;