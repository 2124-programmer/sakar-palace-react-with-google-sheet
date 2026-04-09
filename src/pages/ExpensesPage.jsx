import { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { useAppRole } from '../hooks/useAppRole';
import { useExpenses } from '../hooks/useExpenses';
import { formatCurrency } from '../utils/formatters';

const EXPENSE_RECORDS_STORAGE_KEY = 'sakar-expense-records-v2';

const MONTH_ORDER = {
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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PRESET_EXPENSE_CATEGORIES = ['Salary', 'Electricity', 'Maintenance', 'Festival'];

const getDefaultBillingMonth = (date = new Date()) => {
  const monthIndex = date.getMonth();
  const day = date.getDate();
  const targetMonthIndex = day <= 15 ? (monthIndex + 11) % 12 : monthIndex;
  return MONTH_LABELS[targetMonthIndex];
};

const EMPTY_FORM = {
  month: 'Jan',
  title: '',
  category: 'Maintenance',
  amount: '',
  payTo: '',
  status: 'pending',
  paidDate: ''
};

function ExpensesPage() {
  const { loading, error, isUsingFallback, data: expenseData } = useExpenses();
  const { isAdmin } = useAppRole();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [managedRecords, setManagedRecords] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const records = expenseData?.records || [];
  const sheetMonths = expenseData?.months || [];
  const sheetCategories = expenseData?.categories || [];

  useEffect(() => {
    console.log('[ExpensesPage] 💰 Page rendered. Loading:', loading, '| Data count:', records?.length || 0, '| Using fallback:', isUsingFallback);
  }, [loading, records, isUsingFallback]);

  useEffect(() => {
    if (!records.length) return;

    try {
      const saved = window.localStorage.getItem(EXPENSE_RECORDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setManagedRecords(parsed);
          return;
        }
      }
    } catch (storageError) {
      console.warn('[ExpensesPage] Unable to load saved expenses data', storageError);
    }

    setManagedRecords(records);
  }, [records]);

  useEffect(() => {
    try {
      window.localStorage.setItem(EXPENSE_RECORDS_STORAGE_KEY, JSON.stringify(managedRecords));
    } catch (storageError) {
      console.warn('[ExpensesPage] Unable to persist expenses data', storageError);
    }
  }, [managedRecords]);

  const monthOptions = useMemo(() => {
    const combined = [...sheetMonths, ...managedRecords.map((record) => record.month)].filter(Boolean);
    return [...new Set(combined)].sort((left, right) => (MONTH_ORDER[left] || 99) - (MONTH_ORDER[right] || 99));
  }, [managedRecords, sheetMonths]);

  useEffect(() => {
    if (!monthOptions.length) return;

    const defaultMonth = getDefaultBillingMonth();

    if (!selectedMonth) {
      setSelectedMonth(monthOptions.includes(defaultMonth) ? defaultMonth : monthOptions[monthOptions.length - 1]);
      return;
    }

    if (!monthOptions.includes(selectedMonth) && selectedMonth !== 'all') {
      setSelectedMonth(monthOptions.includes(defaultMonth) ? defaultMonth : monthOptions[monthOptions.length - 1]);
    }
  }, [monthOptions, selectedMonth]);

  const categoryOptions = useMemo(() => {
    const combined = [...sheetCategories, ...managedRecords.map((record) => record.category)].filter(Boolean);
    return [...new Set(combined)].sort();
  }, [managedRecords, sheetCategories]);

  const formCategoryOptions = useMemo(() => {
    return [...new Set([...PRESET_EXPENSE_CATEGORIES, ...categoryOptions])];
  }, [categoryOptions]);

  const filteredRows = useMemo(
    () =>
      managedRecords.filter((record) => {
        const monthMatch = selectedMonth === 'all' || record.month === selectedMonth;
        const categoryMatch = selectedCategory === 'all' || record.category === selectedCategory;
        return monthMatch && categoryMatch;
      }),
    [managedRecords, selectedCategory, selectedMonth]
  );

  // For the overview table, totals must be computed from ALL months (category filter
  // only) — not from filteredRows — so the full monthly breakdown is always visible.
  const allMonthsCategoryFiltered = useMemo(
    () =>
      managedRecords.filter(
        (record) => selectedCategory === 'all' || record.category === selectedCategory
      ),
    [managedRecords, selectedCategory]
  );

  const monthlyTotals = useMemo(
    () =>
      monthOptions.reduce((accumulator, month) => {
        accumulator[month] = allMonthsCategoryFiltered.reduce(
          (total, record) => total + (record.month === month ? Number(record.amount || 0) : 0),
          0
        );
        return accumulator;
      }, {}),
    [allMonthsCategoryFiltered, monthOptions]
  );

  const overviewTotal = allMonthsCategoryFiltered.reduce((total, record) => total + Number(record.amount || 0), 0);

  const filteredTotal = filteredRows.reduce((total, record) => total + Number(record.amount || 0), 0);
  const paidCount = filteredRows.filter((record) => record.status === 'paid').length;
  const pendingCount = filteredRows.filter((record) => record.status === 'pending').length;

  const selectedMonthRows = useMemo(() => {
    if (selectedMonth === 'all') return filteredRows;
    return filteredRows.filter((record) => record.month === selectedMonth);
  }, [filteredRows, selectedMonth]);

  const selectedMonthTotal = selectedMonthRows.reduce((total, record) => total + Number(record.amount || 0), 0);

  const selectedYear = useMemo(() => {
    const dateSource = selectedMonthRows.find((row) => String(row.paidDate || '').trim());
    const raw = String(dateSource?.paidDate || '');
    const yearMatch = raw.match(/(20\d{2})/);
    if (yearMatch) return yearMatch[1];
    return String(new Date().getFullYear());
  }, [selectedMonthRows]);

  const selectedMonthHeader = selectedMonth === 'all' ? `All Months - ${selectedYear}` : `${selectedMonth}-${selectedYear}`;

  const handleFieldChange = (key, value) => {
    setForm((previous) => {
      if (key === 'status' && value === 'pending') {
        return { ...previous, status: value, paidDate: '' };
      }
      return { ...previous, [key]: value };
    });
  };

  const resetForm = () => {
    setEditingId('');
    setForm(EMPTY_FORM);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    resetForm();
  };

  const openAddModal = () => {
    if (!isAdmin) return;
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isAdmin) return;

    if (!form.title.trim() || !form.month.trim() || !form.category.trim()) return;

    const parsedAmount = Number(form.amount || 0);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    if (editingId) {
      setManagedRecords((previous) =>
        previous.map((record) =>
          record.id === editingId
            ? {
                ...record,
                month: form.month,
                title: form.title.trim(),
                category: form.category.trim(),
                amount: parsedAmount,
                payTo: form.payTo.trim(),
                status: form.status,
                paidDate: form.paidDate
              }
            : record
        )
      );
      closeFormModal();
      return;
    }

    const nextId = `custom-${Date.now()}`;
    const nextSrNo = managedRecords.length + 1;

    setManagedRecords((previous) => [
      ...previous,
      {
        id: nextId,
        srNo: String(nextSrNo),
        month: form.month,
        title: form.title.trim(),
        category: form.category.trim(),
        amount: parsedAmount,
        payTo: form.payTo.trim(),
        status: form.status,
        paidDate: form.paidDate
      }
    ]);
    closeFormModal();
  };

  const handleEdit = (record) => {
    if (!isAdmin) return;
    setEditingId(record.id);
    setForm({
      month: record.month || 'Jan',
      title: record.title || '',
      category: record.category || '',
      amount: String(record.amount || ''),
      payTo: record.payTo || '',
      status: record.status || 'pending',
      paidDate: record.paidDate || ''
    });
    setIsFormModalOpen(true);
  };

  const requestDelete = (record) => {
    if (!isAdmin) return;
    setDeleteTarget(record);
  };

  const confirmDelete = () => {
    if (!isAdmin) return;
    if (!deleteTarget) return;

    setManagedRecords((previous) => previous.filter((record) => record.id !== deleteTarget.id));
    if (editingId === deleteTarget.id) {
      closeFormModal();
    }
    setDeleteTarget(null);
  };

  const handleStatusChange = (recordId, status) => {
    if (!isAdmin) return;
    setManagedRecords((previous) =>
      previous.map((record) =>
        record.id === recordId
          ? {
              ...record,
              status,
              paidDate: status === 'paid' && !record.paidDate ? new Date().toISOString().slice(0, 10) : record.paidDate
            }
          : record
      )
    );
  };

  const handleResetFromSheet = () => {
    if (!isAdmin) return;
    setManagedRecords(records);
    resetForm();
  };

  if (loading) return <div className="page-container">Loading expenses from Google Sheets...</div>;
  if (error) return <div className="page-container error">{error}</div>;

  const columns = [
    { key: 'srNo', label: 'Sr No' },
    { key: 'month', label: 'Month' },
    { key: 'title', label: 'Expense Name' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', renderCell: (value) => formatCurrency(value) },
    { key: 'payTo', label: 'Pay To' },
    {
      key: 'status',
      label: 'Status',
      renderCell: (value, row) => (
        isAdmin ? (
          <select
            className="field-select field-select-sm"
            value={value}
            onChange={(event) => handleStatusChange(row.id, event.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        ) : (
          <span className="status-chip">{value === 'paid' ? 'Paid' : 'Pending'}</span>
        )
      )
    },
    { key: 'paidDate', label: 'Paid Date', renderCell: (value) => value || '-' }
  ];

  if (isAdmin) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      renderCell: (_, row) => (
        <>
          <button className="btn btn-ghost btn-xs" type="button" onClick={() => handleEdit(row)}>
            Edit
          </button>{' '}
          <button className="btn btn-danger btn-xs" type="button" onClick={() => requestDelete(row)}>
            Delete
          </button>
        </>
      )
    });
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Expenses / Spend List"
        subtitle="Track every society expense with category and vendor transparency."
      />

      {isUsingFallback ? (
        <div className="dashboard-note">Showing fallback sample data. Add env keys to fetch from Google Sheets.</div>
      ) : null}

      {!isAdmin ? <div className="dashboard-note">Viewer mode: You can view expenses only.</div> : null}

      

      <section className="stats-grid maintenance-stats-grid">
        <article className="stat-card maintenance-highlight">
          <p className="stat-card-label">Filtered Entries</p>
          <p className="stat-card-value">{filteredRows.length}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Filtered Total</p>
          <p className="stat-card-value">{formatCurrency(filteredTotal)}</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Paid / Pending</p>
          <p className="stat-card-value">{`${paidCount} / ${pendingCount}`}</p>
        </article>
      </section>

      <div className="toolbar maintenance-toolbar">
        <label>
          Month Filter
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            <option value="all">All Months</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>

        <label>
          Category Filter
          <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
            <option value="all">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        {isAdmin ? (
          <button className="btn btn-secondary" type="button" onClick={handleResetFromSheet}>
            Reset To Sheet Data
          </button>
        ) : null}

        {isAdmin ? (
          <button className="btn btn-primary" type="button" onClick={openAddModal}>
            Add Expense
          </button>
        ) : null}
      </div>

      <DataTable columns={columns} rows={filteredRows} />

      <section className="maintenance-panel-grid">
        <article className="panel maintenance-month-panel">
          <h3>Monthly Expense Overview</h3>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  {monthOptions.map((month) => (
                    <th key={month}>{month}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Kharch</td>
                  {monthOptions.map((month) => (
                    <td key={`kharch-${month}`}>{formatCurrency(monthlyTotals[month] || 0)}</td>
                  ))}
                  <td>{formatCurrency(overviewTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

      </section>

      {isAdmin && isFormModalOpen ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Expense form">
            <div className="modal-header">
              <h3>{editingId ? 'Update Expense' : 'Add Expense'}</h3>
              <button className="modal-close-btn" type="button" aria-label="Close" onClick={closeFormModal}>
                x
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form-grid">
              <label>
                Month
                <select value={form.month} onChange={(event) => handleFieldChange('month', event.target.value)}>
                  {Object.keys(MONTH_ORDER).map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Expense Name
                  <input value={form.title} onChange={(event) => handleFieldChange('title', event.target.value)} />
              </label>

              <label>
                Category
                <select value={form.category} onChange={(event) => handleFieldChange('category', event.target.value)}>
                  {formCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Amount
                  <input type="number" value={form.amount} onChange={(event) => handleFieldChange('amount', event.target.value)} />
              </label>

              <label>
                Pay To
                  <input value={form.payTo} onChange={(event) => handleFieldChange('payTo', event.target.value)} />
              </label>

              <label>
                Status
                <select value={form.status} onChange={(event) => handleFieldChange('status', event.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </label>

              {form.status === 'paid' ? (
                <label>
                  Paid Date
                  <input type="date" value={form.paidDate} onChange={(event) => handleFieldChange('paidDate', event.target.value)} />
                </label>
              ) : null}

              <div className="modal-actions">
                <button className="btn btn-primary" type="submit">{editingId ? 'Update Expense' : 'Add Expense'}</button>
                <button className="btn btn-secondary" type="button" onClick={closeFormModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAdmin && deleteTarget ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card modal-card-sm" role="dialog" aria-modal="true" aria-label="Delete confirmation">
            <h3>Confirm Delete</h3>
            <p>{`Delete expense "${deleteTarget.title}"?`}</p>
            <div className="modal-actions">
              <button className="btn btn-danger" type="button" onClick={confirmDelete}>
                Yes, Delete
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ExpensesPage;
