const DEFAULT_RANGES = {
  stats: 'Dashboard-Stats!A1:Z200',
  announcements: 'latest-announcements!A1:Z200',
  emergencyContacts: 'emergency-contacts!A1:Z200',
  complaints: 'Complaints!A1:Z200',
  maintenance: 'MaintenancePaid!A1:Z200'
};

const MONTH_KEY_PATTERN = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[- ]?\d{2}$/i;

const buildUrl = (sheetId, apiKey, range) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

const normalize = (value) => String(value || '').trim().toLowerCase();

const parseNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const valuesArrayToObjects = (values) => {
  if (!Array.isArray(values) || values.length < 2) return [];

  const [header, ...rows] = values;
  return rows.map((row, rowIndex) => {
    const mapped = { id: `row-${rowIndex + 1}` };

    header.forEach((column, columnIndex) => {
      const key = String(column || `col_${columnIndex + 1}`).trim();
      mapped[key] = row[columnIndex] ?? '';
    });

    return mapped;
  });
};

const findValue = (row, aliases, fallback = '') => {
  const keys = Object.keys(row || {});
  const found = keys.find((key) => aliases.includes(normalize(key)));
  return found ? row[found] : fallback;
};

const getCycleActiveMonth = (date = new Date()) => {
  const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);

  // Billing cycle: 15th to next 14th. Before 15th, use previous month as active month.
  if (date.getDate() < 15) {
    monthDate.setMonth(monthDate.getMonth() - 1);
  }

  const month = monthDate.toLocaleString('en-US', { month: 'short' });
  const year = String(monthDate.getFullYear()).slice(-2);
  return `${month}-${year}`;
};

const resolveMonthKey = (row, monthLabel) => {
  const keys = Object.keys(row || {});
  const wanted = normalize(monthLabel).replace(/\s+/g, '');

  return (
    keys.find((key) => normalize(key).replace(/\s+/g, '') === wanted) ||
    monthLabel
  );
};

const mapStats = (rows) => {
  const first = rows[0] || {};
  return {
    totalFlats: parseNumber(findValue(first, ['total flats', 'totalflats', 'flats'])),
    totalMaintenanceAdvanced: parseNumber(
      findValue(first, ['total maintenance advanced', 'total mentenance advanced', 'maintenance advanced'])
    ),
    activeComplaints: parseNumber(findValue(first, ['active complaints', 'open complaints'])),
    inProgressComplaints: parseNumber(findValue(first, ['in progress complaints', 'progress complaints'])),
    resolvedComplaints: parseNumber(findValue(first, ['resolved complaints', 'closed complaints'])),
    activeMonth: findValue(first, ['active month', 'current month'], ''),
    currentMonthMaintenancePerHead: parseNumber(
      findValue(first, ['current month maintainance per head', 'current month maintenance per head', 'maintenance per head'])
    ),
    maintenancePaidMembers: parseNumber(
      findValue(first, ['mentanance paid members', 'maintenance paid members', 'paid members'])
    ),
    pendingMembers: parseNumber(findValue(first, ['pending members', 'unpaid members'])),
    lightBillForActiveMonth: findValue(first, ['light bill for active month', 'light bill active month'], '')
  };
};

const mapAnnouncements = (rows) =>
  rows.map((row, index) => ({
    id: row.id || `ann-${index + 1}`,
    title: findValue(row, ['title', 'announcement', 'subject'], 'Announcement'),
    date: findValue(row, ['date', 'announcement date'], ''),
    message: findValue(row, ['message', 'details', 'description'], '')
  }));

const mapEmergencyContacts = (rows) =>
  rows.map((row, index) => ({
    id: row.id || `cnt-${index + 1}`,
    role: findValue(row, ['role', 'name', 'contact type'], 'Contact'),
    title: findValue(row, ['title', 'person', 'name'], ''),
    contact: findValue(row, ['contact', 'phone', 'number', 'mobile'], '')
  }));

const mapComplaints = (rows) =>
  rows.map((row, index) => ({
    id: row.id || `cmp-${index + 1}`,
    title: findValue(row, ['title', 'subject', 'complaint'], 'Complaint'),
    status: findValue(row, ['status', 'state'], 'Open')
  }));

