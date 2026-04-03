import { useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { societyMeta } from '../data/societyData';
import { ROLE_ADMIN, ROLE_VIEWER, useAppRole } from '../hooks/useAppRole';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/members', label: 'Members' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/notice-board', label: 'Notice Board' }
];

function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { role, setRole } = useAppRole();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  const closeMenu = () => setMenuOpen(false);

  const getCurrentTimePassword = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}${minutes}`;
  };

  const handleSecretRoleTrigger = () => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, 1200);

    if (clickCountRef.current >= 5) {
      if (role === ROLE_ADMIN) {
        setRole(ROLE_VIEWER);
      } else {
        const input = window.prompt('Enter admin password');
        if (input !== null) {
          const expectedPassword = getCurrentTimePassword();
          if (input.trim() === expectedPassword) {
            setRole(ROLE_ADMIN);
          } else {
            window.alert('Invalid password. Admin mode not enabled.');
          }
        }
      }

      clickCountRef.current = 0;
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  };

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

          <label className="topnav-role-switch" aria-label="Application role">
            <span>Mode</span>
            <span>{role === ROLE_ADMIN ? 'Admin' : 'Viewer'}</span>
            <button
              type="button"
              className="role-secret-trigger"
              title="Secret mode switch"
              aria-label="Secret mode switch"
              onClick={handleSecretRoleTrigger}
            />
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
