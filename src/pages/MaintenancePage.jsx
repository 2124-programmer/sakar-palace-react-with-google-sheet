import { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { useMaintenance } from '../hooks/useMaintenance';
import { formatCurrency } from '../utils/formatters';

const CURRENT_USER_FLAT = 'B-01';

function MaintenancePage() {
  const [view, setView] = useState('individual');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [query, setQuery] = useState('');
  const { loading, error, isUsingFallback, data: maintenanceData } = useMaintenance();

  const records = maintenanceData?.records || [];
  const months = maintenanceData?.months || [];
  const summaries = maintenanceData?.summaries || {};
  const totals = maintenanceData?.totals || {};

  useEffect(() => {
    console.log('[MaintenancePage] 🚀 Page rendered. Loading:', loading, '| Data count:', records?.length || 0, '| View:', view, '| Month:', selectedMonth, '| Using fallback:', isUsingFallback);
  }, [loading, records, view, selectedMonth, isUsingFallback]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((row) => {
      const matchesView =
        view === 'admin' || String(row.flatNo || '').toLowerCase() === CURRENT_USER_FLAT.toLowerCase();
      const matchesSearch =
        !normalizedQuery ||
        String(row.flatNo || '').toLowerCase().includes(normalizedQuery) ||
        String(row.resident || '').toLowerCase().includes(normalizedQuery);

      return matchesView && matchesSearch;
    });
  }, [view, records, query]);

  if (loading) return <div className="page-container">Loading maintenance data from Google Sheets...</div>;

  const getSummaryValue = (summaryObject) => {
    if (!summaryObject) return 0;
    if (selectedMonth === 'all') {
      return Object.values(summaryObject).reduce((total, value) => total + Number(value || 0), 0);
    }
    return Number(summaryObject[selectedMonth] || 0);
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
        <button
          type="button"
          onClick={() => setView('admin')}
          className={view === 'admin' ? 'active' : ''}
        >
          Admin View
        </button>
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
          <p className="stat-card-value">{formatCurrency(selectedMonth === 'all' ? visibleTotalPaid : getSummaryValue(summaries.totalReceived))}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Required</p>
          <p className="stat-card-value">{formatCurrency(getSummaryValue(summaries.required))}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Pending / Advanced</p>
          <p className="stat-card-value">{formatCurrency(selectedMonth === 'all' ? visibleAdvancedJama : getSummaryValue(summaries.pendings))}</p>
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
                    <td key={`received-${month}`}>{formatCurrency(summaries.totalReceived?.[month] || 0)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Required</td>
                  {months.map((month) => (
                    <td key={`required-${month}`}>{formatCurrency(summaries.required?.[month] || 0)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Pending</td>
                  {months.map((month) => (
                    <td key={`pending-${month}`}>{formatCurrency(summaries.pendings?.[month] || 0)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Advanced Jama</td>
                  {months.map((month) => (
                    <td key={`advanced-${month}`}>{formatCurrency(summaries.advancedJamaByMonth?.[month] || 0)}</td>
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
              <p>{view === 'admin' ? 'Admin view for all flats' : `Individual view for ${CURRENT_USER_FLAT}`}</p>
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
