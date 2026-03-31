import { useEffect, useState } from 'react';
import { maintenanceRows as fallbackMaintenance } from '../data/societyData';
import { fetchMaintenanceFromSheets, hasSheetConfig } from '../services/sheetDataService';

const fallbackMaintenanceData = {
  records: fallbackMaintenance,
  months: [],
  summaries: {
    totalReceived: {},
    required: {},
    pendings: {},
    advancedJamaByMonth: {}
  },
  totals: {
    advancedJamaMembers: 0
  }
};

export function useMaintenance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [data, setData] = useState(fallbackMaintenanceData);

  useEffect(() => {
    const load = async () => {
      console.log('[useMaintenance] 🔵 Hook mounted, starting load effect');
      setLoading(true);
      setError('');

      if (!hasSheetConfig()) {
        console.log('[useMaintenance] ⚠️ No Google Sheets config found, using fallback data');
        setData(fallbackMaintenanceData);
        setIsUsingFallback(true);
        setLoading(false);
        return;
      }

      try {
        console.log('[useMaintenance] 📡 Fetching maintenance from Google Sheets...');
        const fromSheet = await fetchMaintenanceFromSheets();
        console.log('[useMaintenance] ✅ Successfully loaded', fromSheet.records.length, 'maintenance records from Sheets');
        setData(fromSheet);
        setIsUsingFallback(false);
      } catch (err) {
        console.error('[useMaintenance] ❌ Error fetching from Sheets:', err);
        console.log('[useMaintenance] 🔄 Falling back to mock data');
        setData(fallbackMaintenanceData);
        setIsUsingFallback(true);
        setError(err instanceof Error ? err.message : 'Unable to load maintenance from Google Sheets.');
      } finally {
        setLoading(false);
        console.log('[useMaintenance] 🏁 Load effect completed');
      }
    };

    load();
  }, []);

  return { loading, error, isUsingFallback, data };
}
