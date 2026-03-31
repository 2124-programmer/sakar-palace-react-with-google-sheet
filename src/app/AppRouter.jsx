import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import MembersPage from '../pages/MembersPage';
import MaintenancePage from '../pages/MaintenancePage';
import ExpensesPage from '../pages/ExpensesPage';
import NoticeBoardPage from '../pages/NoticeBoardPage';

function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/notice-board" element={<NoticeBoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
