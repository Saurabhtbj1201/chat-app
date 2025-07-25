import React, { useState, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaGoogle, FaFacebook, FaGithub, FaTwitter, FaCamera } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import '../styles/auth.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const { register, handleSocialLogin } = useContext(AuthContext);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      setProfilePic(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const { firstName, lastName, email, mobile, password, confirmPassword } = formData;
    
    // Validation
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    const userData = { firstName, lastName, email, mobile, password };
    const result = await register(userData, profilePic);
    
    if (!result.success) {
      setError(result.message);
    }
    
    setLoading(false);
  };
  
  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card register-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2>Create Account</h2>
        <p className="auth-subtitle">Sign up to start chatting</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <div className="profile-pic-container">
          <div 
            className="profile-pic-wrapper"
            onClick={() => fileInputRef.current.click()}
          >
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile Preview" />
            ) : (
              <div className="profile-pic-placeholder">
                <FaCamera />
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleProfilePicChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <p>Upload Profile Picture</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="mobile">Mobile Number</label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Enter mobile number (optional)"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="social-auth">
          <p>Or sign up with</p>
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
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
