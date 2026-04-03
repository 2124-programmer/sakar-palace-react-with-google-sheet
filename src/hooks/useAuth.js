import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { members as fallbackMembers } from '../data/societyData';
import { fetchMembersFromSheets, hasSheetConfig } from '../services/sheetDataService';

const AUTH_SESSION_STORAGE_KEY = 'sakar-auth-session-v1';

const AuthContext = createContext(null);

const normalizeDigits = (value) => String(value || '').replace(/\D/g, '');

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
    const normalizedMobile = normalizeDigits(mobile);
    const normalizedCode = String(code || '').trim();

    if (normalizedMobile.length < 10) {
      return { success: false, message: 'Enter valid mobile number.' };
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      return { success: false, message: 'Enter valid 6-digit code.' };
    }

    const members = await loadMembersForAuth();

    const member = members.find((item) => {
      const memberMobile = normalizeDigits(item?.contact || item?.phone || item?.mobile);
      const memberCode = String(item?.loginCode || item?.code || item?.pin || '').trim();
      return memberMobile === normalizedMobile && memberCode === normalizedCode;
    });

    if (!member) {
      return { success: false, message: 'Invalid mobile or 6-digit code.' };
    }

    const nextSession = {
      isAuthenticated: true,
      role: toRole(member),
      user: {
        residentName: member.residentName || member.name || 'Member',
        flatNo: member.flatNo || '',
        mobile: normalizeDigits(member.contact || member.phone || member.mobile)
      }
    };

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