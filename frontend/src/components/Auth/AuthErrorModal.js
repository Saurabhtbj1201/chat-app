import React from 'react';
import { motion } from 'framer-motion';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import PropTypes from 'prop-types';

const AuthErrorModal = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <div className="auth-error-overlay">
      <motion.div 
        className="auth-error-modal"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
      >
        <div className="auth-error-header">
          <div className="auth-error-icon">
            <FaExclamationTriangle />
          </div>
          <h3>Authentication Error</h3>
          <button className="auth-error-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="auth-error-content">
          <p>{error.message}</p>
          <div className="auth-error-code">{error.code}</div>
        </div>
        <button className="auth-error-button" onClick={onClose}>
          Okay
        </button>
      </motion.div>
    </div>
  );
};

AuthErrorModal.propTypes = {
  error: PropTypes.shape({
    code: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired
  }),
  onClose: PropTypes.func.isRequired
};

export default AuthErrorModal;
