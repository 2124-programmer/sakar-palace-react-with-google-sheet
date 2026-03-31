const DEFAULT_RANGES = {
  stats: 'Dashboard-Stats!A1:Z200',
  announcements: 'Announcements!A1:Z200',
  events: 'Events!A1:Z200',
  emergencyContacts: 'Emergency-Contacts!A1:Z200',
  complaints: 'Complaints!A1:Z200',
  maintenance: 'Maintainance-Status!A1:Z200'
};

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

const mapStats = (rows) => {
  const first = rows[0] || {};
  return {
    totalFlats: parseNumber(findValue(first, ['total flats', 'totalflats', 'flats'])),
    occupiedFlats: parseNumber(findValue(first, ['occupied', 'occupied flats', 'occupiedflats'])),
    pendingDues: parseNumber(findValue(first, ['pending dues', 'pendingdues', 'dues pending'])),
    vacantFlats: parseNumber(findValue(first, ['vacant flats', 'vacantflats', 'vacant']))
  };
};

const mapAnnouncements = (rows) =>
  rows.map((row, index) => ({
    id: row.id || `ann-${index + 1}`,
    title: findValue(row, ['title', 'announcement', 'subject'], 'Announcement'),
    date: findValue(row, ['date', 'announcement date'], ''),
    message: findValue(row, ['message', 'details', 'description'], '')
  }));

const mapEvents = (rows) =>
  rows.map((row, index) => ({
    id: row.id || `evt-${index + 1}`,
    title: findValue(row, ['title', 'event', 'event name'], 'Event'),
    date: findValue(row, ['date', 'event date'], ''),
    location: findValue(row, ['location', 'venue'], '')
  }));

const mapEmergencyContacts = (rows) =>
  rows.map((row, index) => ({
    id: row.id || `cnt-${index + 1}`,
    role: findValue(row, ['role', 'name', 'contact type'], 'Contact'),
    phone: findValue(row, ['phone', 'number', 'mobile', 'contact'], '')
  }));

const mapComplaints = (rows) =>
  rows.map((row, index) => ({
    id: row.id || `cmp-${index + 1}`,
    title: findValue(row, ['title', 'subject', 'complaint'], 'Complaint'),
    status: findValue(row, ['status', 'state'], 'Open')
  }));

const mapMaintenanceSummary = (rows) => {
  const first = rows[0] || {};

  return {
    dueAmount: parseNumber(findValue(first, ['due amount', 'due', 'monthly due'])),
    lastPaymentAmount: parseNumber(findValue(first, ['last payment amount', 'last payment', 'paid amount'])),
    lastPaymentDate: findValue(first, ['last payment date', 'payment date', 'last paid date'], '')
  };
};

const fallbackDashboardData = {
  stats: {
    totalFlats: 120,
    occupiedFlats: 110,
    pendingDues: 25800,
    vacantFlats: 10
  },
  announcements: [
    { id: 'ann-1', title: 'Water Supply Maintenance Tonight', date: '2026-03-25', message: '' },
    { id: 'ann-2', title: 'Society Meeting on Sunday', date: '2026-03-20', message: '' }
  ],
  events: [
    { id: 'evt-1', title: 'Holi Celebration', date: '2026-03-10', location: '' },
    { id: 'evt-2', title: 'Yoga Session', date: '2026-03-15', location: '' }
  ],
  emergencyContacts: [
    { id: 'cnt-1', role: 'Security', phone: '+91 9876543210' },
    { id: 'cnt-2', role: 'Electrician', phone: '+91 9876601234' },
    { id: 'cnt-3', role: 'Doctor', phone: '+91 9876123456' }
  ],
  complaints: [
    { id: 'cmp-1', title: 'Lift not working', status: 'In Progress' },
    { id: 'cmp-2', title: 'Leakage in basement', status: 'Resolved' }
  ],
  maintenanceSummary: {
    dueAmount: 2500,
    lastPaymentAmount: 3000,
    lastPaymentDate: '2026-02-05'
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

  const result = {
    stats: mapStats(mapped.stats || []),
    announcements: mapAnnouncements(mapped.announcements || []),
    events: mapEvents(mapped.events || []),
    emergencyContacts: mapEmergencyContacts(mapped.emergencyContacts || []),
    complaints: mapComplaints(mapped.complaints || []),
    maintenanceSummary: mapMaintenanceSummary(mapped.maintenance || [])
  };

  console.log('[googleSheets] fetchDashboardFromSheets: success', {
    announcements: result.announcements.length,
    events: result.events.length,
    emergencyContacts: result.emergencyContacts.length,
    complaints: result.complaints.length
  });

  return result;
}
