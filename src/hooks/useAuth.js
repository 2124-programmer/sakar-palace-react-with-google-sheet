import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { members as fallbackMembers } from '../data/societyData';
import { fetchMembersFromSheets, hasSheetConfig } from '../services/sheetDataService';

const AUTH_SESSION_STORAGE_KEY = 'sakar-auth-session-v1';
const ENABLE_TEST_DASHBOARD_USER = import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_USER === 'true';
const TEST_DASHBOARD_USER = ENABLE_TEST_DASHBOARD_USER
  ? {
      mobile: '9000000000',
      code: '111111',
      residentName: 'Dashboard Test User',
      flatNo: '',
      role: 'viewer',
      accessScope: 'dashboard-only'
    }
  : {
      mobile: '__disabled__',
      code: '__disabled__',
      residentName: 'Dashboard Test User',
      flatNo: '',
      role: 'viewer',
      accessScope: 'dashboard-only'
    };

const AuthContext = createContext(null);

const normalizeDigits = (value) => String(value || '').replace(/\D/g, '');
const normalizeMobile = (value) => {
  const digits = normalizeDigits(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
};
const normalizeCode = (value) => normalizeDigits(value);

const createSession = ({ role, residentName, flatNo, mobile, accessScope = 'full' }) => ({
  isAuthenticated: true,
  role,
  accessScope,
  user: {
    residentName,
    flatNo,
    mobile
  }
});

const toRole = (member) => {
  const accessRole = String(member?.accessRole || '').trim().toLowerCase();
  if (accessRole === 'admin') return 'admin';

  const occupancyType = String(member?.occupancyType || '').trim().toLowerCase();
  return occupancyType === 'admin' ? 'admin' : 'viewer';
};

const readStoredSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.isAuthenticated) return null;
    return parsed;
  } catch {
    return null;
  }
};

const persistSession = (session) => {
  if (typeof window === 'undefined') return;

  try {
    if (!session) {
      window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors.
  }
};

const loadMembersForAuth = async () => {
  if (hasSheetConfig()) {
    try {
      return await fetchMembersFromSheets();
    } catch {
      // fall through to fallback members
    }
  }

  return Array.isArray(fallbackMembers) ? fallbackMembers : [];
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredSession();
    setSession(stored);
    setLoading(false);
  }, []);

  const login = async ({ mobile, code }) => {
    const normalizedMobile = normalizeMobile(mobile);
    const normalizedCode = normalizeCode(code);

    if (
      normalizedMobile === TEST_DASHBOARD_USER.mobile &&
      normalizedCode === TEST_DASHBOARD_USER.code
    ) {
      const testUserSession = createSession({
        role: TEST_DASHBOARD_USER.role,
        residentName: TEST_DASHBOARD_USER.residentName,
        flatNo: TEST_DASHBOARD_USER.flatNo,
        mobile: TEST_DASHBOARD_USER.mobile,
        accessScope: TEST_DASHBOARD_USER.accessScope
      });

      setSession(testUserSession);
      persistSession(testUserSession);
      return { success: true };
    }

    if (normalizedMobile.length < 10) {
      return { success: false, message: 'Enter valid mobile number.' };
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      return { success: false, message: 'Enter valid 6-digit code.' };
    }

    const members = await loadMembersForAuth();

    const member = members.find((item) => {
      const memberMobile = normalizeMobile(item?.contact || item?.phone || item?.mobile);
      const memberCode = normalizeCode(item?.loginCode || item?.code || item?.pin || item?.passcode);
      const memberCodePadded = memberCode ? memberCode.padStart(6, '0') : '';

      return memberMobile === normalizedMobile && (memberCode === normalizedCode || memberCodePadded === normalizedCode);
    });

    if (!member) {
      return { success: false, message: 'Invalid mobile or 6-digit code.' };
    }

    const nextSession = createSession({
      role: toRole(member),
      residentName: member.residentName || member.name || 'Member',
      flatNo: member.flatNo || '',
      mobile: normalizeMobile(member.contact || member.phone || member.mobile),
      accessScope: 'full'
    });

    setSession(nextSession);
    persistSession(nextSession);
    return { success: true };
  };

  const logout = () => {
    setSession(null);
    persistSession(null);
  };

  const value = useMemo(
    () => ({
      loading,
      isAuthenticated: Boolean(session?.isAuthenticated),
      role: session?.role || 'viewer',
      isAdmin: session?.role === 'admin',
      isDashboardOnlyUser: session?.accessScope === 'dashboard-only',
      testCredentials: {
        mobile: TEST_DASHBOARD_USER.mobile,
        code: TEST_DASHBOARD_USER.code
      },
      user: session?.user || null,
      login,
      logout
    }),
    [loading, session]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}