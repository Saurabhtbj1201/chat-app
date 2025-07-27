const User = require('../models/user.model');
const { uploadFile, deleteFile } = require('../services/s3.service');
const mongoose = require('mongoose');

// Get all users or search users
exports.getUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { firstName: { $regex: req.query.search, $options: 'i' } },
            { lastName: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    // Find all users except current user
    const users = await User.find(keyword)
      .find({ _id: { $ne: req.user._id } })
      .select('-password');
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update profile fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.mobile = mobile || user.mobile;
    
    // Update profile picture if uploaded
    if (req.file) {
      try {
        console.log('Uploading new profile picture for user:', user._id);
        
        // If user already has a profile picture that's not the default, delete it from S3
        if (user.profilePicture && !user.profilePicture.includes('default-avatar')) {
          try {
            console.log('Attempting to delete old profile picture:', user.profilePicture);
            await deleteFile(user.profilePicture);
          } catch (deleteError) {
            console.error('Error deleting old profile picture:', deleteError);
            // Continue even if delete fails
          }
        }
        
        // Upload new profile picture to S3
        const profilePictureUrl = await uploadFile(req.file, user._id);
        console.log('Profile picture uploaded successfully:', profilePictureUrl);
        user.profilePicture = profilePictureUrl;
      } catch (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return res.status(500).json({ 
          message: 'Failed to upload profile picture', 
          error: uploadError.message 
        });
      }
    }
    
    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      profilePicture: updatedUser.profilePicture
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user status
exports.updateStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isOnline = isOnline;
    user.lastSeen = Date.now();
    
    await user.save();
    
    res.json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
