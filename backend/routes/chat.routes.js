const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

// Create or access one-to-one chat
router.post('/', protect, chatController.accessChat);

// Get all chats for a user
router.get('/', protect, chatController.fetchChats);

// Create group chat
router.post('/group', protect, chatController.createGroupChat);

// Rename group chat
router.put('/group/rename', protect, chatController.renameGroupChat);

// Add user to group
router.put('/group/add', protect, chatController.addToGroup);

// Remove user from group
router.put('/group/remove', protect, chatController.removeFromGroup);

module.exports = router;
