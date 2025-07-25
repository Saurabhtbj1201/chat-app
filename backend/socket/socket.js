// Update socket implementation to properly handle user online status and messages

const setupSocket = (io) => {
  // Map to store user socket connections
  const userSockets = new Map();
  
  io.on('connection', (socket) => {
    console.log('New socket connection:', socket.id);
    
    // User setup (when they connect)
    socket.on('setup', (userId) => {
      // Store user's socket connection
      userSockets.set(userId, socket.id);
      
      // Join user's personal room
      socket.join(userId);
      
      // Broadcast that user is online
      socket.broadcast.emit('user_online', userId);
      
      // Send all online users to the newly connected client
      socket.emit('online_users', [...userSockets.keys()]);
      
      console.log(`User ${userId} connected with socket ${socket.id}`);
    });
    
    // Handle new messages
    socket.on('new_message', (message) => {
      const chat = message.chat;
      
      if (!chat.participants) return;
      
      // Send message to all participants except sender
      chat.participants.forEach(participant => {
        if (participant._id === message.sender._id) return;
        
        socket.to(participant._id).emit('message_received', message);
      });
      
      console.log(`Message sent to chat ${chat._id}`);
    });
    
    // Handle message read status
    socket.on('read_message', async ({ messageId, userId }) => {
      try {
        // Update message in database
        const message = await Message.findById(messageId);
        if (message && !message.readBy.includes(userId)) {
          message.readBy.push(userId);
          await message.save();
        }
        
        // Notify sender that message was read
        socket.to(message.sender.toString()).emit('message_read', {
          messageId,
          readBy: userId
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });
    
    // Handle typing status
    socket.on('typing', ({ chatId, userId }) => {
      socket.to(chatId).emit('typing', { chatId, userId });
    });
    
    socket.on('stop_typing', ({ chatId, userId }) => {
      socket.to(chatId).emit('stop_typing', { chatId, userId });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
      
      // Find user by socket ID and remove from online users
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          
          // Broadcast that user is offline
          socket.broadcast.emit('user_offline', userId);
          
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });
};

module.exports = setupSocket;
