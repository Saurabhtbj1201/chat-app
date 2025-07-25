import React, { useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const SocialAuthSuccess = () => {
  const { setUser, setToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleSocialLogin = () => {
      const query = new URLSearchParams(location.search);
      const token = query.get('token');
      
      if (token) {
        // Store token in localStorage
        localStorage.setItem('token', token);
        setToken(token);
        
        // Fetch user data
        const fetchUser = async () => {
          try {
            // This assumes you have a method to fetch user data using the token
            // You might need to adjust this based on your actual implementation
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
              navigate('/chat');
            } else {
              // If token is invalid, redirect to login
              navigate('/login');
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            navigate('/login');
          }
        };
        
        fetchUser();
      } else {
        navigate('/login');
      }
    };
    
    handleSocialLogin();
  }, [location, navigate, setToken, setUser]);

  return (
    <div className="social-auth-success">
      <div className="loading-spinner"></div>
      <p>Completing login, please wait...</p>
    </div>
  );
};

export default SocialAuthSuccess;
