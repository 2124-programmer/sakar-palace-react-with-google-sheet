const SHEET_RANGES = {
  members: 'Members!A1:Z1000',
  maintenancePaid: 'MaintenancePaid!A1:Z1000',
  expensesDetails: 'Expenses Details!A1:Z1000'
};

const SHEET_NAMES = {
  members: 'Members'
};

const MEMBER_HEADER_ALIASES = [
  'wing',
  'tower',
  'flatno',
  'flat no',
  'flat',
  'owner / tenant',
  'owner/tenant',
  'resident',
  'name',
  'type',
  'occupancy type',
  'contact',
  'phone',
  'mobile',
  'family members',
  'family'
];

const MAINTENANCE_HEADER_ALIASES = [
  'flat no',
  'flatno',
  'flat no.',
  'resident',
  'owner',
  'name',
  'advanced jama',
  'advantage jama',
  'jan-26',
  'feb-26',
  'mar-26',
  'apr-26',
  'may-26',
  'jun-26',
  'jul-26',
  'aug-26',
  'sep-26',
  'oct-26',
  'nov-26',
  'dec-26'
];

const MONTH_KEY_PATTERN = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[- ]?\d{2}$/i;

const buildUrl = (sheetId, apiKey, range) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

const buildPublicGvizUrl = (sheetId, sheetName) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;

const normalize = (value) => String(value || '').trim().toLowerCase();

const parseNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getHeaderMatchScore = (row, aliases) => {
  const normalizedCells = (row || []).map((cell) => normalize(cell));
  return normalizedCells.reduce((score, cell) => (aliases.includes(cell) ? score + 1 : score), 0);
};

const findHeaderRowIndex = (values, aliases, maxRowsToCheck = 12, minMatchScore = 2) => {
  const limit = Math.min(values.length, maxRowsToCheck);
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < limit; i += 1) {
    const score = getHeaderMatchScore(values[i], aliases);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestScore >= minMatchScore ? bestIndex : 0;
};

const valuesArrayToObjects = (values) => {
  if (!Array.isArray(values) || values.length < 2) return [];
  const [header, ...rows] = values;
  return rows
    .filter((row) => row.some((cell) => cell)) // skip empty rows
    .map((row, rowIndex) => {
      const mapped = { id: `row-${rowIndex + 1}` };
      header.forEach((column, columnIndex) => {
        const key = String(column || `col_${columnIndex + 1}`).trim();
        mapped[key] = row[columnIndex] ?? '';
      });
      return mapped;
    });
};

const valuesArrayToObjectsWithAutoHeader = (values, aliases) => {
  if (!Array.isArray(values) || values.length < 2) return [];

  const headerIndex = findHeaderRowIndex(values, aliases);
  const slicedValues = values.slice(headerIndex);
  console.log('[sheetDataService] 🧭 Header row detected at index:', headerIndex);

  return valuesArrayToObjects(slicedValues);
};

const parseGvizResponse = (rawText) => {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  return JSON.parse(rawText.slice(start, end + 1));
};

const gvizTableToObjects = (table) => {
  if (!table?.cols || !table?.rows) return [];

  const headers = table.cols.map((col, idx) => String(col?.label || col?.id || `col_${idx + 1}`).trim());

  return table.rows
    .map((row, rowIndex) => {
      const mapped = { id: `row-${rowIndex + 1}` };
      headers.forEach((header, colIndex) => {
        const cell = row?.c?.[colIndex];
        mapped[header] = cell?.v ?? '';
      });
      return mapped;
    })
    .filter((row) => Object.values(row).some((value) => String(value || '').trim() !== '' && value !== row.id));
};

const gvizTableToValues = (table) => {
  if (!table?.cols || !table?.rows) return [];
  const header = table.cols.map((col, idx) => String(col?.label || col?.id || `col_${idx + 1}`).trim());
  const rows = table.rows.map((row) =>
    header.map((_, colIndex) => {
      const cell = row?.c?.[colIndex];
      return cell?.v ?? '';
    })
  );

  return [header, ...rows];
};

const getMonthKeysFromRow = (row) =>
  Object.keys(row || {}).filter((key) => MONTH_KEY_PATTERN.test(String(key || '').trim()));

const extractMonthValues = (row, monthKeys) =>
  monthKeys.reduce((accumulator, monthKey) => {
    accumulator[monthKey] = parseNumber(row?.[monthKey]);
    return accumulator;
  }, {});

const findMaintenanceSummaryRow = (rows, labels) =>
  rows.find((row) => {
    const label = normalize(findValue(row, ['flatno', 'flat no', 'flat no.']));
    return labels.includes(label);
  });

const sumMonthValues = (monthValues) =>
  Object.values(monthValues || {}).reduce((total, value) => total + parseNumber(value), 0);

