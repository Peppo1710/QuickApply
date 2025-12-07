import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('profileToken');
  console.log("🟡 [FRONTEND] ProtectedRoute check");
  console.log("🟡 [FRONTEND] Current path:", window.location.pathname);
  console.log("🟡 [FRONTEND] Token in localStorage:", token ? `${token.substring(0, 50)}...` : "null");
  console.log("🟡 [FRONTEND] Token exists:", token ? "YES" : "NO");

  if (!token) {
    console.log("🔴 [FRONTEND] ProtectedRoute: No token, redirecting to /login");
  } else {
    console.log("🟢 [FRONTEND] ProtectedRoute: Token found, allowing access");
  }

  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
