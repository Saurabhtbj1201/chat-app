import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AuthErrorModal from './Auth/AuthErrorModal';

const PrivateRoute = ({ children }) => {
  const { user, loading, authError, clearAuthError } = useContext(AuthContext);
  const location = useLocation();

  // Clear auth errors when navigating between protected routes
  useEffect(() => {
    return () => {
      if (authError) clearAuthError();
    };
  }, [location.pathname, authError, clearAuthError]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      {authError && <AuthErrorModal error={authError} onClose={clearAuthError} />}
      {children}
    </>
  );
};

export default PrivateRoute;
