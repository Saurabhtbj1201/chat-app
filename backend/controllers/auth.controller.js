const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const sendEmail = require('../services/email.service');
const { uploadFile } = require('../services/s3.service');
const mongoose = require('mongoose');

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
    
    // Create temporary user ID for the file name
    const tempUserId = new mongoose.Types.ObjectId();
    
    // Default profile picture URL (from model schema default)
    let profilePicture;
    
    // Upload profile picture if provided
    if (req.file) {
      try {
        console.log('Uploading profile picture for new user');
        profilePicture = await uploadFile(req.file, tempUserId);
        console.log('Uploaded to:', profilePicture);
      } catch (uploadError) {
        console.error('Error uploading profile picture during registration:', uploadError);
        // Continue registration with default avatar
      }
    }
    
    // Create new user
    const user = await User.create({
      _id: tempUserId, // Use the same ID we used for the file
      firstName,
      lastName,
      email,
      mobile,
      password,
      ...(profilePicture && { profilePicture }) // Only set if we have a URL
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
    console.error('Registration error:', error);
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

// Forgot password controller - update to handle email responses better
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User with that email does not exist' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set expire time (10 minutes)
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    
    await user.save();
    
    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    // Create email message
    const message = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset for your Chat App account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link is valid for 10 minutes.</p>
      <p>If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
    `;
    
    // Send email
    try {
      const result = await sendEmail({
        to: user.email,
        subject: 'Chat App - Password Reset',
        html: message
      });
      
      // Handle successful email send
      if (result.success) {
        // If it's a test account, return the preview URL
        if (result.testAccount && result.previewUrl) {
          return res.status(200).json({
            success: true,
            message: 'Email service using test account. Check the preview URL.',
            resetUrl: result.previewUrl,
            devMode: true
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Password reset email sent successfully' 
        });
      }
    } catch (emailError) {
      console.error('Email error:', emailError);
      
      // Reset tokens in the database so they cannot be used
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      // In development, still provide the reset URL directly
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          success: false,
          message: 'Failed to send email, but development mode is active. Use the direct link below.',
          resetUrl,
          error: emailError.message
        });
      }
      
      return res.status(500).json({
        message: 'Error sending password reset email. Please try again or contact support.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
