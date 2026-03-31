import { useMemo, useState } from 'react';
import Badge from '../components/common/Badge';
import PageHeader from '../components/common/PageHeader';
import { notices } from '../data/societyData';
import { formatDate } from '../utils/formatters';

function NoticeBoardPage() {
  const [noticeFilter, setNoticeFilter] = useState('All');

  const filteredNotices = useMemo(() => {
    if (noticeFilter === 'All') return notices;
    return notices.filter((notice) => notice.type === noticeFilter);
  }, [noticeFilter]);

  return (
    <div className="page-container">
      <PageHeader
        title="Notice Board"
        subtitle="General announcements, urgent alerts, and meeting communication."
      />

      <div className="toolbar">
        <label>
          Filter
          <select value={noticeFilter} onChange={(event) => setNoticeFilter(event.target.value)}>
            <option value="All">All</option>
            <option value="General">General</option>
            <option value="Urgent">Urgent</option>
            <option value="Meeting">Meeting</option>
          </select>
        </label>
      </div>

      <section className="notice-grid">
        {filteredNotices.map((notice) => (
          <article className="notice-card" key={notice.id}>
            <div className="notice-card-header">
              <h3>{notice.title}</h3>
              <Badge type={notice.type === 'Urgent' ? 'danger' : 'default'}>{notice.type}</Badge>
            </div>
            <p>{notice.content}</p>
            <small>{formatDate(notice.date)}</small>
          </article>
        ))}
      </section>
    </div>
  );
}

export default NoticeBoardPage;