const findValue = (row, aliases, fallback = '') => {
  if (!row) return fallback;
  const keys = Object.keys(row);
  const found = keys.find((key) => aliases.includes(normalize(key)));
  return found ? row[found] : fallback;
};

// Map Members sheet
const mapMembers = (rows) =>
  rows.map((row, idx) => ({
    id: row.id || `mem-${idx + 1}`,
    wing: findValue(row, ['wing', 'tower']),
    flatNo: findValue(row, ['flatno', 'flat no', 'flat']),
    residentName: findValue(row, ['owner / tenant', 'owner/tenant', 'resident', 'name']),
    occupancyType: findValue(row, ['type', 'occupancy type'], 'admin'),
    contact: findValue(row, ['contact', 'phone', 'mobile']),
    familyMembers: findValue(row, ['family members', 'family'], '').split(',').filter(Boolean)
  }));

// Map MaintenancePaid sheet - extract flat and payment info
const mapMaintenanceData = (rows) =>
  (() => {
    const monthKeys = getMonthKeysFromRow(rows[0] || {});
    const records = rows
      .filter((row) => {
        const flatNo = findValue(row, ['flatno', 'flat no', 'flat no.']);
        const resident = findValue(row, ['resident', 'owner', 'name']);
        return flatNo && resident;
      })
      .map((row, idx) => {
        const months = extractMonthValues(row, monthKeys);

        return {
          id: row.id || `mnt-${idx + 1}`,
          flatNo: findValue(row, ['flatno', 'flat no', 'flat no.']),
          resident: findValue(row, ['resident', 'owner', 'name']),
          months,
          advancedJama: parseNumber(findValue(row, ['advanced jama', 'advantage jama'], '0')),
          totalPaid: sumMonthValues(months)
        };
      });

    const totalReceivedRow = findMaintenanceSummaryRow(rows, ['total received']);
    const requiredRow = findMaintenanceSummaryRow(rows, ['required']);
    const pendingsRow = findMaintenanceSummaryRow(rows, ['pendings', 'pendings', 'pending']);
    const advancedJamaRow = findMaintenanceSummaryRow(rows, ['advanced jama']);

    return {
      records,
      months: monthKeys,
      summaries: {
        totalReceived: extractMonthValues(totalReceivedRow, monthKeys),
        required: extractMonthValues(requiredRow, monthKeys),
        pendings: extractMonthValues(pendingsRow, monthKeys),
        advancedJamaByMonth: extractMonthValues(advancedJamaRow, monthKeys)
      },
      totals: {
        advancedJamaMembers: records.reduce((total, row) => total + parseNumber(row.advancedJama), 0)
      }
    };
  })();

// Map Expenses Details sheet
const mapExpenses = (rows) =>
  rows
    .filter((row) => findValue(row, ['sr no', 'sr.', 'sr', 'no']))
    .map((row, idx) => ({
      id: row.id || `exp-${idx + 1}`,
      srNo: findValue(row, ['sr no', 'sr.', 'sr']),
      title: findValue(row, ['expenses title', 'expense title', 'title', 'description']),
      // month columns will be added separately
      ...row
    }));

export const hasSheetConfig = () =>
  Boolean(import.meta.env.VITE_GOOGLE_SHEET_ID);

export async function fetchMembersFromSheets() {
  console.log('[sheetDataService] 📥 Starting Members fetch...');
  const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

  if (!sheetId) {
    console.error('[sheetDataService] ❌ Google Sheets config missing (VITE_GOOGLE_SHEET_ID)');
    throw new Error('Google Sheets config missing.');
  }

  try {
    if (apiKey) {
      console.log('[sheetDataService] 🌐 Fetching from Sheets API range:', SHEET_RANGES.members);
      const response = await fetch(buildUrl(sheetId, apiKey, SHEET_RANGES.members));
      if (!response.ok) {
        console.warn('[sheetDataService] ⚠️ Sheets API failed, trying public GViz fallback. HTTP:', response.status);
      } else {
        console.log('[sheetDataService] ✅ Sheets API response received, status:', response.status);
        const payload = await response.json();
        console.log('[sheetDataService] 📊 Raw rows count:', payload.values?.length || 0);
        const rows = valuesArrayToObjectsWithAutoHeader(payload.values || [], MEMBER_HEADER_ALIASES);
        console.log('[sheetDataService] 🔄 Parsed rows count:', rows.length);
        const mapped = mapMembers(rows).filter((row) => row.flatNo || row.residentName);
        console.log('[sheetDataService] ✅ Members mapped successfully, count:', mapped.length);
        return mapped;
      }
    }

    console.log('[sheetDataService] 🌐 Fetching from public GViz endpoint for sheet:', SHEET_NAMES.members);
    const publicResponse = await fetch(buildPublicGvizUrl(sheetId, SHEET_NAMES.members));
    if (!publicResponse.ok) {
      console.error('[sheetDataService] ❌ Public GViz fetch failed. HTTP:', publicResponse.status);
      throw new Error(`Failed to fetch members from sheet: HTTP ${publicResponse.status}`);
    }

    const rawText = await publicResponse.text();
    const parsed = parseGvizResponse(rawText);
    const gvizValues = gvizTableToValues(parsed?.table);
    const rows = valuesArrayToObjectsWithAutoHeader(gvizValues, MEMBER_HEADER_ALIASES);
    console.log('[sheetDataService] 🔄 GViz parsed rows count:', rows.length);
    const mapped = mapMembers(rows).filter((row) => row.flatNo || row.residentName);
    console.log('[sheetDataService] ✅ Members mapped from GViz successfully, count:', mapped.length);
    return mapped;
  } catch (err) {
    console.error('[sheetDataService] 💥 Error fetching members:', err);
    throw err;
  }
}

