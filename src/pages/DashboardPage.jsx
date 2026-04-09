import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAppRole } from '../hooks/useAppRole';
import { useExpenses } from '../hooks/useExpenses';
import { formatCurrency, formatDate } from '../utils/formatters';

const statusClassByValue = {
  open: 'status-open',
  'in progress': 'status-progress',
  resolved: 'status-resolved'
};

function DashboardPage() {
  const { loading, error, isUsingFallback, data } = useDashboardData();
  const { isAdmin } = useAppRole();
  const { data: expenseData } = useExpenses();

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

  // Compute current-month expense total from expenses hook
  const activeMonthLabel = String(stats.activeMonth || '').split('-')[0]; // "Mar-26" → "Mar"
  const expenseRecords = expenseData?.records || [];
  const currentMonthExpenseTotal = expenseRecords
    .filter((r) => r.month === activeMonthLabel)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const buildWhatsAppUrl = (message) =>
    `https://wa.me/?text=${encodeURIComponent(message)}`;

  const sendMaintenanceReminder = () => {
    const month = stats.activeMonth || '-';
    const perHead = formatCurrency(stats.currentMonthMaintenancePerHead);
    const msg =
      `🏠 *Sakar Palace B – Maintenance Reminder*\n` +
      `📅 Month: ${month}\n\n` +
      `Dear Residents,\n` +
      `Please pay your maintenance for *${month}*.\n\n` +
      `💰 Amount per Head: *${perHead}*\n\n` +
      `Kindly pay at the earliest.\n` +
      `Thank you! 🙏`;
    window.open(buildWhatsAppUrl(msg), '_blank', 'noopener,noreferrer');
  };

  const sendPendingMembersMessage = () => {
    const month = stats.activeMonth || '-';
    const lines = pendingMembersList.map(
      (m) => `• ${m.flatNo} | ${m.resident} | ${formatCurrency(m.pendingAmount)}`
    );
    const msg =
      `🏠 *Sakar Palace B – Pending Maintenance*\n` +
      `📅 Month: ${month}\n\n` +
      (lines.length > 0
        ? `Following members have pending dues:\n${lines.join('\n')}\n\n` +
          `💰 Total Pending: *${formatCurrency(totalPendingAmount)}*`
        : `✅ All members have paid for ${month}.`) +
      `\n\nPlease clear dues at the earliest. 🙏`;
    window.open(buildWhatsAppUrl(msg), '_blank', 'noopener,noreferrer');
  };

  const sendExpensesSummary = () => {
    const month = stats.activeMonth || '-';
    const total = formatCurrency(currentMonthExpenseTotal);
    const lines = expenseRecords
      .filter((r) => r.month === activeMonthLabel)
      .map((r) => `• ${r.title} – ${formatCurrency(r.amount)}`);
    const msg =
      `🏠 *Sakar Palace B – Expense Summary*\n` +
      `📅 Month: ${month}\n\n` +
      (lines.length > 0
        ? `Expenses for *${month}*:\n${lines.join('\n')}\n\n`
        : `No expenses recorded for ${month}.\n\n`) +
      `💰 Total: *${total}*\n\nThank you! 🙏`;
    window.open(buildWhatsAppUrl(msg), '_blank', 'noopener,noreferrer');
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

      {isAdmin ? (
        <section className="home-card whatsapp-notify-section">
          <div className="card-header-inline">
            <h3>📲 WhatsApp Notifications</h3>
            <span className="dashboard-chip">{stats.activeMonth || '-'}</span>
          </div>
          <p className="dashboard-bottom-note" style={{ marginBottom: '16px' }}>
            Send pre-composed messages to the society WhatsApp group. Click a button, WhatsApp will open with the message ready — select your group and send.
          </p>
          <div className="whatsapp-notify-grid">
            <div className="whatsapp-notify-card">
              <div className="whatsapp-notify-icon">💰</div>
              <div className="whatsapp-notify-body">
                <strong>Maintenance Reminder</strong>
                <p>Per-head amount for {stats.activeMonth || 'current month'}: <b>{formatCurrency(stats.currentMonthMaintenancePerHead)}</b></p>
              </div>
              <button
                type="button"
                className="whatsapp-btn"
                onClick={sendMaintenanceReminder}
              >
                Send via WhatsApp
              </button>
            </div>

            <div className="whatsapp-notify-card">
              <div className="whatsapp-notify-icon">⚠️</div>
              <div className="whatsapp-notify-body">
                <strong>Pending Members</strong>
                <p>
                  {pendingMembersList.length > 0
                    ? `${pendingMembersList.length} member(s) pending · Total: ${formatCurrency(totalPendingAmount)}`
                    : `All members paid for ${stats.activeMonth || 'this month'}`}
                </p>
              </div>
              <button
                type="button"
                className="whatsapp-btn"
                onClick={sendPendingMembersMessage}
              >
                Send via WhatsApp
              </button>
            </div>

            <div className="whatsapp-notify-card">
              <div className="whatsapp-notify-icon">📋</div>
              <div className="whatsapp-notify-body">
                <strong>Expense Summary</strong>
                <p>Total expenses for {stats.activeMonth || 'current month'}: <b>{formatCurrency(currentMonthExpenseTotal)}</b></p>
              </div>
              <button
                type="button"
                className="whatsapp-btn"
                onClick={sendExpensesSummary}
              >
                Send via WhatsApp
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default DashboardPage;
