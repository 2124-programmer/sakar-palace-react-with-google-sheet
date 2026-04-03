import { useAuth } from './useAuth';

export const ROLE_ADMIN = 'admin';
export const ROLE_VIEWER = 'viewer';

export function useAppRole() {
  const { role } = useAuth();

  return {
    role,
    isAdmin: role === ROLE_ADMIN,
    setRole: () => {}
  };
}