const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

exports.protect = async (req, res, next) => {
  let token;

  try {
    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          status: 'error',
          code: 'USER_NOT_FOUND',
          message: 'The user belonging to this token no longer exists' 
        });
      }
      
      // Check if user account is active
      if (user.isDeactivated) {
        return res.status(401).json({ 
          status: 'error',
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated' 
        });
      }
      
      req.user = user;
      next();
    } else {
      return res.status(401).json({ 
        status: 'error',
        code: 'NO_TOKEN',
        message: 'Authentication token is missing' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error',
        code: 'EXPIRED_TOKEN',
        message: 'Your authentication token has expired' 
      });
    }
    
    return res.status(500).json({ 
      status: 'error',
      code: 'SERVER_ERROR',
      message: 'Authentication failed due to server error' 
    });
  }
};

// Additional middleware for admin-only routes
exports.adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      status: 'error',
      code: 'ADMIN_REQUIRED',
      message: 'This action requires administrator privileges'
    });
  }
  next();
};
