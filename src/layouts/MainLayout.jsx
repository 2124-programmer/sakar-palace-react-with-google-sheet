import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { societyMeta } from '../data/societyData';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/members', label: 'Members' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/notice-board', label: 'Notice Board' }
];

function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, role, logout, isDashboardOnlyUser } = useAuth();
  const visibleNavItems = isDashboardOnlyUser ? navItems.filter((item) => item.to === '/') : navItems;

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="portal-layout">
      <header className="topnav">
        <div className="topnav-inner">
          <button
            type="button"
            className="topnav-burger"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>

          <NavLink to="/" className="topnav-brand" onClick={closeMenu} aria-label="Go to dashboard">
            <span className="brand-icon">🏠</span>
            <span className="brand-name">{societyMeta.name}</span>
          </NavLink>

          <nav className={`topnav-links${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                end={item.to === '/'}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <label className="topnav-role-switch" aria-label="Application role">
            <span>
              {isDashboardOnlyUser ? 'Test Viewer' : role === 'admin' ? 'Admin' : 'Viewer'}
            </span>
            <span>{user?.residentName || 'Member'}</span>
            <button className="btn btn-xs btn-secondary" type="button" onClick={logout}>Logout</button>
          </label>
        </div>
      </header>

      {menuOpen && (
        <div
          className="topnav-overlay"
          aria-hidden="true"
          onClick={closeMenu}
        />
      )}

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
