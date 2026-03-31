function Badge({ type = 'default', children }) {
  return <span className={`badge badge-${type.toLowerCase()}`}>{children}</span>;
}

export default Badge;
