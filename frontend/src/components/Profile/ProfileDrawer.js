import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { FaTimes, FaEnvelope, FaMobile, FaTrash } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';

const ProfileDrawer = ({ chat, onClose, onDeleteContact }) => {
  const { user } = useContext(AuthContext);
  
  // Get contact user from chat participants
  const getContactUser = () => {
    if (!chat || !user) return null;
    
    if (!chat.isGroupChat) {
      return chat.participants.find(p => p._id !== user._id);
    }
    return null;
  };
  
  const contactUser = getContactUser();
  
  return (
    <motion.div 
      className="profile-drawer"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className="profile-drawer-header">
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>
        <h3>Contact Profile</h3>
      </div>
      
      <div className="profile-drawer-content">
        {contactUser && (
          <div className="contact-profile-container">
            <img 
              src={contactUser.profilePicture 
                ? `${process.env.REACT_APP_API_URL}/uploads/${contactUser.profilePicture}` 
                : '/default-avatar.png'} 
              alt={`${contactUser.firstName} ${contactUser.lastName}`} 
              className="contact-profile-picture"
            />
            <h2>{contactUser.firstName} {contactUser.lastName}</h2>
            
            <div className="contact-info-container">
              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <FaEnvelope />
                </div>
                <div className="contact-info-details">
                  <div className="contact-info-label">Email</div>
                  <div className="contact-info-value">{contactUser.email}</div>
                </div>
              </div>
              
              {contactUser.mobile && (
                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <FaMobile />
                  </div>
                  <div className="contact-info-details">
                    <div className="contact-info-label">Mobile</div>
                    <div className="contact-info-value">{contactUser.mobile}</div>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              className="delete-contact-btn"
              onClick={() => {
                if (chat) {
                  onDeleteContact(chat._id);
                  onClose();
                }
              }}
            >
              <FaTrash />
              Delete Contact
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

ProfileDrawer.propTypes = {
  chat: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onDeleteContact: PropTypes.func.isRequired
};

export default ProfileDrawer;