const mapMaintenanceSummary = (rows, activeMonth) => {
  const records = rows.filter((row) => {
    const flatNo = findValue(row, ['flat no', 'flatno', 'flat no.']);
    const resident = findValue(row, ['resident', 'owner', 'name']);
    return flatNo && resident;
  });

  const decidedCollectRow = rows.find((row) => {
    const normalizedValues = Object.values(row || {}).map((value) => normalize(value));
    return normalizedValues.some((value) =>
      ['descided to collect', 'decided to collect', 'decided collect'].includes(value)
    );
  });

  const amountPerHeadRow = rows.find((row) => {
    const normalizedValues = Object.values(row || {}).map((value) => normalize(value));
    return normalizedValues.some((value) =>
      ['ammount/head', 'amount/head', 'amount per head', 'maintenance/head', 'per head'].includes(value)
    );
  });

  const monthKey = resolveMonthKey(records[0] || decidedCollectRow || amountPerHeadRow || {}, activeMonth);
  const perHeadFromDecidedCollect = parseNumber(decidedCollectRow?.[monthKey]);
  const perHeadFromAmountPerHead = parseNumber(amountPerHeadRow?.[monthKey]);
  const currentMonthMaintenancePerHead =
    perHeadFromDecidedCollect > 0 ? perHeadFromDecidedCollect : perHeadFromAmountPerHead;

  const memberStats = records.map((row) => {
    const paidAmount = parseNumber(row?.[monthKey]);
    const pendingAmount = Math.max(currentMonthMaintenancePerHead - paidAmount, 0);
    const advancedJama = parseNumber(findValue(row, ['advanced jama', 'advantage jama'], '0'));

    return {
      id: row.id,
      flatNo: findValue(row, ['flat no', 'flatno', 'flat no.']),
      resident: findValue(row, ['resident', 'owner', 'name']),
      paidAmount,
      pendingAmount,
      advancedJama
    };
  });

  const pendingMembersList = memberStats
    .filter((item) => item.pendingAmount > 0)
    .map(({ id, flatNo, resident, pendingAmount }) => ({
      id,
      flatNo,
      resident,
      pendingAmount
    }));

  const advancedMembersList = memberStats
    .filter((item) => item.advancedJama > 0)
    .map(({ id, flatNo, resident, advancedJama }) => ({
      id,
      flatNo,
      resident,
      advancedAmount: advancedJama
    }));

  const totalPendingAmount = pendingMembersList.reduce((total, item) => total + item.pendingAmount, 0);
  const totalAdvancedAmount = advancedMembersList.reduce((total, item) => total + item.advancedAmount, 0);
  const maintenancePaidMembers = memberStats.filter((item) => item.paidAmount > 0).length;
  const pendingMemberCount = pendingMembersList.length;

  return {
    pendingMembersList,
    advancedMembersList,
    totalPendingAmount,
    totalAdvancedAmount,
    currentMonthMaintenancePerHead,
    maintenancePaidMembers,
    totalMemberCount: records.length,
    pendingMemberCount
  };
};

const fallbackDashboardData = {
  stats: {
    totalFlats: 16,
    totalMaintenanceAdvanced: 1500,
    activeComplaints: 1,
    inProgressComplaints: 1,
    resolvedComplaints: 1,
    activeMonth: 'Mar-26',
    currentMonthMaintenancePerHead: 320,
    maintenancePaidMembers: 16,
    pendingMembers: 0,
    lightBillForActiveMonth: 'Mar - 3120'
  },
  announcements: [
    { id: 'ann-1', title: 'Water Supply Maintenance Tonight', date: '2026-03-25', message: '' },
    { id: 'ann-2', title: 'Society Meeting on Sunday', date: '2026-03-20', message: '' }
  ],
  events: [],
  emergencyContacts: [
    { id: 'cnt-1', role: 'Security', title: 'Gate Security', contact: '-' },
    { id: 'cnt-2', role: 'Plumber', title: 'On-call Plumber', contact: '-' }
  ],
  complaints: [],
  maintenanceSummary: {
    pendingMembersList: [],
    advancedMembersList: [],
    totalPendingAmount: 0,
    totalAdvancedAmount: 0
  }
};

export const hasSheetConfig = () => {
  const hasConfig = Boolean(import.meta.env.VITE_GOOGLE_SHEET_ID && import.meta.env.VITE_GOOGLE_SHEETS_API_KEY);
  console.log('[googleSheets] hasSheetConfig:', hasConfig);
  return hasConfig;
};

export const getDashboardFallbackData = () => fallbackDashboardData;

export async function fetchDashboardFromSheets(customRanges = {}) {
  console.log('[googleSheets] fetchDashboardFromSheets: start');
  const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

  if (!sheetId || !apiKey) {
    console.error('[googleSheets] Missing config. sheetId or apiKey is empty.');
    throw new Error('Google Sheets config missing. Set VITE_GOOGLE_SHEET_ID and VITE_GOOGLE_SHEETS_API_KEY.');
  }

  const ranges = { ...DEFAULT_RANGES, ...customRanges };
  console.log('[googleSheets] Ranges to fetch:', ranges);

  const entries = await Promise.all(
    Object.entries(ranges).map(async ([key, range]) => {
      console.log(`[googleSheets] Fetching range for ${key}: ${range}`);
      const response = await fetch(buildUrl(sheetId, apiKey, range));
      if (!response.ok) {
        console.error(`[googleSheets] Failed loading ${key}. HTTP ${response.status}`);
        throw new Error(`Failed loading ${key}: HTTP ${response.status}`);
      }

      const payload = await response.json();
      const mappedRows = valuesArrayToObjects(payload.values || []);
      console.log(`[googleSheets] Loaded ${key} rows:`, mappedRows.length);
      return [key, mappedRows];
    })
  );

  const mapped = Object.fromEntries(entries);
  console.log('[googleSheets] Mapping dashboard payload to UI model');

  const activeMonth = getCycleActiveMonth();
  const maintenanceSummary = mapMaintenanceSummary(mapped.maintenance || [], activeMonth);
  const baseStats = mapStats(mapped.stats || []);

  // Override pending/paid counts from the computed maintenance data so the
  // Current Month Details card always matches the Pending List card.
  const stats = {
    ...baseStats,
    activeMonth,
    currentMonthMaintenancePerHead:
      maintenanceSummary.currentMonthMaintenancePerHead || baseStats.currentMonthMaintenancePerHead,
    pendingMembers: maintenanceSummary.pendingMemberCount,
    maintenancePaidMembers:
      maintenanceSummary.maintenancePaidMembers ||
      maintenanceSummary.totalMemberCount - maintenanceSummary.pendingMemberCount
  };

  const result = {
    stats,
    announcements: mapAnnouncements(mapped.announcements || []),
    events: [],
    emergencyContacts: mapEmergencyContacts(mapped.emergencyContacts || []),
    complaints: mapComplaints(mapped.complaints || []),
    maintenanceSummary
  };

  console.log('[googleSheets] fetchDashboardFromSheets: success', {
    announcements: result.announcements.length,
    emergencyContacts: result.emergencyContacts.length,
    complaints: result.complaints.length
  });

  return result;
}