export async function fetchMaintenanceFromSheets() {
  console.log('[sheetDataService] 📥 Starting Maintenance fetch...');
  const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

  if (!sheetId) {
    console.error('[sheetDataService] ❌ Google Sheets config missing');
    throw new Error('Google Sheets config missing.');
  }

  try {
    if (apiKey) {
      console.log('[sheetDataService] 🌐 Fetching from range:', SHEET_RANGES.maintenancePaid);
      const response = await fetch(buildUrl(sheetId, apiKey, SHEET_RANGES.maintenancePaid));
      if (!response.ok) {
        console.warn('[sheetDataService] ⚠️ Sheets API failed for maintenance, trying public GViz fallback. HTTP:', response.status);
      } else {
        console.log('[sheetDataService] ✅ Response received, status:', response.status);
        const payload = await response.json();
        console.log('[sheetDataService] 📊 Raw rows count:', payload.values?.length || 0);
        const rows = valuesArrayToObjectsWithAutoHeader(payload.values || [], MAINTENANCE_HEADER_ALIASES);
        console.log('[sheetDataService] 🔄 Parsed rows count:', rows.length);
        const mapped = mapMaintenanceData(rows);
        console.log('[sheetDataService] ✅ Maintenance mapped successfully, count:', mapped.records.length);
        return mapped;
      }
    }

    console.log('[sheetDataService] 🌐 Fetching maintenance from public GViz endpoint');
    const publicResponse = await fetch(buildPublicGvizUrl(sheetId, 'MaintenancePaid'));
    if (!publicResponse.ok) {
      console.error('[sheetDataService] ❌ Public GViz maintenance fetch failed. HTTP:', publicResponse.status);
      throw new Error(`Failed to fetch maintenance: HTTP ${publicResponse.status}`);
    }

    const rawText = await publicResponse.text();
    const parsed = parseGvizResponse(rawText);
    const gvizValues = gvizTableToValues(parsed?.table);
    const rows = valuesArrayToObjectsWithAutoHeader(gvizValues, MAINTENANCE_HEADER_ALIASES);
    console.log('[sheetDataService] 🔄 GViz parsed rows count:', rows.length);
    const mapped = mapMaintenanceData(rows);
    console.log('[sheetDataService] ✅ Maintenance mapped from GViz successfully, count:', mapped.records.length);
    return mapped;
  } catch (err) {
    console.error('[sheetDataService] 💥 Error fetching maintenance:', err);
    throw err;
  }
}

export async function fetchExpensesFromSheets() {
  console.log('[sheetDataService] 📥 Starting Expenses fetch...');
  const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

  if (!sheetId || !apiKey) {
    console.error('[sheetDataService] ❌ Google Sheets config missing');
    throw new Error('Google Sheets config missing.');
  }

  try {
    console.log('[sheetDataService] 🌐 Fetching from range:', SHEET_RANGES.expensesDetails);
    const response = await fetch(buildUrl(sheetId, apiKey, SHEET_RANGES.expensesDetails));
    if (!response.ok) {
      console.error('[sheetDataService] ❌ HTTP Error:', response.status);
      throw new Error(`Failed to fetch expenses: HTTP ${response.status}`);
    }
    console.log('[sheetDataService] ✅ Response received, status:', response.status);

    const payload = await response.json();
    console.log('[sheetDataService] 📊 Raw rows count:', payload.values?.length || 0);
    const rows = valuesArrayToObjects(payload.values || []);
    console.log('[sheetDataService] 🔄 Parsed rows count:', rows.length);
    const mapped = mapExpenses(rows);
    console.log('[sheetDataService] ✅ Expenses mapped successfully, count:', mapped.length);
    return mapped;
  } catch (err) {
    console.error('[sheetDataService] 💥 Error fetching expenses:', err);
    throw err;
  }
}
