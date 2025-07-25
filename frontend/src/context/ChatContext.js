import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import SocketService from '../services/SocketService';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  // Add a state to track authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Add a state to track socket errors
  const [socketError, setSocketError] = useState(null);

  // Initialize socket.io connection
  useEffect(() => {
    // Set authenticated state based on user and token presence
    setIsAuthenticated(!!user && !!token);
    
    if (user && user._id && token) {
      console.log('User authenticated, initializing socket');
      
      // Handle socket authentication failures
      const handleAuthFail = (reason) => {
        console.error(`Socket authentication failed: ${reason}`);
        setSocketError({
          code: reason,
          message: 'Connection to chat server failed due to authentication issues'
        });
      };
      
      // Initialize socket with user ID, token, and auth fail handler
      const socket = SocketService.initSocket(user._id, token, handleAuthFail);
      setSocket(socket);
      
      // Listen for users coming online
      socket.on('user_online', (userId) => {
        console.log('User came online:', userId);
        setOnlineUsers(prev => new Set([...prev, userId]));
      });

      // Listen for users going offline
      socket.on('user_offline', (userId) => {
        console.log('User went offline:', userId);
        setOnlineUsers(prev => {
          const newSet = new Set([...prev]);
          newSet.delete(userId);
          return newSet;
        });
      });

      // Get initial online users
      socket.on('online_users', (users) => {
        console.log('Received online users:', users);
        setOnlineUsers(new Set(users));
      });
    }

    // Clean up on unmount
    return () => {
      SocketService.disconnect();
    };
  }, [user, token]); // Add token to dependency array

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Typing indicators
    socket.on('typing', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.chatId]: [...(prev[data.chatId] || []), data.userId]
      }));
    });
    
    socket.on('stopTyping', (data) => {
      setTypingUsers(prev => {
        const users = prev[data.chatId] || [];
        return {
          ...prev,
          [data.chatId]: users.filter(id => id !== data.userId)
        };
      });
    });
    
    // Messages read receipt
    socket.on('messagesRead', (data) => {
      if (selectedChat && selectedChat._id === data.chatId) {
        setMessages(prev => 
          prev.map(msg => ({
            ...msg,
            readBy: msg.readBy.includes(data.userId) 
              ? msg.readBy 
              : [...msg.readBy, data.userId]
          }))
        );
      }
    });

    // Listen for new messages
    socket.on('message_received', (newMessage) => {
      console.log('Received new message:', newMessage);
      
      // If the chat is not selected OR the message is not from the selected chat
      if (!selectedChat || selectedChat._id !== newMessage.chat._id) {
        // Add notificationk as read
        console.log('Adding to notifications');
        setNotifications(prev => {
          // Avoid duplicates  userId: user._id
          if (prev.some(msg => msg._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
      } else {
        // Update messages for current chat
        console.log('Updating messages for current chat');
        setMessages(prev => {
          // Avoid duplicates  socket.off('messagesRead');
          if (prev.some(msg => msg._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
        
        // Mark as read
        socket.emit('read_message', {
          messageId: newMessage._id,
          userId: user?._id,
          chatId: selectedChat._id
        });
      }
      // Update last message in chat list
      setChats(prev => {
        return prev.map(c => {
          if (c._id === newMessage.chat._id) {
            return { ...c, latestMessage: newMessage };
          }
          return c;
        });
      });
    });

    return () => {
      socket.off('typing');
      socket.off('stopTyping');
      socket.off('messagesRead');
      socket.off('message_received');
    };
  }, [socket, selectedChat, user]);

  // Fix authentication handling

  // Update the API config to always use the latest token
  const getApiConfig = () => ({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    timeout: 10000 // 10 second timeout to prevent hanging requests
  });

  // Update the fetchChats function to handle authentication more gracefully
  const fetchChats = async () => {
    if (!isAuthenticated) {
      console.warn('Authentication token not available yet - deferring chat fetch');
      return [];
    }

    setLoading(true);
    try {
      console.log('Fetching chats with token:', token ? 'Token exists' : 'No token');
      const { data } = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/chats`,
        getApiConfig()
      );
      setChats(data);
      return data;
    } catch (error) {
      console.error('Error fetching chats:', error);
      
      if (error.response?.status === 401) {
        console.error('Authentication error - token may be invalid or expired');
        // You might want to redirect to login or refresh the token here
      } else if (error.code === 'ERR_NETWORK') {
        console.log('Network error - backend may be down');
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create or access one-on-one chat
  const accessChat = async (userId) => {
    try {
      const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/chats`, { userId });
      // Check if chat already exists in state
      if (!chats.find(c => c._id === data._id)) {
        setChats([data, ...chats]);
      }
      setSelectedChat(data);
      return data;
    } catch (error) {
      console.error('Error accessing chat:', error);
      return null;
    }
  };

  // Create group chat
  const createGroupChat = async (name, users) => {
    try {
      const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/chats/group`, {
        name,
        users: JSON.stringify(users)
      });
      setChats([data, ...chats]);
      return data;
    } catch (error) {
      console.error('Error creating group chat:', error);
      return null;
    }
  };

  // Update fetchMessages to handle authentication gracefully
  const fetchMessages = async (chatId) => {
    if (!chatId) {
      console.error('No chat ID provided');
      return [];
    }
    
    if (!isAuthenticated) {
      console.error('No token provided - cannot fetch messages');
      return [];
    }
    
    const maxRetries = 2;
    let retries = 0;
    
    const attemptFetch = async () => {
      try {
        console.log(`Fetching messages for chat: ${chatId}`);
        const { data } = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/messages/${chatId}`,
          getApiConfig() // Use fresh config with latest token
        );
        
        console.log(`Retrieved ${data.length} messages`);
        setMessages(data);

        // Mark messages as read
        if (socket && socket.connected) {
          socket.emit('markMessagesRead', { chatId, userId: user?._id });
        }

        return data;
      } catch (error) {
        console.error(`Attempt ${retries + 1} - Error fetching messages:`, error);
        
        if (retries < maxRetries) {
          retries++;
          console.log(`Retrying... (${retries}/${maxRetries})`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          return attemptFetch();
        }
        
        console.error('Max retries reached. Could not fetch messages.');
        return [];
      }
    };
    
    return attemptFetch();
  };

  // Send a message
  const sendMessage = async (chatId, content) => {
    if (!isAuthenticated) {
      console.error('User not authenticated');
      return { success: false, error: 'Not authenticated' };
    }
    
    if (!chatId || !content.trim()) {
      console.error('Invalid message data');
      return { success: false, error: 'Invalid message data' };
    }

    // Create a local message object for optimistic updates
    const tempId = Date.now().toString();
    const tempMessage = {
      _id: tempId,
      sender: user,
      content,
      chat: { _id: chatId },
      createdAt: new Date(),
      readBy: [user._id],
      isSending: true
    };
    
    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);

    try {
      console.log('Sending message to API:', { chatId, content });

      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/messages`,
        { chatId, content },
        getApiConfig() // Use fresh config with latest token
      );

      console.log('Message saved to DB:', data);

      // Replace temp message with actual message from server
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? data : msg
      ));

      // Emit message to socket for real-time updates
      if (socket && socket.connected) {
        console.log('Emitting new_message event');
        socket.emit('new_message', data);
      } else {
        console.error('Socket not connected. Cannot emit message.');
      }

      // Update last message in chat list
      setChats(prev => prev.map(c => 
        c._id === chatId ? { ...c, latestMessage: data } : c
      ));

      return { success: true, message: data };
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      
      // Mark message as failed
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? { ...msg, isSending: false, error: true } : msg
      ));
      
      return { success: false, error, tempId };
    }
  };

  // Start typing
  const startTyping = (chatId) => {
    if (socket) {
      socket.emit('typing', chatId);
    }
  };

  // Stop typing
  const stopTyping = (chatId) => {
    if (socket) {
      socket.emit('stopTyping', chatId);
    }
  };

  // Clear notifications for a chat
  const clearNotifications = (chatId) => {
    setNotifications(prev => prev.filter(n => n.chat._id !== chatId));
  };

  // Add a new effect to auto-fetch chats when token becomes available
  useEffect(() => {
    if (token) {
      console.log('Token is available, fetching chats automatically');
      fetchChats();
    }
  }, [token]); // This will trigger when token becomes available after login

  // Add a function to clear socket errors
  const clearSocketError = () => {
    setSocketError(null);
  };

  return (
    <ChatContext.Provider value={{
      socket,
      chats,
      setChats,
      selectedChat,
      setSelectedChat,
      messages,
      setMessages,
      onlineUsers,
      typingUsers,
      notifications,
      setNotifications,
      loading,
      isAuthenticated, // Add this to the context
      socketError,
      clearSocketError,
      fetchChats,
      accessChat,
      createGroupChat,
      fetchMessages,
      sendMessage,
      startTyping,
      stopTyping,
      clearNotifications
    }}>
      {children}
    </ChatContext.Provider>
  );
};
