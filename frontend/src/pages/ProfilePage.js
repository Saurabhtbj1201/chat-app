import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCamera, FaArrowLeft, FaSignOutAlt, FaUser, FaEnvelope, FaMobile } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import '../styles/profile.css';

const ProfilePage = () => {
  const { user, updateProfile, logout } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: ''
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        mobile: user.mobile || ''
      });
      
      if (user.profilePicture) {
        // Use S3 URL directly instead of going through backend
        setProfilePicPreview(user.profilePicture);
      }
    }
  }, [user]);
  
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
    setMessage('');
    setLoading(true);
    
    const result = await updateProfile(formData, profilePic);
    
    if (result.success) {
      setMessage('Profile updated successfully');
      // Reset profile pic state
      setProfilePic(null);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };
  
  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="profile-container">
      <motion.div 
        className="profile-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="profile-header">
          <Link to="/chat" className="back-button">
            <FaArrowLeft />
          </Link>
          <h2>My Profile</h2>
          <button className="logout-button" onClick={logout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
        
        {error && <div className="profile-error">{error}</div>}
        {message && <div className="profile-success">{message}</div>}
        
        <div className="profile-pic-container">
          <motion.div 
            className="profile-pic-wrapper"
            onClick={() => fileInputRef.current.click()}
            whileHover={{ scale: 1.05 }}
          >
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile" />
            ) : (
              <div className="profile-pic-placeholder">
                <FaUser />
              </div>
            )}
            <div className="profile-pic-overlay">
              <FaCamera />
            </div>
          </motion.div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleProfilePicChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <p className="profile-name">{`${user.firstName} ${user.lastName}`}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">
                <FaUser className="input-icon" />
                First Name
              </label>
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
              <label htmlFor="lastName">
                <FaUser className="input-icon" />
                Last Name
              </label>
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
            <label htmlFor="email">
              <FaEnvelope className="input-icon" />
              Email
            </label>
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
            <label htmlFor="mobile">
              <FaMobile className="input-icon" />
              Mobile Number
            </label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Enter mobile number"
            />
          </div>
          
          <motion.button 
            type="submit" 
            className="profile-button"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
