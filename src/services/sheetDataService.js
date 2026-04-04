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
  'contact no',
  'contact number',
  'phone',
  'phone number',
  'mobile',
  'mobile no',
  'mobile number',
  'role',
  'access role',
  'code',
  '6 digit code',
  '6-digit code',
  'login pin',
  'security code',
  'pin',
  'login code',
  'passcode',
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

const EXPENSES_HEADER_ALIASES = [
  'sr no',
  'sr no.',
  'sr.',
  'sr',
  'month',
  'expense name',
  'expenses title',
  'expense title',
  'title',
  'category',
  'amount',
  'pay to',
  'paid date',
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
  'dec-26',
  'total for 2026',
  'total 2026',
  'total',
  'status',
  'payment status'
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
    if (!row) return false;

    const normalizedRowValues = Object.values(row)
      .map((value) => normalize(value))
      .filter((value) => value);

    return normalizedRowValues.some((value) => labels.includes(value));
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
    occupancyType: findValue(row, ['type', 'occupancy type'], 'owner'),
    contact: findValue(row, ['contact', 'contact no', 'contact number', 'phone', 'phone number', 'mobile', 'mobile no', 'mobile number']),
    accessRole: findValue(row, ['role', 'access role'], ''),
    loginCode: findValue(
      row,
      ['code', '6 digit code', '6-digit code', 'security code', 'login pin', 'pin', 'login code', 'passcode'],
      ''
    ),
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
    const amountPerHeadRow = findMaintenanceSummaryRow(rows, [
      'amount/head',
      'ammount/head',
      'amount per head',
      'maintenance/head',
      'per head'
    ]);

    return {
      records,
      months: monthKeys,
      summaries: {
        totalReceived: extractMonthValues(totalReceivedRow, monthKeys),
        required: extractMonthValues(requiredRow, monthKeys),
        pendings: extractMonthValues(pendingsRow, monthKeys),
        advancedJamaByMonth: extractMonthValues(advancedJamaRow, monthKeys),
        amountPerHeadByMonth: extractMonthValues(amountPerHeadRow, monthKeys)
      },
      totals: {
        advancedJamaMembers: records.reduce((total, row) => total + parseNumber(row.advancedJama), 0)
      }
    };
  })();

