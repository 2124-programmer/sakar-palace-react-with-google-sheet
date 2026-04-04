import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import MembersPage from '../pages/MembersPage';
import MaintenancePage from '../pages/MaintenancePage';
import ExpensesPage from '../pages/ExpensesPage';
import NoticeBoardPage from '../pages/NoticeBoardPage';
import LoginPage from '../pages/LoginPage';
import { useAuth } from '../hooks/useAuth';

const AUTH_DISABLED_FOR_TESTING = true;

function ProtectedLayout() {
  const { loading, isAuthenticated } = useAuth();

  if (AUTH_DISABLED_FOR_TESTING) {
    return <MainLayout />;
  }

  if (loading) {
    return <div className="dashboard-feedback">Checking your login session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout />;
}

function AppRouter() {
  const { isDashboardOnlyUser } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={AUTH_DISABLED_FOR_TESTING ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/members" element={isDashboardOnlyUser ? <Navigate to="/" replace /> : <MembersPage />} />
        <Route path="/maintenance" element={isDashboardOnlyUser ? <Navigate to="/" replace /> : <MaintenancePage />} />
        <Route path="/expenses" element={isDashboardOnlyUser ? <Navigate to="/" replace /> : <ExpensesPage />} />
        <Route path="/notice-board" element={isDashboardOnlyUser ? <Navigate to="/" replace /> : <NoticeBoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
