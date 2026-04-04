import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function LoginPage() {
  const { isAuthenticated, loading, login, testCredentials, isTestUserEnabled } = useAuth();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <div className="dashboard-feedback">Preparing login...</div>;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const result = await login({ mobile, code });
      if (!result.success) {
        setError(result.message || 'Login failed.');
      }
    } catch {
      setError('Unable to login right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Society Portal Login</h1>
        <p>Login using your registered mobile number and 6-digit code.</p>
        <div className={`auth-test-user-note${isTestUserEnabled ? '' : ' warning'}`}>
          Test User Status: {isTestUserEnabled ? 'Enabled' : 'Disabled'}
        </div>
        {testCredentials ? (
          <div className="auth-test-user-note">
            Dashboard Test User: {testCredentials.mobile} / {testCredentials.code}
          </div>
        ) : null}

        {error ? <div className="dashboard-note warning">{error}</div> : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Mobile Number
            <input
              type="tel"
              value={mobile}
              maxLength={10}
              placeholder="Enter mobile number"
              onChange={(event) => setMobile(event.target.value.replace(/\D/g, ''))}
            />
          </label>

          <label>
            6-Digit Code
            <input
              type="password"
              value={code}
              maxLength={6}
              placeholder="Enter 6-digit code"
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          </label>

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing In...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;