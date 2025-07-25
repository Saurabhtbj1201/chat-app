const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const upload = require('../middleware/upload.middleware');
const { protect } = require('../middleware/auth.middleware');

// Get all users or search users
router.get('/', protect, userController.getUsers);

// Get user by ID
router.get('/:id', protect, userController.getUserById);

// Update user profile
router.put('/profile', protect, upload.single('profilePicture'), userController.updateProfile);

// Set user online/offline status
router.put('/status', protect, userController.updateStatus);

module.exports = router;
