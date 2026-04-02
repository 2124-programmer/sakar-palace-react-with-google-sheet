import { useEffect, useState } from 'react';
import { expenses as fallbackExpenses } from '../data/societyData';
import { fetchExpensesFromSheets, hasSheetConfig } from '../services/sheetDataService';

const fallbackExpensesData = {
  records: fallbackExpenses,
  months: [],
  summaries: {
    totalKharchByMonth: {}
  }
};

export function useExpenses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [data, setData] = useState(fallbackExpensesData);

  useEffect(() => {
    const load = async () => {
      console.log('[useExpenses] 🔵 Hook mounted, starting load effect');
      setLoading(true);
      setError('');

      if (!hasSheetConfig()) {
        console.log('[useExpenses] ⚠️ No Google Sheets config found, using fallback data');
        setData(fallbackExpensesData);
        setIsUsingFallback(true);
        setLoading(false);
        return;
      }

      try {
        console.log('[useExpenses] 📡 Fetching expenses from Google Sheets...');
        const fromSheet = await fetchExpensesFromSheets();
        console.log('[useExpenses] ✅ Successfully loaded', fromSheet.records.length, 'expenses from Sheets');
        setData(fromSheet);
        setIsUsingFallback(false);
      } catch (err) {
        console.error('[useExpenses] ❌ Error fetching from Sheets:', err);
        console.log('[useExpenses] 🔄 Falling back to mock data');
        setData(fallbackExpensesData);
        setIsUsingFallback(true);
        setError(err instanceof Error ? err.message : 'Unable to load expenses from Google Sheets.');
      } finally {
        setLoading(false);
        console.log('[useExpenses] 🏁 Load effect completed');
      }
    };

    load();
  }, []);

  return { loading, error, isUsingFallback, data };
}
