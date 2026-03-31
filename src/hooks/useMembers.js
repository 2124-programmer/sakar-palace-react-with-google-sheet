import { useEffect, useState } from 'react';
import { members as fallbackMembers } from '../data/societyData';
import { fetchMembersFromSheets, hasSheetConfig } from '../services/sheetDataService';

export function useMembers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [data, setData] = useState(fallbackMembers);

  useEffect(() => {
    const load = async () => {
      console.log('[useMembers] 🔵 Hook mounted, starting load effect');
      setLoading(true);
      setError('');

      if (!hasSheetConfig()) {
        console.log('[useMembers] ⚠️ No Google Sheets config found, using fallback data');
        setData(fallbackMembers);
        setIsUsingFallback(true);
        setLoading(false);
        return;
      }

      try {
        console.log('[useMembers] 📡 Fetching members from Google Sheets...');
        const fromSheet = await fetchMembersFromSheets();
        console.log('[useMembers] ✅ Successfully loaded', fromSheet.length, 'members from Sheets');
        setData(fromSheet);
        setIsUsingFallback(false);
      } catch (err) {
        console.error('[useMembers] ❌ Error fetching from Sheets:', err);
        console.log('[useMembers] 🔄 Falling back to mock data');
        setData(fallbackMembers);
        setIsUsingFallback(true);
        setError(err instanceof Error ? err.message : 'Unable to load members from Google Sheets.');
      } finally {
        setLoading(false);
        console.log('[useMembers] 🏁 Load effect completed');
      }
    };

    load();
  }, []);

  return { loading, error, isUsingFallback, data };
}
