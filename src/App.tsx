import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginForm } from './components/auth/LoginForm';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { ConnectionTest } from './components/debug/ConnectionTest';

function AppContent() {
  const location = useLocation();
  const isTestMode = new URLSearchParams(location.search).get('test') === 'true';

  if (isTestMode) {
    return <ConnectionTest />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <OnboardingWizard />
        </ProtectedRoute>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;