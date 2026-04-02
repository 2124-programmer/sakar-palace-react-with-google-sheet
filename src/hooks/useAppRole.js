import { useCallback, useEffect, useState } from 'react';

export const ROLE_ADMIN = 'admin';
export const ROLE_VIEWER = 'viewer';

const APP_ROLE_CHANGE_EVENT = 'sakar:app-role-change';

const normalizeRole = (value) => (value === ROLE_VIEWER ? ROLE_VIEWER : ROLE_ADMIN);

const emitRoleChange = (role) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APP_ROLE_CHANGE_EVENT, { detail: { role } }));
};

const persistRole = (role) => {
  emitRoleChange(role);
};

const readStoredRole = () => ROLE_VIEWER;

export function useAppRole() {
  const [role, setRoleState] = useState(readStoredRole);

  const setRole = useCallback((nextRole) => {
    const normalized = normalizeRole(nextRole);
    setRoleState(normalized);
    persistRole(normalized);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleRoleChange = (event) => {
      const nextRole = normalizeRole(event?.detail?.role || readStoredRole());
      setRoleState(nextRole);
    };

    window.addEventListener(APP_ROLE_CHANGE_EVENT, handleRoleChange);

    return () => {
      window.removeEventListener(APP_ROLE_CHANGE_EVENT, handleRoleChange);
    };
  }, []);

  return {
    role,
    isAdmin: role === ROLE_ADMIN,
    setRole
  };
}