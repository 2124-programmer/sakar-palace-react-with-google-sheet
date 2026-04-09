import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, formatDate } from '../utils/formatters';

const statusClassByValue = {
  open: 'status-open',
  'in progress': 'status-progress',
  resolved: 'status-resolved'
};

function DashboardPage() {
  const { loading, error, isUsingFallback, data } = useDashboardData();

  useEffect(() => {
    console.log('[DashboardPage] render state', {
      loading,
      hasError: Boolean(error),
      isUsingFallback,
      announcements: data?.announcements?.length || 0,
      events: data?.events?.length || 0,
      complaints: data?.complaints?.length || 0
    });
  }, [loading, error, isUsingFallback, data]);

  if (loading) {
    return <div className="dashboard-feedback">Loading home dashboard from Google Sheets...</div>;
  }

  const complaints = data?.complaints || [];
  const emergencyContacts = data?.emergencyContacts || [];
  const announcements = data?.announcements || [];
  const complaintCount = complaints.length;
  const stats = data.stats || {};
  const maintenanceSummary = data.maintenanceSummary || {};
  const pendingMembersList = maintenanceSummary.pendingMembersList || [];
  const advancedMembersList = maintenanceSummary.advancedMembersList || [];
  const totalPendingAmount = maintenanceSummary.totalPendingAmount || 0;
  const totalAdvancedAmount = maintenanceSummary.totalAdvancedAmount || 0;

  const getStatusClass = (status) => {
    const key = String(status || '').trim().toLowerCase();
    return statusClassByValue[key] || 'status-open';
  };

  return (
    <div className="dashboard-home">
      <section className="home-hero">
        <img
          src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1920&q=80"
          alt="Society building"
        />
      </section>

      {isUsingFallback ? (
        <div className="dashboard-note">Showing fallback sample data. Add env keys to fetch from Google Sheets.</div>
      ) : null}

      {error ? <div className="dashboard-note warning">{error}</div> : null}

      <section className="home-stats home-stats-row">
        <article className="mini-stat">
          <p>Total Flats</p>
          <strong>{stats.totalFlats}</strong>
        </article>
        <article className="mini-stat occupied">
          <p>Maintenance Advanced</p>
          <strong>{formatCurrency(stats.totalMaintenanceAdvanced)}</strong>
        </article>
        <article className="mini-stat dues">
          <p>Complaints Summary</p>
          <strong>{`${stats.activeComplaints} / ${stats.inProgressComplaints} / ${stats.resolvedComplaints}`}</strong>
          <p className="dashboard-bottom-note">Active / In Progress / Resolved</p>
        </article>
        <article className="mini-stat vacant">
          <p>Light Bill</p>
          <strong>{stats.lightBillForActiveMonth || '-'}</strong>
        </article>
      </section>

      <section className="dashboard-card-grid dashboard-card-grid-two">
        <article className="home-card dashboard-card compact-card">
          <h3>Current Month Details : {stats.activeMonth || '-'}</h3>
          <div className="table-shell dashboard-table-shell">
            <table className="dashboard-mini-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                
                <tr>
                  <td>Maintenance/Head</td>
                  <td>{formatCurrency(stats.currentMonthMaintenancePerHead)}</td>
                </tr>
                <tr>
                  <td>Maintainance paid by</td>
                  <td>{stats.maintenancePaidMembers} Members</td>
                </tr>
                <tr>
                  <td>Pending Members</td>
                  <td>{stats.pendingMembers}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
        <article className="home-card dashboard-card compact-card">
          <h3>IMP Contacts</h3>
          <div className="table-shell dashboard-table-shell">
            <table className="dashboard-mini-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Name</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {emergencyContacts.map((item) => (
                  <tr key={item.id}>
                    <td>{item.role}</td>
                    <td>{item.title || '-'}</td>
                    <td>{item.contact || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="home-card dashboard-card compact-card">
          <div className="card-header-inline">
            <div>
              <h3>Maintainance Pending List</h3>
              <small>{stats.activeMonth ? `Month: ${stats.activeMonth}` : 'Active month pending'}</small>
            </div>
            <span className="dashboard-chip">{pendingMembersList.length}</span>
          </div>
          {pendingMembersList.length > 0 ? (
            <>
              <div className="table-shell dashboard-table-shell">
                <table className="dashboard-mini-table">
                  <thead>
                    <tr>
                      <th>Flat No</th>
                      <th>Resident</th>
                      <th>Pending Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingMembersList.map((member) => (
                      <tr key={member.id}>
                        <td>{member.flatNo}</td>
                        <td>{member.resident}</td>
                        <td>{formatCurrency(member.pendingAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="dashboard-bottom-note">
                Total pending amount: {formatCurrency(totalPendingAmount)}
              </p>
            </>
          ) : (
            <p className="dashboard-bottom-note">No pending members for the active month.</p>
          )}
        </article>

        <article className="home-card dashboard-card compact-card">
          <div className="card-header-inline">
            <h3>Advanced Maintenance List</h3>
            <span className="dashboard-chip">{advancedMembersList.length}</span>
          </div>
          {advancedMembersList.length > 0 ? (
            <>
              <div className="table-shell dashboard-table-shell">
                <table className="dashboard-mini-table">
                  <thead>
                    <tr>
                      <th>Flat No</th>
                      <th>Resident</th>
                      <th>Advanced Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advancedMembersList.map((member) => (
                      <tr key={member.id}>
                        <td>{member.flatNo}</td>
                        <td>{member.resident}</td>
                        <td>{formatCurrency(member.advancedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="dashboard-bottom-note">
                Total advanced amount: {formatCurrency(totalAdvancedAmount)}
              </p>
            </>
          ) : (
            <p className="dashboard-bottom-note">No advanced payments captured yet.</p>
          )}
        </article>

        

        <article className="home-card dashboard-card compact-card">
          <div className="card-header-inline">
            <h3>Recent Complaints</h3> ( for now its Dummy Data, will integrate with live data soon )
            <span className="dashboard-chip">{complaintCount} Active</span>
          </div>
          <ul className="complaint-list">
            {complaints.slice(0, 3).map((complaint) => (
              <li key={complaint.id}>
                <span>{complaint.title}</span>
                <span className={`status-pill ${getStatusClass(complaint.status)}`}>
                  {complaint.status}
                </span>
              </li>
            ))}
          </ul>
          <Link className="action-button action-alt" to="/notice-board">
            Report an Issue
          </Link>
        </article>
      </section>

      {announcements.length > 0 ? (
        <section className="home-card announcement-strip">
          <div className="card-header-inline">
            <h3>Latest Announcements</h3>
            <Link className="card-link" to="/notice-board">
              View All
            </Link>
          </div>
          <ul className="home-list announcement-list">
            {announcements.slice(0, 3).map((announcement) => (
              <li key={announcement.id}>
                <p className="list-title">{announcement.title}</p>
                <small>{formatDate(announcement.date)}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default DashboardPage;
