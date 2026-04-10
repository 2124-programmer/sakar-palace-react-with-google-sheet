import { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { useAppRole } from '../hooks/useAppRole';
import { useMaintenance } from '../hooks/useMaintenance';
import { useMembers } from '../hooks/useMembers';
import { downloadMaintenanceReceipt, getReadableReceiptMonth, isMonthPaid } from '../utils/maintenanceReceipt';
import { formatCurrency } from '../utils/formatters';

const CURRENT_USER_FLAT = 'B-01';

function MaintenancePage() {
  const { user } = useAuth();
  const { isAdmin } = useAppRole();
  const [view, setView] = useState('individual');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isReceiptFlowOpen, setIsReceiptFlowOpen] = useState(false);
  const [receiptMonth, setReceiptMonth] = useState('');
  const [receiptFlat, setReceiptFlat] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptError, setReceiptError] = useState('');
  const [query, setQuery] = useState('');
  const { loading, error, isUsingFallback, data: maintenanceData } = useMaintenance();
  const { data: membersData } = useMembers();
  const currentUserFlat = user?.flatNo || CURRENT_USER_FLAT;

  const records = maintenanceData?.records || [];
  const months = maintenanceData?.months || [];
  const summaries = maintenanceData?.summaries || {};
  const totals = maintenanceData?.totals || {};

  useEffect(() => {
    console.log('[MaintenancePage] 🚀 Page rendered. Loading:', loading, '| Data count:', records?.length || 0, '| View:', view, '| Month:', selectedMonth, '| Using fallback:', isUsingFallback);
  }, [loading, records, view, selectedMonth, isUsingFallback]);

  useEffect(() => {
    if (!months.length) {
      setReceiptMonth('');
      return;
    }

    if (!receiptMonth || !months.includes(receiptMonth)) {
      setReceiptMonth(months[0]);
    }
  }, [months, receiptMonth]);

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

  const receiptScopeRows = useMemo(() => {
    if (isAdminView) return records;
    return records.filter(
      (row) => String(row.flatNo || '').toLowerCase() === String(currentUserFlat || '').toLowerCase()
    );
  }, [currentUserFlat, isAdminView, records]);

  const paidReceiptRows = useMemo(() => {
    if (!receiptMonth) return [];
    return receiptScopeRows.filter((row) => isMonthPaid(row, receiptMonth));
  }, [receiptMonth, receiptScopeRows]);

  useEffect(() => {
    if (!isAdminView) {
      setReceiptFlat(currentUserFlat);
      return;
    }

    if (!paidReceiptRows.length) {
      setReceiptFlat('');
      return;
    }

    const stillValid = paidReceiptRows.some(
      (row) => String(row.flatNo || '').toLowerCase() === String(receiptFlat || '').toLowerCase()
    );

    if (!stillValid) {
      setReceiptFlat(paidReceiptRows[0].flatNo || '');
    }
  }, [currentUserFlat, isAdminView, paidReceiptRows, receiptFlat]);

  const memberByFlat = useMemo(
    () =>
      (membersData || []).reduce((accumulator, member) => {
        const key = String(member.flatNo || '').toLowerCase();
        if (key) {
          accumulator[key] = member;
        }
        return accumulator;
      }, {}),
    [membersData]
  );

  const openReceiptFlow = () => {
    setIsReceiptFlowOpen(true);
    setReceiptError('');
    setReceiptPreview(null);
  };

  const handleSeeReceiptDetails = () => {
    if (!receiptMonth) {
      setReceiptError('Please select a receipt month.');
      setReceiptPreview(null);
      return;
    }

    if (!receiptScopeRows.length) {
      setReceiptError('No maintenance records found for receipt generation.');
      setReceiptPreview(null);
      return;
    }

    const selectedRow = isAdminView
      ? receiptScopeRows.find(
          (row) => String(row.flatNo || '').toLowerCase() === String(receiptFlat || '').toLowerCase()
        )
      : receiptScopeRows[0];

    if (!selectedRow) {
      setReceiptError('Please select a valid flat for receipt.');
      setReceiptPreview(null);
      return;
    }

    const monthAmount = Number(selectedRow.months?.[receiptMonth] || 0);
    if (monthAmount <= 0) {
      setReceiptError('Receipt is available only for paid maintenance entries.');
      setReceiptPreview(null);
      return;
    }

    setReceiptError('');
    setReceiptPreview({
      monthKey: receiptMonth,
      flatNo: selectedRow.flatNo,
      residentName: selectedRow.resident,
      amount: monthAmount
    });
  };

  const handlePrintReceipt = () => {
    if (!receiptPreview) return;

    const member = memberByFlat[String(receiptPreview.flatNo || '').toLowerCase()];

    try {
      downloadMaintenanceReceipt({
        monthKey: receiptPreview.monthKey,
        flatNo: receiptPreview.flatNo,
        residentName: receiptPreview.residentName,
        amount: receiptPreview.amount,
        contactNo: member?.contact,
        paymentMode: 'Cash'
      });
    } catch (downloadError) {
      console.error('[MaintenancePage] Receipt download failed:', downloadError);
      setReceiptError('Unable to print receipt. Please try again.');
    }
  };

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
    { key: 'resident', label: 'Resident Name' },
    {
      key: 'selectedMonthAmount',
      label: selectedMonth === 'all' ? 'Total Paid' : selectedMonth,
      renderCell: (_, row) =>
        formatCurrency(selectedMonth === 'all' ? row.totalPaid : row.months?.[selectedMonth] || 0)
    },
    {
      key: 'advancedJama',
      label: 'Advanced Balance',
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
        title="Maintenance Overview"
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
          Flat-wise View
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setView('admin')}
            className={view === 'admin' ? 'active' : ''}
          >
            Society View
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
          <p className="stat-card-label">Selected Flats</p>
          <p className="stat-card-value">{rows.length}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Total Collected {selectedMonth === 'all' ? '(All Months)' : `(${selectedMonth})`}</p>
          <p className="stat-card-value">{formatCurrency(selectedMonth === 'all' ? visibleTotalPaid : getSummaryValue(summaries.totalReceived, monthlyRecap.totalReceivedByMonth))}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Total Payable</p>
          <p className="stat-card-value">{formatCurrency(getSummaryValue(summaries.required, monthlyRecap.requiredByMonth))}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Net Balance (Pending/Advance)</p>
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
                  <th>Category</th>
                  {months.map((month) => (
                    <th key={month}>{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Collected</td>
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
                  <td>Total Payable</td>
                  {months.map((month) => (
                    <td key={`required-${month}`}>{formatCurrency(monthlyRecap.requiredByMonth?.[month] || 0)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Pending Amount</td>
                  {months.map((month) => (
                    <td key={`pending-${month}`}>{formatCurrency(monthlyRecap.pendingByMonth?.[month] || 0)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Advance Balance</td>
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
              <p className="list-title">Selected Flat</p>
              <p>{isAdminView ? 'Admin view for all flats' : `Individual view for ${currentUserFlat}`}</p>
            </li>
            <li>
              <p className="list-title">Selected Period</p>
              <p>{selectedMonth === 'all' ? 'All months combined' : selectedMonth}</p>
            </li>
            <li>
              <p className="list-title">Advance (Selected)</p>
              <p>{formatCurrency(visibleAdvancedJama)}</p>
            </li>
            <li>
              <p className="list-title">Total Advance Balance</p>
              <p>{formatCurrency(totals.advancedJamaMembers || 0)}</p>
            </li>
          </ul>
        </article>
      </section>

      <section className="panel maintenance-receipt-panel">
        <h3>Download Receipt</h3>
        <p className="maintenance-receipt-caption">
          Flow: Download Receipt | Select Month | See Details | Print Receipt
        </p>

        <div className="maintenance-receipt-flow">
          <button type="button" className="btn btn-secondary" onClick={openReceiptFlow}>
            Download Receipt
          </button>

          {isReceiptFlowOpen ? (
            <>
              <label>
                Select Month for Download Receipt
                <select value={receiptMonth} onChange={(event) => setReceiptMonth(event.target.value)}>
                  {!months.length ? <option value="">No months available</option> : null}
                  {months.map((month) => (
                    <option key={`receipt-month-${month}`} value={month}>
                      {getReadableReceiptMonth(month)}
                    </option>
                  ))}
                </select>
              </label>

              {isAdminView ? (
                <label>
                  Select Paid Flat
                  <select value={receiptFlat} onChange={(event) => setReceiptFlat(event.target.value)}>
                    {!paidReceiptRows.length ? <option value="">No paid flats for this month</option> : null}
                    {paidReceiptRows.map((row) => (
                      <option key={`receipt-flat-${row.id}`} value={row.flatNo}>
                        {row.flatNo} - {row.resident}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <button type="button" className="btn btn-primary" onClick={handleSeeReceiptDetails}>
                See Details
              </button>

              {receiptError ? <div className="dashboard-note warning">{receiptError}</div> : null}

              {receiptPreview ? (
                <article className="maintenance-receipt-preview">
                  <h4>Receipt Details</h4>
                  <p>
                    <strong>Flat:</strong> {receiptPreview.flatNo}
                  </p>
                  <p>
                    <strong>Resident:</strong> {receiptPreview.residentName}
                  </p>
                  <p>
                    <strong>Month:</strong> {getReadableReceiptMonth(receiptPreview.monthKey)}
                  </p>
                  <p>
                    <strong>Amount:</strong> {formatCurrency(receiptPreview.amount)}
                  </p>
                  <p>
                    <strong>Status:</strong> Paid
                  </p>
                  <button type="button" className="btn btn-primary" onClick={handlePrintReceipt}>
                    Print Receipt
                  </button>
                </article>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default MaintenancePage;
