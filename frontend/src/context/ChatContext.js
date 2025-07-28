import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
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
  // Add a message cache to prevent redundant fetching
  const [messageCache, setMessageCache] = useState({});
  // Add a loading state specifically for messages
  const [messagesLoading, setMessagesLoading] = useState(false);
  // Add debug flag to control excessive logging
  const [debugMode, setDebugMode] = useState(false);

  // Update the API config to always use the latest token
  const getApiConfig = useCallback(() => ({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    timeout: 20000 // Increase timeout to 20 seconds for chat list fetch
  }), [token]);

  // IMPORTANT: Define fetchMessages before using it in any other hooks or functions
  const fetchMessages = useCallback(async (chatId, page = 1, forceRefresh = false, signal = null) => {
    if (!chatId) {
      console.error('No chat ID provided');
      return { messages: [], pagination: { page: 1, pages: 1 } };
    }
    
    if (!isAuthenticated) {
      console.error('No token provided - cannot fetch messages');
      return { messages: [], pagination: { page: 1, pages: 1 } };
    }
    
    // Check if messages are already in cache and not forced to refresh
    const cacheKey = `${chatId}_${page}`;
    if (!forceRefresh && messageCache[cacheKey] && messageCache[cacheKey].messages.length > 0) {
      // Only log in debug mode to prevent console spam
      if (debugMode) {
        console.log(`Using cached messages for chat: ${chatId}, page: ${page}`);
      }
      
      return messageCache[cacheKey];
    }
    
    // Set loading state
    setMessagesLoading(true);
    
    // Continue with existing fetch logic...
    const maxRetries = 2;
    let retries = 0;
    let lastError = null;
    
    const attemptFetch = async () => {
      try {
        console.log(`Fetching messages for chat: ${chatId}, page: ${page}`);
        
        // Use the provided signal or create a new one with a longer timeout (15 seconds)
        const controller = signal ? null : new AbortController();
        const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;
        
        const requestSignal = signal || (controller ? controller.signal : null);
        
        const { data } = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/messages/${chatId}?page=${page}&limit=50`,
          {
            ...getApiConfig(),
            signal: requestSignal
          }
        );
        
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!data || !data.messages) {
          throw new Error('Invalid response format');
        }
        
        console.log(`Retrieved ${data.messages.length} messages`);
        
        // Cache the messages - use functional update to avoid stale closures
        setMessageCache(prev => {
          // Create a new cache object to ensure reference changes
          const newCache = { ...prev };
          newCache[cacheKey] = data;
          return newCache;
        });
        
        // Mark messages as read if we have a socket connection
        if (socket && socket.connected) {
          socket.emit('markMessagesRead', { chatId, userId: user?._id });
        }
        
        setMessagesLoading(false);
        return data;
      } catch (error) {
        // Don't retry if the request was deliberately canceled
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          console.log('Request was canceled, not retrying');
          throw error; // Propagate the cancellation
        }
        
        lastError = error;
        console.error(`Attempt ${retries + 1} - Error fetching messages:`, error);
        
        if (error.name === 'AbortError') {
          console.error('Request timed out');
          throw new Error('Request timed out. The server took too long to respond.');
        }
        
        if (error.response?.status === 404) {
          console.error('Chat not found');
          throw new Error('Chat not found or no longer exists');
        }
        
        if (error.response?.status === 403) {
          console.error('Not authorized to view this chat');
          throw new Error('You are not authorized to view messages in this chat');
        }
        
        if (retries < maxRetries) {
          retries++;
          console.log(`Retrying... (${retries}/${maxRetries})`);
          // Exponential backoff with jitter
          const delay = (1000 * retries) + (Math.random() * 500);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptFetch();
        }
        
        console.error('Max retries reached. Could not fetch messages.');
        throw lastError;
      }
    };
    
    try {
      return await attemptFetch();
    } catch (error) {
      // Only reset loading state if this wasn't a cancellation
      if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
        setMessagesLoading(false);
      }
      // Return empty data on error but don't wipe existing messages
      return { messages: [], pagination: { page: 1, pages: 1 } };
    }
  }, [isAuthenticated, user, getApiConfig, debugMode, socket]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally omitting messageCache from dependencies to prevent infinite loops
  // We access messageCache but avoid re-creating this function when it changes

  // Add a function to clear message cache for a specific chat or all chats
  const clearMessageCache = useCallback((chatId = null) => {
    if (chatId) {
      // Clear cache only for specified chat
      setMessageCache(prev => {
        const newCache = { ...prev };
        Object.keys(newCache).forEach(key => {
          if (key.startsWith(`${chatId}_`)) {
            delete newCache[key];
          }
        });
        return newCache;
      });
    } else {
      // Clear all cache
      setMessageCache({});
    }
  }, []);

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
      // Make sure we pass the raw token without Bearer prefix
      const socket = SocketService.initSocket(user._id, token, handleAuthFail);
      setSocket(socket);
      
      // Listen for users coming online
      socket.on('user_online', (userId) => {
        console.log('User came online:', userId);
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });
      });

      // Listen for users going offline
      socket.on('user_offline', (userId) => {
        console.log('User went offline:', userId);
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      // Get initial online users
      socket.on('online_users', (users) => {
        console.log('Received online users from server:', users);
        
        // Always ensure current user is included in the list
        let newUsers = [...users];
        if (user?._id && !newUsers.includes(user._id)) {
          newUsers.push(user._id);
          console.log('Added current user to online users list');
        }
        
        // Create a completely new Set with the latest users
        const newOnlineUsers = new Set(newUsers);
        setOnlineUsers(newOnlineUsers);
        console.log('Updated online users set:', Array.from(newOnlineUsers));
      });
    }

    // Clean up on unmount
    return () => {
      SocketService.disconnect();
    };
  }, [user, token]); // Keep only user and token as dependencies

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Add socket connection status tracking
    const handleConnect = () => {
      console.log('Socket connected in ChatContext');
      
      // Always add current user to online users when socket connects
      if (user?._id) {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(user._id);
          return newSet;
        });
      }
      
      // When reconnected, fetch fresh data
      if (selectedChat) {
        console.log('Socket reconnected, messages will refresh on next user interaction');
      }
    };
    
    const handleDisconnect = (reason) => {
      console.log(`Socket disconnected: ${reason}`);
    };
    
    // Add event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
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
      console.log('Current selected chat:', selectedChat?._id);
      console.log('Message chat ID:', newMessage.chat._id);
      
      // If chat is not selected OR message is not from selected chat, add notification
      if (!selectedChat || selectedChat._id !== newMessage.chat._id) {
        console.log('Adding notification for message:', newMessage._id);
        
        // Use functional update to avoid stale state
        setNotifications(prev => {
          // Check if this notification already exists
          if (prev.some(n => n._id === newMessage._id)) {
            console.log('Notification already exists, not adding duplicate');
            return prev;
          }
          
          console.log('Added new notification, total count:', prev.length + 1);
          return [...prev, newMessage];
        });
        
        // Also update chats list with latest message and trigger UI update
        setChats(prev => {
          const updatedChats = prev.map(c => {
            if (c._id === newMessage.chat._id) {
              // Mark chat as having new messages
              return { 
                ...c, 
                latestMessage: newMessage,
                hasNewMessages: true, // Add this flag to track unread messages
                unreadCount: (c.unreadCount || 0) + 1 // Increment unread count
              };
            }
            return c;
          });
          
          // Find the updated chat
          const updatedChat = updatedChats.find(c => c._id === newMessage.chat._id);
          
          // If the chat doesn't exist in our state yet, add it
          if (!updatedChat) {
            return [
              {
                ...newMessage.chat,
                latestMessage: newMessage,
                hasNewMessages: true,
                unreadCount: 1
              },
              ...updatedChats
            ];
          }
          
          return updatedChats;
        });
      } else {
        // For the selected chat, just update messages without adding notification
        console.log('Adding message to current chat');
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(msg => msg._id === newMessage._id)) {
            console.log('Message already exists in chat, not adding duplicate');
            return prev;
          }
          return [...prev, newMessage];
        });
        
        // Mark as read
        if (socket.connected) {
          console.log('Marking message as read:', newMessage._id);
          socket.emit('markMessagesRead', {
            chatId: selectedChat._id,
            userId: user?._id
          });
        }
        
        // Update latest message in chats list without adding notifications
        setChats(prev => {
          return prev.map(c => {
            if (c._id === newMessage.chat._id) {
              return { 
                ...c, 
                latestMessage: newMessage,
                hasNewMessages: false, // No new messages since we're in this chat
                unreadCount: 0 // Reset unread count
              };
            }
            return c;
          });
        });
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('typing');
      socket.off('stopTyping');
      socket.off('messagesRead');
      socket.off('message_received');
    };
  }, [socket, selectedChat, user]); // Keep user in dependencies

  // Update the fetchChats function to handle authentication more gracefully
  const fetchChats = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('Authentication token not available yet - deferring chat fetch');
      return [];
    }

    setLoading(true);
    try {
      console.log('Fetching chats with token:', token ? 'Token exists' : 'No token');
      // Increase timeout for chat list fetch to avoid aborting too soon
      const { data } = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/chats`,
        { ...getApiConfig(), timeout: 20000 } // 20 seconds timeout
      );
      setChats(data);
      return data;
    } catch (error) {
      console.error('Error fetching chats:', error);
      if (error.response?.status === 401) {
        console.error('Authentication error - token may be invalid or expired');
      } else if (error.code === 'ERR_NETWORK') {
        console.log('Network error - backend may be down');
      } else if (error.code === 'ECONNABORTED') {
        console.error('Request timed out - try increasing timeout or check backend performance');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, getApiConfig]);

  // Create or access one-on-one chat
  const accessChat = async (userId) => {
    try {
      // Set loading state
      setLoading(true);
      
      // Make API request
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/chats`, 
        { userId },
        getApiConfig()
      );
      
      // Important fix: Update chats state without losing existing chats
      setChats(prevChats => {
        // Check if chat already exists in state
        const chatExists = prevChats.some(c => c._id === data._id);
        
        // If it doesn't exist, add it to the beginning of the array
        if (!chatExists) {
          console.log("Adding new chat to list:", data._id);
          return [data, ...prevChats];
        }
        
        // If it exists, return a NEW array with the existing chats to trigger a re-render
        return [...prevChats];
      });
      
      // Update selected chat
      setSelectedChat(data);
      setLoading(false);
      
      return data;
    } catch (error) {
      console.error('Error accessing chat:', error);
      setLoading(false);
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

  // Fix the sendMessage function
  const sendMessage = useCallback(async (chatId, content) => {
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

      // Add explicit timeout to avoid hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Create fresh config with latest token and timeout
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        signal: controller.signal
      };

      // Make sure we're using the correct API endpoint and method
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/messages`,
        { chatId, content },
        config
      );
      
      // Clear timeout
      clearTimeout(timeoutId);

      console.log('Message saved to DB:', data);

      // Replace temp message with actual message from server
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? data : msg
      ));

      // Emit message to socket for real-time updates if socket is connected
      if (SocketService.isConnected()) {
        console.log('Emitting new_message event');
        socket.emit('new_message', data);
      } else {
        console.warn('Socket not connected, queuing message for later delivery');
        // Queue the message for when connection is restored
        SocketService.queueMessage('new_message', data);
        
        // Try to reconnect the socket
        SocketService.reconnect();
      }

      // Update last message in chat list
      setChats(prev => prev.map(c => 
        c._id === chatId ? { ...c, latestMessage: data } : c
      ));

      return { success: true, message: data };
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error.name === 'AbortError') {
        console.error('Request timed out');
      }
      
      console.error('Response data:', error.response?.data);
      console.error('Status code:', error.response?.status);
      
      // Mark message as failed
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? { ...msg, isSending: false, error: true } : msg
      ));
      
      return { success: false, error, tempId };
    }
  }, [isAuthenticated, user, token, socket, setMessages, setChats]);

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
    // Clear notifications
    setNotifications(prev => prev.filter(n => n.chat._id !== chatId));
    
    // Update chat to mark messages as read
    setChats(prev => prev.map(chat => {
      if (chat._id === chatId) {
        return {
          ...chat,
          hasNewMessages: false,
          unreadCount: 0
        };
      }
      return chat;
    }));
  };

  // Add a manual initial fetch function that's called once on mount
  const initialFetchChats = useCallback(() => {
    if (isAuthenticated && !chats.length) {
      console.log('Performing initial chat fetch');
      fetchChats();
    }
  }, [isAuthenticated, fetchChats, chats.length]);

  // Add a function to clear socket errors
  const clearSocketError = () => {
    setSocketError(null);
  };

  // Add socket status check and reconnect functionality
  const checkSocketConnection = useCallback(() => {
    if (!socket || !socket.connected) {
      console.log('Socket disconnected, attempting to reconnect...');
      SocketService.reconnect();
      return false;
    }
    return true;
  }, [socket]);

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
      setOnlineUsers, // Add this line to expose the setter function
      typingUsers,
      notifications,
      setNotifications,
      loading,
      isAuthenticated,
      socketError,
      clearSocketError,
      fetchChats,
      initialFetchChats,
      accessChat,
      createGroupChat,
      fetchMessages,
      sendMessage,
      startTyping,
      stopTyping,
      clearNotifications,
      checkSocketConnection,
      messagesLoading,
      clearMessageCache,
      debugMode,
      setDebugMode,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
