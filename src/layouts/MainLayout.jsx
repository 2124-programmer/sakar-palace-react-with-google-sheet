import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { societyMeta } from '../data/societyData';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/members', label: 'Members' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/notice-board', label: 'Notice Board' }
];

function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="portal-layout">
      <header className="topnav">
        <div className="topnav-inner">
          <div className="topnav-brand">
            <span className="brand-icon">🏠</span>
            <span className="brand-name">{societyMeta.name}</span>
          </div>

          <nav className={`topnav-links${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
            {navItems.map((item) => (
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
