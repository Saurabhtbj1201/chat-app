import React, { useState, useContext, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaGoogle, FaFacebook, FaGithub, FaTwitter, FaExclamationCircle } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import '../styles/auth.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, handleSocialLogin, authError, clearAuthError } = useContext(AuthContext);
  const location = useLocation();
  
  // Check for redirected state
  useEffect(() => {
    // If user was redirected from a protected route
    if (location.state?.from) {
      setError('Please log in to access this page');
    }

    // Clear any auth context errors when component mounts
    if (authError) {
      setError(authError.message || 'Authentication error');
      clearAuthError();
    }

    // Remove error cleanup from here
  }, [location, authError, clearAuthError]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }
    
    const result = await login(email, password);
    
    // Show error for wrong email or password
    if (!result.success) {
      setError(result.message || 'Invalid email or password');
    }
    
    setLoading(false);
  };
  
  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue to Chat App</p>
        
        {error && (
          <div className="auth-error">
            <FaExclamationCircle />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <div className="forgot-password">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="social-auth">
          <p>Or sign in with</p>
          <div className="social-buttons">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="social-button google"
              onClick={() => handleSocialLogin('google')}
            >
              <FaGoogle />
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="social-button facebook"
              onClick={() => handleSocialLogin('facebook')}
            >
              <FaFacebook />
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="social-button github"
              onClick={() => handleSocialLogin('github')}
            >
              <FaGithub />
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="social-button twitter"
              onClick={() => handleSocialLogin('twitter')}
            >
              <FaTwitter />
            </motion.button>
          </div>
        </div>
        
        <div className="auth-redirect">
          <p>Don't have an account? <Link to="/register">Sign Up</Link></p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
