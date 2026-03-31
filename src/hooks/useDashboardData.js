import { useEffect, useState } from 'react';
import {
  fetchDashboardFromSheets,
  getDashboardFallbackData,
  hasSheetConfig
} from '../services/googleSheets';

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [data, setData] = useState(getDashboardFallbackData());

  useEffect(() => {
    const load = async () => {
      console.log('[useDashboardData] load: start');
      setLoading(true);
      setError('');

      if (!hasSheetConfig()) {
        console.warn('[useDashboardData] No sheet config found. Using fallback data.');
        setData(getDashboardFallbackData());
        setIsUsingFallback(true);
        setLoading(false);
        return;
      }

      try {
        console.log('[useDashboardData] Fetching dashboard from Google Sheets');
        const fromSheet = await fetchDashboardFromSheets();
        console.log('[useDashboardData] Dashboard fetch success');
        setData(fromSheet);
        setIsUsingFallback(false);
      } catch (err) {
        console.error('[useDashboardData] Dashboard fetch failed. Falling back.', err);
        setData(getDashboardFallbackData());
        setIsUsingFallback(true);
        setError(err instanceof Error ? err.message : 'Unable to load dashboard from Google Sheets.');
      } finally {
        console.log('[useDashboardData] load: complete');
        setLoading(false);
      }
    };

    load();
  }, []);

  return {
    loading,
    error,
    isUsingFallback,
    data
  };
}