// Map Expenses Details sheet
const mapExpenses = (rows) => {
  const findExpenseValue = (row, aliases, fallback = '') => {
    const exact = findValue(row, aliases, '');
    if (String(exact || '').trim() !== '') return exact;

    const keys = Object.keys(row || {});
    const fuzzyKey = keys.find((key) => {
      const normalizedKey = normalize(key);
      return aliases.some((alias) => normalizedKey.includes(normalize(alias)));
    });

    return fuzzyKey ? row[fuzzyKey] : fallback;
  };

  const normalizeStatus = (value) => (normalize(value) === 'paid' ? 'paid' : 'pending');

  const normalizeMonth = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const lower = normalize(raw);
    const monthMap = {
      jan: 'Jan',
      feb: 'Feb',
      mar: 'Mar',
      apr: 'Apr',
      may: 'May',
      jun: 'Jun',
      jul: 'Jul',
      aug: 'Aug',
      sep: 'Sep',
      oct: 'Oct',
      nov: 'Nov',
      dec: 'Dec'
    };

    const monthKey = Object.keys(monthMap).find((key) => lower.startsWith(key));
    if (monthKey) return monthMap[monthKey];
    return raw;
  };

  const monthSortOrder = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12
  };

  const hasLedgerColumns = rows.some((row) => {
    const month = findExpenseValue(row, ['month']);
    const amount = findExpenseValue(row, ['amount']);
    const title = findExpenseValue(row, ['expense name', 'expenses title', 'expense title', 'title', 'description']);
    return String(month || '').trim() && String(title || '').trim() && String(amount || '').trim();
  });

  if (hasLedgerColumns) {
    const records = rows
      .filter((row) => {
        const title = findExpenseValue(row, ['expense name', 'expenses title', 'expense title', 'title', 'description']);
        const month = normalizeMonth(findExpenseValue(row, ['month']));
        const isSummaryRow = ['total kharch', 'total expense', 'total expenses'].includes(normalize(title));
        return String(title || '').trim() && String(month || '').trim() && !isSummaryRow;
      })
      .map((row, idx) => ({
        id: row.id || `exp-${idx + 1}`,
        srNo: findExpenseValue(row, ['sr no', 'sr no.', 'sr.', 'sr', 'no']) || `${idx + 1}`,
        month: normalizeMonth(findExpenseValue(row, ['month'])),
        title: findExpenseValue(row, ['expense name', 'expenses title', 'expense title', 'title', 'description']),
        category: findExpenseValue(row, ['category']),
        amount: parseNumber(findExpenseValue(row, ['amount'], '0')),
        payTo: findExpenseValue(row, ['pay to', 'payto']),
        status: normalizeStatus(findExpenseValue(row, ['status', 'payment status'], 'pending')),
        paidDate: findExpenseValue(row, ['paid date', 'payment date'], '')
      }));

    const months = [...new Set(records.map((record) => record.month))].sort(
      (left, right) => (monthSortOrder[left] || 99) - (monthSortOrder[right] || 99)
    );

    const categories = [...new Set(records.map((record) => record.category).filter(Boolean))].sort();

    const totalKharchByMonth = months.reduce((accumulator, month) => {
      accumulator[month] = records.reduce(
        (total, record) => total + (record.month === month ? Number(record.amount || 0) : 0),
        0
      );
      return accumulator;
    }, {});

    const totalFor2026 = records.reduce((total, record) => total + Number(record.amount || 0), 0);

    return {
      records,
      months,
      categories,
      summaries: {
        totalKharchByMonth,
        totalFor2026
      }
    };
  }

  const monthKeys = getMonthKeysFromRow(rows[0] || {});

  const records = rows
    .filter((row) => {
      const srNo = findExpenseValue(row, ['sr no', 'sr no.', 'sr.', 'sr', 'no']);
      const title = findExpenseValue(row, ['expenses title', 'expense title', 'title', 'description']);
      const isSummaryRow = ['total kharch', 'total expense', 'total expenses'].includes(normalize(title));
      return String(srNo || '').trim() && String(title || '').trim() && !isSummaryRow;
    })
    .map((row, idx) => {
      const months = extractMonthValues(row, monthKeys);
      const totalFromSheet = parseNumber(findExpenseValue(row, ['total for 2026', 'total 2026', 'total'], '0'));
      const statusValue = normalize(findExpenseValue(row, ['status', 'payment status'], 'pending'));
      const status = statusValue === 'paid' ? 'paid' : 'pending';

      return {
        id: row.id || `exp-${idx + 1}`,
        srNo: findExpenseValue(row, ['sr no', 'sr no.', 'sr.', 'sr', 'no']),
        title: findExpenseValue(row, ['expenses title', 'expense title', 'title', 'description']),
        months,
        total: totalFromSheet || sumMonthValues(months),
        status
      };
    });

  const totalKharchRow = findMaintenanceSummaryRow(rows, ['total kharch', 'total expense', 'total expenses']);

  const computedTotalKharchByMonth = monthKeys.reduce((accumulator, monthKey) => {
    accumulator[monthKey] = records.reduce(
      (total, row) => total + parseNumber(row.months?.[monthKey]),
      0
    );
    return accumulator;
  }, {});

  const totalKharchByMonth = extractMonthValues(totalKharchRow, monthKeys);
  const summaryFromSheet = Object.values(totalKharchByMonth).some((value) => Number(value) !== 0);
  const totalFor2026FromSheet = parseNumber(
    findValue(totalKharchRow, ['total for 2026', 'total 2026', 'total'], '0')
  );
  const computedTotalFor2026 = records.reduce((total, row) => total + parseNumber(row.total), 0);

  return {
    records: records.flatMap((record) =>
      monthKeys.map((month) => ({
        id: `${record.id}-${month}`,
        srNo: record.srNo,
        month: normalizeMonth(month),
        title: record.title,
        category: '',
        amount: parseNumber(record.months?.[month] || 0),
        payTo: '',
        status: record.status || 'pending',
        paidDate: ''
      }))
    ),
    months: monthKeys.map((month) => normalizeMonth(month)),
    categories: [],
    summaries: {
      totalKharchByMonth: summaryFromSheet ? totalKharchByMonth : computedTotalKharchByMonth,
      totalFor2026: totalFor2026FromSheet || computedTotalFor2026
    }
  };
};

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
    const rows = valuesArrayToObjectsWithAutoHeader(payload.values || [], EXPENSES_HEADER_ALIASES);
    console.log('[sheetDataService] 🔄 Parsed rows count:', rows.length);
    const mapped = mapExpenses(rows);
    console.log('[sheetDataService] ✅ Expenses mapped successfully, count:', mapped.records.length);
    return mapped;
  } catch (err) {
    console.error('[sheetDataService] 💥 Error fetching expenses:', err);
    throw err;
  }
}
