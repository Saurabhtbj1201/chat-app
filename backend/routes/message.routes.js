const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all messages for a chat
router.get('/:chatId', protect, messageController.getMessages);

// Delete a message
router.delete('/:messageId', protect, messageController.deleteMessage);

module.exports = router;
