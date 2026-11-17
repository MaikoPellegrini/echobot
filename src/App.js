// src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import TermosDeUso from './pages/TermosDeUso';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="full-page-loader">
        <div className="spinner-ring" />
        <p className="loader-text">Carregando EchoBot...</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="full-page-loader">
        <div className="spinner-ring" />
        <p className="loader-text">Carregando EchoBot...</p>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  const { authError } = useAuth();

  return (
    <>
      {authError && (
        <div className="auth-status-error" role="alert">
          <span>{authError}</span>
          <button type="button" className="btn-outline" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/termos" element={<TermosDeUso />} />
        <Route path="/privacidade" element={<PoliticaPrivacidade />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
