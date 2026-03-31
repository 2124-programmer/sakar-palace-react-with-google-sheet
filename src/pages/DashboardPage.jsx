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

  const complaintCount = data.complaints.length;

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
          <strong>{data.stats.totalFlats}</strong>
        </article>
        <article className="mini-stat occupied">
          <p>Occupied</p>
          <strong>{data.stats.occupiedFlats}</strong>
        </article>
        <article className="mini-stat dues">
          <p>Pending Dues</p>
          <strong>{formatCurrency(data.stats.pendingDues)}</strong>
        </article>
        <article className="mini-stat vacant">
          <p>Vacant Flats</p>
          <strong>{data.stats.vacantFlats}</strong>
        </article>
      </section>

      <section className="dashboard-card-grid dashboard-card-grid-two">
        <article className="home-card dashboard-card compact-card">
          <h3>Emergency Contacts</h3>
          <ul className="contact-list emergency-list">
            {data.emergencyContacts.map((item) => (
              <li key={item.id}>
                <span>{item.role}</span>
                <strong>{item.phone}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="home-card dashboard-card compact-card">
          <h3>Maintenance Dues</h3>
          <p className="info-line">
            Due Amount: <strong>{formatCurrency(data.maintenanceSummary.dueAmount)}</strong>
          </p>
          <p className="info-line">
            Last Payment: <strong>{formatCurrency(data.maintenanceSummary.lastPaymentAmount)}</strong> on{' '}
            {formatDate(data.maintenanceSummary.lastPaymentDate)}
          </p>
          <Link className="action-button" to="/maintenance">
            Pay Now
          </Link>
        </article>
      </section>

      <section className="dashboard-card-grid dashboard-card-grid-two">
        <article className="home-card dashboard-card compact-card">
          <div className="card-header-inline">
            <h3>Recent Complaints</h3>
            <span className="dashboard-chip">{complaintCount} Active</span>
          </div>
          <ul className="complaint-list">
            {data.complaints.slice(0, 3).map((complaint) => (
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

        <article className="home-card dashboard-card compact-card">
          <h3>Upcoming Events</h3>
          <ul className="home-list event-list">
            {data.events.slice(0, 4).map((event) => (
              <li key={event.id}>
                <p className="list-title">{event.title}</p>
                <small>{formatDate(event.date)}</small>
              </li>
            ))}
          </ul>
          <button type="button" className="ghost-button">View Calendar</button>
        </article>
      </section>

      {data.announcements.length > 0 ? (
        <section className="home-card announcement-strip">
          <div className="card-header-inline">
            <h3>Latest Announcements</h3>
            <Link className="card-link" to="/notice-board">
              View All
            </Link>
          </div>
          <ul className="home-list announcement-list">
            {data.announcements.slice(0, 3).map((announcement) => (
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
