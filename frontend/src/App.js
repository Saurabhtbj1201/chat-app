import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './styles/App.css';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import SocialAuthSuccess from './pages/SocialAuthSuccess';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/social-auth-success" element={<SocialAuthSuccess />} />
          <Route path="/" element={<Navigate to="/chat" replace />} />
          
          <Route path="/chat" element={
            <PrivateRoute>
              <ChatProvider>
                <ChatPage />
              </ChatProvider>
            </PrivateRoute>
          } />
          
          <Route path="/profile" element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;
