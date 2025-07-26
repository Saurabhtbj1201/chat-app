const Message = require('../models/message.model');
const Chat = require('../models/chat.model');
const User = require('../models/user.model');

// Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    
    if (!chatId || !content) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if the chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if the sender is a participant in the chat
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }
    
    // Create new message
    const newMessage = new Message({
      sender: req.user._id,
      content,
      chat: chatId,
      readBy: [req.user._id]
    });
    
    await newMessage.save();
    
    // Update the latest message in the chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage._id });
    
    // Populate message with sender and chat info
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'firstName lastName profilePicture')
      .populate('chat');
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Get all messages for a chat - IMPROVED WITH PAGINATION
exports.getMessages = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    
    // Validate chat exists - add more robust error handling
    let chat;
    try {
      chat = await Chat.findById(chatId);
    } catch (err) {
      return res.status(400).json({ 
        message: 'Invalid chat ID format',
        error: err.message
      });
    }
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Validate user is participant
    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }
    
    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Default 50 messages per request
    const skip = (page - 1) * limit;
    
    // Get total count for pagination info - wrapped in try/catch
    let total;
    try {
      total = await Message.countDocuments({ chat: chatId });
    } catch (err) {
      console.error('Error counting messages:', err);
      total = 0; // Default to 0 if count fails
    }
    
    // Query with lean() for better performance, add timeout
    let messages;
    try {
      messages = await Message.find({ chat: chatId })
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
        .populate('sender', 'firstName lastName profilePicture') // Limit fields
        .lean() // Convert to plain JS objects for better performance
        .maxTimeMS(5000); // 5 second timeout for this query
    } catch (err) {
      console.error('Error fetching messages:', err);
      return res.status(500).json({ 
        message: 'Failed to retrieve messages', 
        error: err.message 
      });
    }
    
    // Return in chronological order (oldest first)
    const sortedMessages = messages.reverse();
    
    res.json({
      messages: sortedMessages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      message: 'Error retrieving messages', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if the user deleting is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the sender can delete this message' });
    }

    await message.remove();

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
