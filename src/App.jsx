import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardLayout from './layouts/DashboardLayout';
import { ToastContainer } from 'react-toastify';
import PrivateRoute from './components/PrivateRoute';
import DashboardHome from './pages/dashboard/DashboardHome';
import Groups from './pages/dashboard/Groups';
import Expenses from './pages/dashboard/Expenses';
import Settlements from './pages/dashboard/Settlements';
import Reports from './pages/dashboard/Reports';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="groups" element={<Groups />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="settlements" element={<Settlements />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
