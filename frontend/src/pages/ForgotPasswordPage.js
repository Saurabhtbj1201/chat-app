import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaExclamationTriangle, FaInfo } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import '../styles/auth.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');
  const [isDevMode, setIsDevMode] = useState(false);
  
  const { forgotPassword } = useContext(AuthContext);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevResetUrl('');
    setIsDevMode(false);
    setLoading(true);
    
    if (!email) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }
    
    try {
      const result = await forgotPassword(email);
      
      if (result.success) {
        setMessage('Password reset link has been sent to your email');
        setEmail('');
      } else if (result.resetUrl) {
        // This is a development mode response with a direct reset URL
        setDevResetUrl(result.resetUrl);
        setIsDevMode(true);
        
        if (result.devMode) {
          setMessage('Development mode: Email service is not fully configured. Use the link below:');
        } else {
          setMessage('Email service encountered an error. Use the development link below:');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Forgot password error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card forgot-password-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <Link to="/login" className="back-link">
            <FaArrowLeft />
          </Link>
          <h2>Forgot Password</h2>
        </div>
        
        <p className="auth-subtitle">Enter your email to reset your password</p>
        
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        
        {isDevMode && (
          <div className="dev-reset-container">
            <div className="dev-reset-notice">
              <FaExclamationTriangle />
              <span>Development Mode</span>
            </div>
            <p className="dev-reset-info">
              <FaInfo /> Email sending is skipped in development mode when email is not configured.
            </p>
            <a href={devResetUrl} className="dev-reset-link" target="_blank" rel="noopener noreferrer">
              Click here to reset password
            </a>
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
          
          <motion.button 
            type="submit" 
            className="auth-button"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </motion.button>
        </form>
        
        <div className="auth-redirect">
          <p>Remember your password? <Link to="/login">Sign In</Link></p>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
