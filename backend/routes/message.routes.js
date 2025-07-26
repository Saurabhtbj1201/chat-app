const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');

// Send a new message - add better error handling
router.post('/', protect, async (req, res, next) => {
  try {
    // Add request validation
    if (!req.body.chatId || !req.body.content) {
      return res.status(400).json({ 
        message: 'Missing required fields: chatId and content are required' 
      });
    }
    
    // Pass to controller
    await messageController.sendMessage(req, res);
  } catch (err) {
    console.error('Message route error:', err);
    next(err);
  }
});

// Get all messages for a chat
router.get('/:chatId', protect, messageController.getMessages);

// Delete a message
router.delete('/:messageId', protect, messageController.deleteMessage);

module.exports = router;
