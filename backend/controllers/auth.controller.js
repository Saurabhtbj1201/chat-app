const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const sendEmail = require('../services/email.service');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Register user
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password } = req.body;
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create profile picture path if uploaded
    let profilePicture = 'default-avatar.png';
    if (req.file) {
      profilePicture = req.file.filename;
    }
    
    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      mobile,
      password,
      profilePicture
    });
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update online status
    user.isOnline = true;
    user.lastSeen = Date.now();
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(200).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    // Update user status
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: Date.now()
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    // Set token expire time (10 minutes)
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    
    await user.save();
    
    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    // Send email
    const message = `
      <h1>You requested a password reset</h1>
      <p>Please click on the following link to reset your password:</p>
      <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    
    try {
      const emailResult = await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: message
      });
      
      // Handle development mode
      if (emailResult.devMode) {
        return res.status(200).json({ 
          message: 'Development mode: Reset email not sent. Check server logs for details.',
          resetUrl,
          devMode: true
        });
      }
      
      res.status(200).json({ message: 'Email sent successfully. Please check your inbox.' });
    } catch (emailError) {
      // If email fails, undo the token setting
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      console.error('Email error details:', emailError);
      
      // For development environment, provide a direct reset link
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({ 
          message: 'Failed to send email. Email service not configured properly.',
          resetUrl,
          devNote: 'This reset URL is only provided in development mode for testing.'
        });
      }
      
      return res.status(500).json({ 
        message: 'Failed to send reset email. Please try again later or contact support.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error processing your request', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;
    
    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    // Find user with token and valid expire time
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // Generate new token
    const newToken = generateToken(user._id);
    
    res.status(200).json({
      token: newToken,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Social login success handler
exports.socialLoginSuccess = (req, res) => {
  const token = generateToken(req.user._id);
  
  // Redirect to frontend with token
  res.redirect(`${process.env.CLIENT_URL}/social-auth-success?token=${token}`);
};
