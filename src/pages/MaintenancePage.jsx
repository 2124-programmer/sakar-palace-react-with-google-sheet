import { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { useAppRole } from '../hooks/useAppRole';
import { useMaintenance } from '../hooks/useMaintenance';
import { formatCurrency } from '../utils/formatters';

const CURRENT_USER_FLAT = 'B-01';

function MaintenancePage() {
  const { user } = useAuth();
  const { isAdmin } = useAppRole();
  const [view, setView] = useState('individual');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [query, setQuery] = useState('');
  const { loading, error, isUsingFallback, data: maintenanceData } = useMaintenance();
  const currentUserFlat = user?.flatNo || CURRENT_USER_FLAT;

  const records = maintenanceData?.records || [];
  const months = maintenanceData?.months || [];
  const summaries = maintenanceData?.summaries || {};
  const totals = maintenanceData?.totals || {};

  useEffect(() => {
    console.log('[MaintenancePage] 🚀 Page rendered. Loading:', loading, '| Data count:', records?.length || 0, '| View:', view, '| Month:', selectedMonth, '| Using fallback:', isUsingFallback);
  }, [loading, records, view, selectedMonth, isUsingFallback]);

  useEffect(() => {
    if (!isAdmin && view === 'admin') {
      setView('individual');
    }
  }, [isAdmin, view]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((row) => {
      const matchesView =
        (isAdmin && view === 'admin') || String(row.flatNo || '').toLowerCase() === String(currentUserFlat).toLowerCase();
      const matchesSearch =
        !normalizedQuery ||
        String(row.flatNo || '').toLowerCase().includes(normalizedQuery) ||
        String(row.resident || '').toLowerCase().includes(normalizedQuery);

      return matchesView && matchesSearch;
    });
  }, [currentUserFlat, isAdmin, view, records, query]);

  const isAdminView = isAdmin && view === 'admin';

  const monthlyRecap = useMemo(() => {
    const totalReceivedByMonth = {};
    const totalRecordCount = records.length || 1;
    const requiredByMonth = {};
    const pendingByMonth = {};
    const advancedByMonth = {};

    months.forEach((month) => {
      totalReceivedByMonth[month] = rows.reduce(
        (total, row) => total + Number(row.months?.[month] || 0),
        0
      );

      const adminRequired = Number(summaries.required?.[month] || 0);
      const perHeadFromSheet = Number(summaries.amountPerHeadByMonth?.[month] || 0);
      const perHeadRequired =
        perHeadFromSheet > 0 ? perHeadFromSheet : adminRequired > 0 ? adminRequired / totalRecordCount : 0;

      requiredByMonth[month] = isAdminView ? adminRequired : perHeadRequired;

      const received = totalReceivedByMonth[month];
      pendingByMonth[month] = isAdminView
        ? Number(summaries.pendings?.[month] || 0)
        : perHeadRequired - received;

      advancedByMonth[month] = isAdminView
        ? Number(summaries.advancedJamaByMonth?.[month] || 0)
        : Math.max(received - perHeadRequired, 0);
    });

    return {
      totalReceivedByMonth,
      requiredByMonth,
      pendingByMonth,
      advancedByMonth
    };
  }, [isAdminView, months, records.length, rows, summaries]);

  if (loading) return <div className="page-container">Loading maintenance data from Google Sheets...</div>;

  const getSummaryValue = (summaryObject, fallbackByMonth = {}) => {
    const ifAllMonths = (obj) =>
      obj
        ? Object.values(obj).reduce((total, value) => total + Number(value || 0), 0)
        : 0;

    if (selectedMonth === 'all') {
      if (!isAdminView) return ifAllMonths(fallbackByMonth);

      const summaryTotal = ifAllMonths(summaryObject);
      if (summaryTotal > 0) return summaryTotal;
      return ifAllMonths(fallbackByMonth);
    }

    if (!isAdminView) {
      return Number(fallbackByMonth[selectedMonth] || 0);
    }

    const explicitMonthValue = summaryObject?.[selectedMonth];
    if (explicitMonthValue !== undefined && explicitMonthValue !== null && String(explicitMonthValue).trim() !== '') {
      return Number(explicitMonthValue || 0);
    }

    return Number(fallbackByMonth[selectedMonth] || 0);
  };

  const visibleTotalPaid = rows.reduce((total, row) => total + Number(row.totalPaid || 0), 0);
  const visibleAdvancedJama = rows.reduce((total, row) => total + Number(row.advancedJama || 0), 0);

  const columns = [
    { key: 'flatNo', label: 'Flat No' },
    { key: 'resident', label: 'Resident' },
    {
      key: 'selectedMonthAmount',
      label: selectedMonth === 'all' ? 'Total Paid' : selectedMonth,
      renderCell: (_, row) =>
        formatCurrency(selectedMonth === 'all' ? row.totalPaid : row.months?.[selectedMonth] || 0)
    },
    {
      key: 'advancedJama',
      label: 'Advanced Jama',
      renderCell: (value) => formatCurrency(value)
    },
    {
      key: 'totalPaid',
      label: '2026 - Paid',
      renderCell: (value) => formatCurrency(value)
    }
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Maintenance Status"
        subtitle="Month-wise society maintenance tracking with resident records and collection summaries."
      />

      {isUsingFallback ? (
        <div className="dashboard-note">Showing fallback sample data. Add env keys to fetch from Google Sheets.</div>
      ) : null}

      {error ? <div className="dashboard-note warning">{error}</div> : null}

      <div className="segmented-control" role="tablist" aria-label="Maintenance view mode">
        <button
          type="button"
          onClick={() => setView('individual')}
          className={view === 'individual' ? 'active' : ''}
        >
          Individual View
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setView('admin')}
            className={view === 'admin' ? 'active' : ''}
          >
            Admin View
          </button>
        ) : null}
      </div>

      <div className="toolbar maintenance-toolbar">
        <label>
          Month Filter
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            <option value="all">All Months</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>

        <label>
          Search Resident
          <input
            type="search"
            placeholder="Search by flat or resident"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <section className="stats-grid maintenance-stats-grid">
        <article className="stat-card maintenance-highlight">
          <p className="stat-card-label">Visible Flats</p>
          <p className="stat-card-value">{rows.length}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Collected {selectedMonth === 'all' ? '(All Months)' : `(${selectedMonth})`}</p>
          <p className="stat-card-value">{formatCurrency(selectedMonth === 'all' ? visibleTotalPaid : getSummaryValue(summaries.totalReceived, monthlyRecap.totalReceivedByMonth))}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Required</p>
          <p className="stat-card-value">{formatCurrency(getSummaryValue(summaries.required, monthlyRecap.requiredByMonth))}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Pending / Advanced</p>
          <p className="stat-card-value">{formatCurrency(selectedMonth === 'all' ? visibleAdvancedJama : getSummaryValue(summaries.pendings, monthlyRecap.pendingByMonth))}</p>
        </article>
      </section>

      

      <DataTable columns={columns} rows={rows} />

      <section className="maintenance-panel-grid">
        <article className="panel maintenance-month-panel">
          <h3>Monthly Overview</h3>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  {months.map((month) => (
                    <th key={month}>{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Received</td>
                  {months.map((month) => (
                    <td key={`received-${month}`}>
                      {formatCurrency(
                        isAdminView
                          ? summaries.totalReceived?.[month] ?? monthlyRecap.totalReceivedByMonth?.[month] ?? 0
                          : monthlyRecap.totalReceivedByMonth?.[month] ?? 0
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Required</td>
                  {months.map((month) => (
                    <td key={`required-${month}`}>{formatCurrency(monthlyRecap.requiredByMonth?.[month] || 0)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Pending</td>
                  {months.map((month) => (
                    <td key={`pending-${month}`}>{formatCurrency(monthlyRecap.pendingByMonth?.[month] || 0)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Advanced Jama</td>
                  {months.map((month) => (
                    <td key={`advanced-${month}`}>{formatCurrency(monthlyRecap.advancedByMonth?.[month] || 0)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel maintenance-insight-panel">
          <h3>Selected View</h3>
          <ul className="simple-list">
            <li>
              <p className="list-title">Current Scope</p>
              <p>{isAdminView ? 'Admin view for all flats' : `Individual view for ${currentUserFlat}`}</p>
            </li>
            <li>
              <p className="list-title">Month Focus</p>
              <p>{selectedMonth === 'all' ? 'All months combined' : selectedMonth}</p>
            </li>
            <li>
              <p className="list-title">Visible Advanced Jama</p>
              <p>{formatCurrency(visibleAdvancedJama)}</p>
            </li>
            <li>
              <p className="list-title">Overall Advanced Jama</p>
              <p>{formatCurrency(totals.advancedJamaMembers || 0)}</p>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}

export default MaintenancePage;
