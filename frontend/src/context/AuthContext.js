import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  // Memoize the logout function with useCallback
  const logout = useCallback(async () => {
    try {
      // Call logout API if user is authenticated
      if (token) {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/logout`);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setAuthError(null);
      navigate('/login');
    }
  }, [token, navigate]);

  // Set up axios interceptors for handling auth errors
  useEffect(() => {
    // Set default header if token exists
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }

    // Response interceptor for handling auth errors
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        // Handle authentication errors
        if (error.response && [401, 403].includes(error.response.status)) {
          const errorCode = error.response.data?.code;
          
          // Handle specific error codes
          if (['EXPIRED_TOKEN', 'INVALID_TOKEN', 'USER_NOT_FOUND'].includes(errorCode)) {
            console.warn('Authentication error:', error.response.data.message);
            logout();
          }
          
          setAuthError({
            code: errorCode || 'AUTH_ERROR',
            message: error.response.data?.message || 'Authentication failed'
          });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      // Clean up interceptor on unmount
      axios.interceptors.response.eject(interceptor);
    };
  }, [token, logout]);

  // Check if user is logged in
  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/me`);
        setUser(res.data);
        setAuthError(null);
        setLoading(false);
      } catch (error) {
        console.error('Failed to verify user:', error.response?.data?.message || error.message);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setLoading(false);
        
        // Set auth error for displaying to user
        if (error.response?.data) {
          setAuthError({
            code: error.response.data.code || 'VERIFICATION_FAILED',
            message: error.response.data.message || 'Failed to verify your authentication'
          });
        }
      }
    };

    verifyUser();
  }, [token]);

  // Register user
  const register = async (userData, profilePicture) => {
    try {
      setAuthError(null);
      const formData = new FormData();
      
      for (const key in userData) {
        formData.append(key, userData[key]);
      }
      
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }
      
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/register`, formData);
      
      setToken(res.data.token);
      setUser(res.data.user);
      
      localStorage.setItem('token', res.data.token);
      
      navigate('/chat');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      const errorCode = error.response?.data?.code || 'REGISTRATION_FAILED';
      
      setAuthError({ code: errorCode, message: errorMessage });
      
      return { 
        success: false, 
        message: errorMessage,
        code: errorCode
      };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setAuthError(null);
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        email,
        password
      });
      
      setToken(res.data.token);
      setUser(res.data.user);
      
      localStorage.setItem('token', res.data.token);
      
      navigate('/chat');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      const errorCode = error.response?.data?.code || 'LOGIN_FAILED';
      
      setAuthError({ code: errorCode, message: errorMessage });
      
      return { 
        success: false, 
        message: errorMessage,
        code: errorCode
      };
    }
  };

  // Clear auth errors
  const clearAuthError = () => {
    setAuthError(null);
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/forgot-password`, { email });
      
      // Handle development mode response
      if (res.data.resetUrl) {
        return { 
          success: false, 
          message: res.data.message,
          resetUrl: res.data.resetUrl,
          devMode: res.data.devMode
        };
      }
      
      return { success: true };
    } catch (error) {
      // Check if this is a development environment response with a reset URL
      if (error.response?.status === 500 && error.response?.data?.resetUrl) {
        return { 
          success: false, 
          message: error.response.data.message,
          resetUrl: error.response.data.resetUrl
        };
      }
      
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to send reset email' 
      };
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/reset-password/${token}`, { password });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Password reset failed' 
      };
    }
  };

  // Social login handler
  const handleSocialLogin = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/${provider}`;
  };

  // Update user profile
  const updateProfile = async (userData, profilePicture) => {
    try {
      const formData = new FormData();
      
      for (const key in userData) {
        formData.append(key, userData[key]);
      }
      
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }
      
      const res = await axios.put(`${process.env.REACT_APP_API_URL}/api/users/profile`, formData);
      
      setUser(res.data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Profile update failed' 
      };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      authError,
      clearAuthError,
      register,
      login,
      logout,
      forgotPassword,
      resetPassword,
      handleSocialLogin,
      updateProfile,
      isAuthenticated: !!user && !!token,
      setUser, // Keep for compatibility
      setToken // Keep for compatibility
    }}>
      {children}
    </AuthContext.Provider>
  );
};
