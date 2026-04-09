import { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { useMembers } from '../hooks/useMembers';

function MembersPage() {
  const { loading, error, isUsingFallback, data: members } = useMembers();
  const [occupancyFilter, setOccupancyFilter] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    console.log('[MembersPage] 📄 Page rendered. Loading:', loading, '| Data count:', members?.length || 0, '| Using fallback:', isUsingFallback);
  }, [loading, members, isUsingFallback]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return members.filter((member) => {
      const matchesType = occupancyFilter === 'All' || String(member.occupancyType || '').toLowerCase().includes(occupancyFilter.toLowerCase());
      const matchesSearch =
        !normalizedQuery ||
        String(member.flatNo || '').toLowerCase().includes(normalizedQuery) ||
        String(member.residentName || '').toLowerCase().includes(normalizedQuery);

      return matchesType && matchesSearch;
    });
  }, [occupancyFilter, query, members]);

  if (loading) return <div className="page-container">Loading members from Google Sheets...</div>;

  const columns = [
    { key: 'wing', label: 'Wing / Tower' },
    { key: 'flatNo', label: 'Flat No' },
    { key: 'residentName', label: 'Resident Name' },
    { key: 'occupancyType', label: 'Occupancy Type' },
    { key: 'role', label: 'Role' },
    {
      key: 'contact',
      label: 'Contact',
      renderCell: (value) => value || '—'
    },
    {
      key: 'familyMembers',
      label: 'Family Members',
      renderCell: (_, row) => (Array.isArray(row.familyMembers) ? row.familyMembers.join(', ') : row.familyMembers || '—')
    }
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="All Members"
        subtitle="View resident details with search and owner/tenant filters."
      />

      {isUsingFallback ? (
        <div className="dashboard-note">Showing fallback sample data. Add env keys to fetch from Google Sheets.</div>
      ) : null}

      {error ? (
        <div className="dashboard-note warning">{error}</div>
      ) : null}

      <div className="toolbar">
        <label>
          Filter
          <select value={occupancyFilter} onChange={(event) => setOccupancyFilter(event.target.value)}>
            <option value="All">All</option>
            <option value="Owner">Owner</option>
            <option value="Tenant">Tenant</option>
          </select>
        </label>

        <label>
          Search
          <input
            type="search"
            placeholder="Search by flat or name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <DataTable columns={columns} rows={filteredMembers} />
    </div>
  );
}

export default MembersPage;
