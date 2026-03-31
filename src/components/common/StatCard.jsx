function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
    </article>
  );
}

export default StatCard;
