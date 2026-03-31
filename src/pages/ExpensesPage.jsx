import { useEffect } from 'react';
import DataTable from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { useExpenses } from '../hooks/useExpenses';
import { formatCurrency, formatDate } from '../utils/formatters';

function ExpensesPage() {
  const { loading, error, isUsingFallback, data: expenses } = useExpenses();

  useEffect(() => {
    console.log('[ExpensesPage] 💰 Page rendered. Loading:', loading, '| Data count:', expenses?.length || 0, '| Using fallback:', isUsingFallback);
  }, [loading, expenses, isUsingFallback]);

  if (loading) return <div className="page-container">Loading expenses from Google Sheets...</div>;
  if (error) return <div className="page-container error">{error}</div>;

  const columns = [
    { key: 'srNo', label: 'Sr. No' },
    { key: 'title', label: 'Expense Title' }
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Expenses / Spend List"
        subtitle="Track every society expense with category and vendor transparency."
      />

      {isUsingFallback ? (
        <div className="dashboard-note">Showing fallback sample data. Add env keys to fetch from Google Sheets.</div>
      ) : null}

      <DataTable columns={columns} rows={expenses} />
    </div>
  );
}

export default ExpensesPage;
