const User = require('../models/user.model');
const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const jwt = require('jsonwebtoken');

// Map to store active users and their socket ids
const activeUsers = new Map();

exports.setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New user connected:', socket.userId);
    
    // Add user to active users map
    if (socket.userId) {
      activeUsers.set(socket.userId, socket.id);
      
      // Update user status to online
      User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: Date.now()
      }).exec();
      
      // Broadcast user online status to ALL clients (including the sender)
      io.emit('user_online', socket.userId);
      console.log(`User ${socket.userId} is now online, broadcasting to all clients`);
      
      // Send current list of all online users to ALL clients
      const onlineUsersList = Array.from(activeUsers.keys());
      io.emit('online_users', onlineUsersList);
      console.log(`Current online users (${onlineUsersList.length}):`, onlineUsersList);
      
      // Also emit setup event to the newly connected client
      socket.emit('setup', socket.userId);
    }
    
    // Handle explicit setup event if client sends it
    socket.on('setup', (userId) => {
      console.log(`Received setup event from user ${userId}`);
      // If the userId matches the socket's authenticated userId, process it
      if (socket.userId && socket.userId === userId) {
        // Re-emit online status to ensure everyone gets updated
        io.emit('user_online', userId);
        
        // Re-emit online users list
        const onlineUsersList = Array.from(activeUsers.keys());
        io.emit('online_users', onlineUsersList);
      } else {
        console.warn(`User ${socket.userId} tried to emit setup for ${userId}`);
      }
    });
    
    // Join chat room
    socket.on('joinChat', (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat: ${chatId}`);
    });
    
    // Send message
    socket.on('new_message', async (messageData) => {
      try {
        const { chatId, content } = messageData;
        
        // Create and save message
        const newMessage = new Message({
          sender: socket.userId,
          content,
          chat: chatId,
          readBy: [socket.userId]
        });
        
        await newMessage.save();
        
        // Populate sender info
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'firstName lastName profilePicture')
          .populate('chat');
          
        // Update latest message in chat
        await Chat.findByIdAndUpdate(chatId, {
          latestMessage: newMessage._id
        });
        
        // Send message to all users in the chat - IMPORTANT: Change event name to match frontend
        io.to(chatId).emit('message_received', populatedMessage);
        
        // Send notification to offline users or users not in the chat
        const chat = await Chat.findById(chatId).populate('participants');
        
        chat.participants.forEach((participant) => {
          const participantId = participant._id.toString();
          
          // Skip sender
          if (participantId === socket.userId) return;
          
          // Send to specific user if online
          const userSocketId = activeUsers.get(participantId);
          
          if (userSocketId) {
            // Use consistent event name with frontend
            io.to(userSocketId).emit('message_received', populatedMessage);
            console.log(`Notification sent to user ${participantId} for new message in chat ${chatId}`);
          }
        });
        
        console.log(`Message broadcast complete for chat ${chatId}`);
        
      } catch (error) {
        console.error('Send message error:', error);
      }
    });
    
    // Typing indicator
    socket.on('typing', (chatId) => {
      socket.to(chatId).emit('typing', {
        chatId,
        userId: socket.userId
      });
    });
    
    socket.on('stopTyping', (chatId) => {
      socket.to(chatId).emit('stopTyping', {
        chatId,
        userId: socket.userId
      });
    });
    
    // Mark messages as read
    socket.on('markMessagesRead', async (data) => {
      try {
        // Extract chatId from data - handle both string and object formats
        const chatId = typeof data === 'string' ? data : data.chatId;
        
        if (!chatId) {
          console.error('Invalid chatId for markMessagesRead:', data);
          return;
        }

        console.log(`Marking messages as read in chat ${chatId} for user ${socket.userId}`);
        
        await Message.updateMany(
          { 
            chat: chatId,
            readBy: { $ne: socket.userId }
          },
          { $addToSet: { readBy: socket.userId } }
        );
        
        io.to(chatId).emit('messagesRead', {
          chatId,
          userId: socket.userId
        });
      } catch (error) {
        console.error('Mark messages error:', error);
      }
    });
    
    // Disconnect
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.userId);
      
      if (socket.userId) {
        // Remove from active users
        activeUsers.delete(socket.userId);
        
        try {
          // Update user status
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeen: Date.now()
          });
          
          // Broadcast user offline status to ALL clients
          io.emit('user_offline', socket.userId);
          console.log(`User ${socket.userId} is now offline, broadcasting to all clients`);
          
          // Send updated list of online users to ALL clients
          const onlineUsersList = Array.from(activeUsers.keys());
          io.emit('online_users', onlineUsersList);
          console.log(`Updated online users list (${onlineUsersList.length}):`, onlineUsersList);
        } catch (error) {
          console.error('Error updating user status on disconnect:', error);
        }
      }
    });
  });
};
