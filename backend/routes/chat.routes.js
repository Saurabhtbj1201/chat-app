const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all chats for a user
router.get('/', protect, chatController.fetchChats); // Use fetchChats, not getChats

// Create or access one-on-one chat
router.post('/', protect, chatController.accessChat);

// Create group chat
router.post('/group', protect, chatController.createGroupChat);

// Rename group chat
router.put('/group/:id', protect, chatController.renameGroupChat);

// Add user to group
router.put('/group/add/:id', protect, chatController.addToGroup);

// Remove user from group
router.put('/group/remove/:id', protect, chatController.removeFromGroup);

// Delete chat (important: this route should exist and work correctly)
router.delete('/:id', protect, chatController.deleteChat);

module.exports = router;
