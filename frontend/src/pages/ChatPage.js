import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaEllipsisV, FaPaperPlane, FaSmile, FaUserPlus, FaTimes, FaSync, FaArrowLeft } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import UserListItem from '../components/Chat/UserListItem';
import ChatItem from '../components/Chat/ChatItem';
import ProfileDrawer from '../components/Profile/ProfileDrawer';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';
import '../styles/chat.css';
import { useNavigate } from 'react-router-dom';
import HeaderMenu from '../components/Chat/HeaderMenu';

const ChatPage = () => {
  const { user, token } = useContext(AuthContext);
  const { 
    chats, 
    fetchChats,
    setChats,
    selectedChat, 
    setSelectedChat,
    messages,
    fetchMessages,
    sendMessage,
    onlineUsers,
    setOnlineUsers, // Add this line to get setOnlineUsers
    typingUsers,
    startTyping,
    stopTyping,
    clearNotifications,
    setMessages,
    initialFetchChats,
    socket,
    messagesLoading, // Add this to get message loading state
    clearMessageCache // Add this to use the cache clearing function
  } = useContext(ChatContext);
  
  // Create a getApiConfig function if it's not available from context
  const getApiConfig = useCallback(() => ({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }), [token]);
  
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Add eslint-disable comment for variables we might use later
  // eslint-disable-next-line no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [searchUserTerm, setSearchUserTerm] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  // Add state for mobile view
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);
  
  // Refs for the dropdown menus
  const sidebarMenuRef = useRef(null);
  const chatMenuRef = useRef(null);
  const sidebarButtonRef = useRef(null);
  const chatButtonRef = useRef(null);
  const emojiPickerRef = useRef(null); // Add this ref
  
  // Track previous selected chat to detect changes
  const prevSelectedChatRef = useRef(null);
  
  // Add an abortController ref to cancel in-flight requests when changing chats
  const abortControllerRef = useRef(null);
  
  // Add useEffect to handle clicks outside header menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle sidebar header menu
      if (showHeaderMenu && 
          sidebarMenuRef.current && 
          !sidebarMenuRef.current.contains(event.target) &&
          !sidebarButtonRef.current.contains(event.target)) {
        setShowHeaderMenu(false);
      }
      
      // Handle chat header menu
      if (showChatMenu &&
          chatMenuRef.current &&
          !chatMenuRef.current.contains(event.target) &&
          !chatButtonRef.current.contains(event.target)) {
        setShowChatMenu(false);
      }
      
      // Handle emoji picker - close it if clicking outside
      if (showEmojiPicker && 
          emojiPickerRef.current && 
          !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeaderMenu, showChatMenu, showEmojiPicker]);
  
  // Define debugState function
  const debugState = () => {
    console.group('ChatPage Debug Info');
    console.log('User:', user?.firstName, user?.lastName);
    console.log('Chats count:', chats?.length || 0);
    console.log('Selected chat:', selectedChat?._id);
    console.log('Is loading:', isLoading);
    console.log('Filtered chats count:', getFilteredChats().length);
    console.groupEnd();
  };
  
  // Fetch chats when component mounts
  useEffect(() => {
    console.log("Chat page mounted - performing initial data fetch");
    if (user && token) {
      // Set a flag in sessionStorage to track initial load
      const hasInitiallyLoaded = sessionStorage.getItem('chatsInitiallyLoaded');
      if (!hasInitiallyLoaded) {
        console.log('First load - fetching chats');
        handleRefresh();
        sessionStorage.setItem('chatsInitiallyLoaded', 'true');
      } else {
        console.log('Using existing chat data');
        initialFetchChats(); // This will only fetch if chats array is empty
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - runs only once on mount
  
  // Fetch messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
      clearNotifications(selectedChat._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]); 
  
  // Update the useEffect for initial loading to prevent premature requests
  useEffect(() => {
    // Don't try to fetch data until user and token are available
    if (user && token) {
      console.log('User and token available, initializing chat page');
      
      // Fetch chats only once user and token are available
      fetchChats().then(() => {
        console.log('Chats fetched successfully');
      }).catch(err => {
        console.error('Error fetching chats:', err);
      });
    }
  }, [user, token, fetchChats]); // Depend on user AND token
  
  // Modify the message fetching effect to wait for token and handle errors
  useEffect(() => {
    if (!selectedChat || !token) return;
    
    // Create a new abort controller for this fetch
    if (abortControllerRef.current) {
      console.log('Aborting previous request due to new selection');
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Check if we're changing chats (not just an update to the same chat)
    const isChangingChat = prevSelectedChatRef.current?._id !== selectedChat._id;
    if (selectedChat && selectedChat._id) {
      // Save a copy of the chat object rather than a reference
      prevSelectedChatRef.current = { ...selectedChat };
    }
    
    // If changing chats, show loading state immediately
    if (isChangingChat) {
      setIsLoading(true);
      setMessages([]); // Clear messages when changing chats for better UX
      console.log(`Switching to chat: ${selectedChat._id}`);
    }
    
    // Use a flag to prevent duplicate requests
    let isMounted = true;
    
    // Add safety timeout to prevent infinite loading state - make it shorter
    const safetyTimeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
        console.log('Safety timeout triggered to prevent infinite loading');
      }
    }, 3000); // Reduce to 3 seconds for faster response
    
    const loadMessages = async () => {
      try {
        if (isMounted) {
          console.log(`Loading messages for chat: ${selectedChat._id}`);
          // Pass the abort controller signal to fetchMessages
          const data = await fetchMessages(
            selectedChat._id, 
            1, 
            isChangingChat, // Force refresh when changing chats
            abortControllerRef.current.signal
          );
          
          // Update messages state here, after getting the result
          if (isMounted) {
            // Handle case when data.messages is undefined (new chat with no messages)
            if (data && data.messages) {
              setMessages(data.messages);
              console.log(`Loaded ${data.messages.length} messages`);
            } else {
              setMessages([]);
              console.log('No messages found for this chat');
            }
            
            // Always reset loading state, even for empty messages
            setIsLoading(false);
          }
          
          // Clear notifications in a separate try/catch to prevent affecting the main flow
          try {
            if (isMounted) {
              clearNotifications(selectedChat._id);
            }
          } catch (notifError) {
            console.error('Error clearing notifications:', notifError);
          }
        }
      } catch (error) {
        // Only log if the request wasn't deliberately canceled
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          console.error('Error loading messages:', error);
        }
        
        // Reset loading state on error
        if (isMounted) {
          setIsLoading(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          // Clear the safety timeout since we're done
          clearTimeout(safetyTimeoutId);
        }
      }
    };
    
    // Add a small delay when changing chats to prevent UI jank
    // But make sure we use the right timing approach
    if (isChangingChat) {
      const timeoutId = setTimeout(loadMessages, 100);
      return () => {
        clearTimeout(timeoutId);
        isMounted = false;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      };
    } else {
      // If not changing chats, load immediately without delay
      loadMessages();
      return () => {
        isMounted = false;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      };
    }
  }, [selectedChat, token, fetchMessages, clearNotifications, setMessages]);
  
  // Handle search - mark as unused with a comment if you plan to use it later
  const handleSearch = async () => {
    if (!searchTerm) return;
    
    setIsLoading(true);
    
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/users?search=${searchTerm}`);
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add an input field to use the handleSearchChange function or add eslint-disable
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    
    if (e.target.value === '') {
      setSearchResults([]);
    }
    // Add this to trigger search on input change when the value is not empty
    else if (e.target.value.length > 2) {
      handleSearch();
    }
  }; 

  // Add a console log to debug the chats state
  useEffect(() => {
    console.log("Current chats in state:", chats);
  }, [chats]);

  // Fix the access chat function to prevent overwriting chats
  const accessChat = async (userId) => {
    try {
      setIsLoading(true);
      const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/chats`, { userId });
      
      // Make sure we don't lose existing chats when adding a new one
      if (!chats.find((c) => c._id === data._id)) {
        setChats(prevChats => [data, ...prevChats]);
      }
      
      setSelectedChat(data);
      setSearchResults([]);
      setSearchTerm('');
      setIsLoading(false);
    } catch (error) {
      console.error('Error accessing chat:', error);
      setIsLoading(false);
    }
  };
  
  // Add this debug function to track chat list changes
  useEffect(() => {
    console.log(`Chats state updated, now has ${chats?.length || 0} chats`);
  }, [chats]);

  // Fix the getFilteredChats function to ALWAYS return an array
  const getFilteredChats = () => {
    // Ensure we always have a valid array even if chats is null or undefined
    const chatList = Array.isArray(chats) ? chats : [];
    
    if (isLoading && chatList.length === 0) {
      return [];  // Only show empty list while loading if we don't have chats
    }
    
    if (!chatSearchTerm || !chatSearchTerm.trim()) {
      return chatList;
    }
    
    return chatList.filter(chat => {
      // For group chats, search in group name
      if (chat.isGroupChat) {
        return chat.groupName.toLowerCase().includes(chatSearchTerm.toLowerCase());
      }
      
      // For one-on-one chats, search in the other user's name
      const otherUser = chat.participants.find(p => p._id !== user?._id);
      if (otherUser) {
        const fullName = `${otherUser.firstName} ${otherUser.lastName}`.toLowerCase();
        return fullName.includes(chatSearchTerm.toLowerCase());
      }
      
      return false;
    });
  };
  
  // Add chat search functionality to use setChatSearchTerm
  useEffect(() => {
    // When chat search is toggled on, add input field to the sidebar
    if (showChatSearch) {
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search conversations...';
      searchInput.className = 'chat-search-input';
      searchInput.addEventListener('input', (e) => {
        setChatSearchTerm(e.target.value);
      });
      
      // Cleanup function to remove the input when component unmounts
      return () => {
        if (searchInput.parentNode) {
          searchInput.parentNode.removeChild(searchInput);
        }
      };
    }
  }, [showChatSearch, setChatSearchTerm]); // Add setChatSearchTerm dependency
  
  // Fix debugState dependency issue
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      debugState();
    }
    // We intentionally want this to run only when these specific values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, selectedChat, isLoading]);
  
  // Define getSocketStatus function
  const getSocketStatus = () => {
    if (!socket) return "disconnected";
    return socket.connected ? "connected" : "disconnected";
  };

  // Define the ConnectionStatus component
  const ConnectionStatus = () => {
    const status = getSocketStatus();
    return (
      <div className={`socket-status ${status}`}>
        {status === "connected" ? "Connected" : "Disconnected"}
      </div>
    );
  };

  // Define the debouncedSelectChat function
  const debouncedSelectChat = (chat) => {
    // Don't re-select the same chat
    if (selectedChat?._id === chat._id) return;
    
    console.log("Selecting chat:", chat._id);
    setSelectedChat(chat);
    
    // Hide sidebar in mobile view when selecting a chat
    if (isMobileView) {
      setShowSidebarMobile(false);
      navigate('.', { state: { sidebar: false, chatId: chat._id } });
    }
  };

  // Define fetchAllUsers function
  const fetchAllUsers = async () => {
    setSearchingUsers(true);
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
      setAllUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Define handleDeleteContact function
  const handleDeleteContact = async (chatId) => {
    try {
      console.log(`Deleting chat with ID: ${chatId}`);
      
      // Call API to delete chat
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/chats/${chatId}`,
        getApiConfig() // Now we can safely use this function
      );
      
      if (response.status === 200) {
        console.log('Chat successfully deleted');
        
        // Update local state - remove the deleted chat
        setChats(prevChats => prevChats.filter(chat => chat._id !== chatId));
        
        // If the deleted chat was selected, clear selection
        if (selectedChat && selectedChat._id === chatId) {
          setSelectedChat(null);
        }
        
        // Also clear any notifications for this chat
        clearNotifications(chatId);
        
        // Show success message (you could add a toast notification here)
        console.log('Contact deleted successfully');
      } else {
        console.error('Failed to delete chat:', response);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      // Show error message or notification here if desired
      alert('Failed to delete contact. Please try again.');
    }
  };

  // Define handleViewProfile function
  const handleViewProfile = (chat, contactUser) => {
    console.log("Viewing profile for:", contactUser.firstName, contactUser.lastName);
    setSelectedChat(chat);
    setIsProfileOpen(true);
  };

  // Define getChatData function
  const getChatData = (chat) => {
    if (!chat || !user) return { name: '', image: '' };
    
    if (chat.isGroupChat) {
      return {
        name: chat.groupName,
        image: 'default-group.png'
      };
    } else {
      const otherUser = chat.participants.find(p => p._id !== user._id);
      return {
        name: otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User',
        image: otherUser?.profilePicture || 'default-avatar.png'
      };
    }
  };

  // Define isUserTyping function
  const isUserTyping = () => {
    if (!selectedChat || !typingUsers[selectedChat._id]) return false;
    
    const typingInChat = typingUsers[selectedChat._id];
    return typingInChat.some(userId => userId !== user._id);
  };

  // Define handleTyping function
  const handleTyping = () => {
    if (!selectedChat) return;
    
    startTyping(selectedChat._id);
    
    // Clear existing timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Set new timeout
    const timeout = setTimeout(() => {
      stopTyping(selectedChat._id);
    }, 3000);
    
    setTypingTimeout(timeout);
  };

  // Define handleSendMessage function
  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;
    
    // Check authentication before sending
    if (!user || !token) {
      console.error('Cannot send message: Not authenticated');
      return;
    }
    
    try {
      // Clear input field immediately for better UX
      const messageToSend = newMessage;
      setNewMessage('');
      
      // Add connection check and notification
      const result = await sendMessage(selectedChat._id, messageToSend);
      
      if (!result.success) {
        console.error('Failed to send message:', result.error);
        // You could display a toast notification here for errors
      }
      
      stopTyping(selectedChat._id);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
    }
  };

  // Define handleEmojiClick function
  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  // Define handleRefresh function
  const handleRefresh = async () => {
    if (!user || !token) {
      console.warn('Cannot refresh: User or authentication token not available');
      return;
    }
    
    if (isRefreshing) {
      console.warn('Already refreshing, please wait');
      return;
    }
    
    setIsRefreshing(true);
    
    // Cancel any in-progress requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    } else {
      abortControllerRef.current = new AbortController();
    }
    
    try {
      console.log("Manually refreshing chats...");
      
      // First fetch chats to avoid race conditions
      await fetchChats();
      
      // Then fetch messages for the selected chat if any, with force refresh
      if (selectedChat) {
        console.log(`Refreshing messages for chat: ${selectedChat._id}`);
        // Clear cache for this chat
        clearMessageCache(selectedChat._id);
        
        // Fetch with the new abort controller signal
        const data = await fetchMessages(
          selectedChat._id, 
          1, 
          true, 
          abortControllerRef.current.signal
        );
        
        // Update messages in the UI
        if (data && data.messages) {
          setMessages(data.messages);
        }
      }
      
      console.log("Refresh completed successfully");
    } catch (error) {
      // Only log if it's not a cancellation
      if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
        console.error('Error refreshing data:', error);
      }
    } finally {
      // Ensure we always reset the refreshing state
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500); // Small delay for better UX
    }
  };
  
  // Add resize listener to detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide sidebar when chat is selected in mobile view
  useEffect(() => {
    if (isMobileView && selectedChat) {
      setShowSidebarMobile(false);
    }
  }, [selectedChat, isMobileView]);
  
  // Add a more comprehensive debug function to help diagnose online status issues
  // eslint-disable-next-line no-unused-vars
  const debugOnlineStatus = () => {
    console.group('Online Status Debug');
    console.log('Current online users:', Array.from(onlineUsers));
    console.log('Current user ID:', user?._id);
    console.log('Is current user shown as online:', onlineUsers.has(user?._id));
    
    // Always add the current user to the online users list
    if (user?._id && !onlineUsers.has(user?._id)) {
      console.log('Current user not in online list, adding manually');
      // Use the function to update onlineUsers to prevent race conditions
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(user._id);
        return newSet;
      });
    }
    
    if (selectedChat) {
      const otherUserId = selectedChat?.participants.find(p => p._id !== user?._id)?._id;
      console.log('Selected chat partner ID:', otherUserId);
      console.log('Is partner online?', onlineUsers.has(otherUserId));
      
      // Log the actual comparison values for debugging
      console.log('Partner ID (last 4 chars):', otherUserId?.slice(-4));
      console.log('Online users IDs (last 4 chars):', Array.from(onlineUsers).map(id => id.slice(-4)));
    }
    
    console.log('Socket connected?', socket?.connected);
    console.groupEnd();
  };

  // Fix the online status check in the chat header to add current user
  useEffect(() => {
    // Ensure current user is always shown as online to themselves
    if (user?._id && !onlineUsers.has(user._id)) {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(user._id);
        return newSet;
      });
    }
  }, [user, onlineUsers, setOnlineUsers]); // Add setOnlineUsers to the dependency array

  // Use effect to run the debug function when online users change
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      debugOnlineStatus(); // Actually call the function to avoid the warning
    }
  }, [onlineUsers, selectedChat]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add a ref for messages container
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false); // Add this state to track manual scrolling
  
  // Improve scroll-to-bottom functionality with better handling - use useCallback to memoize
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      // Don't auto-scroll if user has manually scrolled up and is viewing history
      if (userScrolled) {
        console.log('Not auto-scrolling because user manually scrolled up');
        return;
      }
      
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, [userScrolled]); // Add userScrolled as a dependency
  
  // Fix manual scrolling by improving the scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!messagesContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // If we're close to the bottom (within 100px), enable auto-scroll
      const isCloseToBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      // Only update autoScroll if we're not currently handling a new message
      setAutoScroll(isCloseToBottom);
      
      // Set userScrolled when user manually scrolls up
      if (!isCloseToBottom && !userScrolled) {
        setUserScrolled(true);
        console.log('User manually scrolled up');
      }
      
      // Reset userScrolled when scrolled to bottom
      if (isCloseToBottom && userScrolled) {
        setUserScrolled(false);
        console.log('User scrolled back to bottom');
      }
    };
    
    const container = messagesContainerRef.current;
    if (container) {
      // Use passive: true for better scroll performance
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [userScrolled]);
  
  // Only scroll to bottom when messages change if auto-scroll is enabled and user hasn't scrolled up
  useEffect(() => {
    if (autoScroll && messages.length > 0 && !userScrolled) {
      scrollToBottom();
    }
  }, [messages, autoScroll, userScrolled, scrollToBottom]); // Add scrollToBottom dependency
  
  // Reset userScrolled when switching chats
  useEffect(() => {
    if (selectedChat) {
      setAutoScroll(true);
      setUserScrolled(false); // Reset user scroll state when changing chats
      setTimeout(scrollToBottom, 100);
    }
  }, [selectedChat, scrollToBottom]); // Add scrollToBottom dependency
  
  // Also scroll to bottom when loading completes, but respect user scrolling
  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && autoScroll && !userScrolled) {
      setTimeout(scrollToBottom, 200);
    }
  }, [messagesLoading, messages.length, autoScroll, userScrolled, scrollToBottom]); // Add scrollToBottom dependency

  // Track sidebar/chat state in history
  useEffect(() => {
    // On mount, set sidebar as default state
    if (window.history.state === null) {
      navigate('.', { replace: true, state: { sidebar: true, chatId: null } });
    }
  }, [navigate]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const state = window.history.state;
      if (state && state.sidebar) {
        setShowSidebarMobile(true);
        setSelectedChat(null);
      } else if (state && state.chatId) {
        setShowSidebarMobile(false);
        // Find chat by ID and select it
        const chat = chats.find(c => c._id === state.chatId);
        if (chat) setSelectedChat(chat);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [chats, setSelectedChat]); // Add setSelectedChat to dependencies

  // When going back to sidebar, push to history
  const handleSidebarBack = () => {
    setShowSidebarMobile(true);
    setSelectedChat(null);
    if (isMobileView) {
      navigate('.', { state: { sidebar: true, chatId: null } });
    }
  };

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className={`chat-sidebar ${isMobileView && !showSidebarMobile ? 'mobile-hidden' : ''}`}>
        <div className="sidebar-header">
          <div className="user-profile-header">
            <img 
              src={user?.profilePicture || '/default-avatar.png'} 
              alt="Your Profile" 
              className="user-avatar"
            />
            <h3>{user ? `${user.firstName} ${user.lastName}` : 'Chat App'}</h3>
          </div>
          <div className="header-controls">
            <button 
              className={`header-icon-button ${isRefreshing ? 'refreshing' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh Chats"
            >
              <FaSync />
            </button>
            <button 
              className="header-icon-button"
              onClick={() => {
                setShowAddContact(true);
                fetchAllUsers();
              }}
              title="Add Contact"
            >
              <FaUserPlus />
            </button>
            <button 
              className="header-icon-button"
              onClick={() => setShowChatSearch(!showChatSearch)}
              title="Search Chats"
            >
              <FaSearch />
            </button>
            <button 
              className="header-icon-button"
              onClick={() => setShowHeaderMenu(prev => !prev)}
              ref={sidebarButtonRef}
            >
              <FaEllipsisV />
            </button>
            {showHeaderMenu && (
              <HeaderMenu 
                isOpen={showHeaderMenu}
                onClose={() => setShowHeaderMenu(false)}
                onProfileClick={() => {
                  navigate('/profile');
                  setShowHeaderMenu(false);
                }}
                onDeleteContact={handleDeleteContact}
                selectedChat={null}
                ref={sidebarMenuRef}
              />
            )}
          </div>
        </div>
        
        {/* Add Contact Panel */}
        {showAddContact && (
          <div className="add-contact-panel">
            <div className="add-contact-header">
              <h3>Add Contact</h3>
              <button 
                className="close-btn"
                onClick={() => setShowAddContact(false)}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="search-container add-contact-search">
              <input 
                type="text"
                placeholder="Search users..."
                value={searchUserTerm}
                onChange={(e) => {
                  setSearchUserTerm(e.target.value);
                  // Call handleSearchChange with the same event to handle global search
                  handleSearchChange(e);
                }}
              />
              <button className="search-btn" onClick={handleSearch}>
                <FaSearch />
              </button>
            </div>
            
            <div className="user-list">
              {searchingUsers ? (
                <div className="loading-indicator">Loading users...</div>
              ) : (
                allUsers
                  .filter(u => 
                    u._id !== user?._id && 
                    (searchUserTerm === '' || 
                      u.firstName.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
                      u.lastName.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchUserTerm.toLowerCase())
                    )
                  )
                  .map(user => (
                    <div key={user._id} className="user-contact-item">
                      <div className="user-info">
                        <img 
                          src={user.profilePicture || '/default-avatar.png'} 
                          alt={`${user.firstName} ${user.lastName}`} 
                        />
                        <div>
                          <h4>{user.firstName} {user.lastName}</h4>
                          <p>{user.email}</p>
                        </div>
                      </div>
                      <button 
                        className="message-btn"
                        onClick={() => {
                          accessChat(user._id);
                          setShowAddContact(false);
                        }}
                        title="Send Message"
                      >
                        <FaPaperPlane />
                      </button>
                    </div>
                  ))
              )}
              
              {!searchingUsers && allUsers.filter(u => u._id !== user?._id).length === 0 && (
                <div className="no-results">No users found</div>
              )}
            </div>
          </div>
        )}
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <h3>Search Results</h3>
            {searchResults.map(user => (
              <UserListItem
                key={user._id}
                user={user}
                onClick={() => accessChat(user._id)}
              />
            ))}
          </div>
        )}
        
        {/* Chat List */}
        <div className="chat-list">
          {chats === null || chats === undefined ? (
            <div className="no-chats-found">Loading chats...</div>
          ) : getFilteredChats().length > 0 ? (
            getFilteredChats().map(chat => (
              <ChatItem
                key={chat._id}
                chat={chat}
                isSelected={selectedChat?._id === chat._id}
                onClick={() => debouncedSelectChat(chat)}
                isOnline={chat.participants.some(p => 
                  p._id !== user._id && onlineUsers.has(p._id)
                )}
                onDeleteContact={handleDeleteContact}
                onViewProfile={handleViewProfile}
              />
            ))
          ) : (
            <div className="no-chats-found">
              {chatSearchTerm ? 'No conversations found' : 'No conversations yet'}
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className={`chat-area ${isMobileView && showSidebarMobile ? 'hidden-mobile' : ''}`}>
        {selectedChat ? (
          <>  {/* Chat Header */}
            <div className="chat-header">
              {/* Add mobile menu toggle here */}
              {isMobileView && (
                <button 
                  className="header-back-button"
                  onClick={handleSidebarBack}
                  aria-label="Back to chat list"
                >
                  <FaArrowLeft />
                </button>
              )}
              <div className="chat-user-info">
                <img 
                  src={selectedChat ? getChatData(selectedChat).image : '/default-avatar.png'} 
                  alt="Profile" 
                />
                <div>
                  <h3>{selectedChat ? getChatData(selectedChat).name : 'Select a chat'}</h3>
                  {/* Improved status display for better debugging */}
                  {!selectedChat?.isGroupChat && (
                    <p className={
                      onlineUsers.has(selectedChat?.participants.find(p => p._id !== user?._id)?._id) 
                      ? "status-online" 
                      : "status-offline"
                    }>
                      {onlineUsers.has(selectedChat?.participants.find(p => p._id !== user?._id)?._id) 
                        ? 'Online' 
                        : 'Offline'} 
                      {process.env.NODE_ENV === 'development' && 
                        `(ID: ${selectedChat?.participants.find(p => p._id !== user?._id)?._id?.slice(-4)})`}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="chat-actions">
                <button 
                  className="header-icon-button" 
                  onClick={() => setShowChatMenu(prev => !prev)}
                  ref={chatButtonRef}
                >
                  <FaEllipsisV />
                </button>
                {showChatMenu && (
                  <HeaderMenu 
                    isOpen={showChatMenu}
                    onClose={() => setShowChatMenu(false)}
                    onProfileClick={() => {
                      setIsProfileOpen(true);
                      setShowChatMenu(false);
                    }}
                    onDeleteContact={handleDeleteContact}
                    selectedChat={selectedChat}
                    ref={chatMenuRef}
                  />
                )}
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="chat-messages" ref={messagesContainerRef}>
              {/* Only show loading indicator when fetching more messages and we already have some */}
              {messagesLoading && messages.length > 0 && !isLoading && (
                <div className="messages-loading-more">
                  <div className="loading-spinner-small"></div>
                </div>
              )}
              
              {/* Show skeleton loader when initially loading messages */}
              {(isLoading || (messagesLoading && messages.length === 0)) && 
                (prevSelectedChatRef.current?._id !== selectedChat._id || !prevSelectedChatRef.current) ? (
                <>
                  <div className="loading-messages">
                    <div className="loading-spinner"></div>
                    <div className="message-content">
                      <p>Loading messages...</p>
                    </div>
                  </div>
                  {/* Add skeleton messages for better UX */}
                  <div className="message-skeleton incoming"></div>
                  <div className="message-skeleton outgoing"></div>
                  <div className="message-skeleton incoming"></div>
                </>
              ) : messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {/* Add button to scroll to bottom when not auto-scrolling */}
                  {userScrolled && messages.length > 5 && (
                    <button 
                      className="scroll-to-bottom-btn"
                      onClick={() => {
                        setAutoScroll(true);
                        setUserScrolled(false); // Reset user scroll state
                        // Delay scrolling to ensure state updates first
                        setTimeout(scrollToBottom, 50);
                      }}
                    >
                      ↓ New messages
                    </button>
                  )}
                  
                  {/* Render messages */}
                  {messages.map(message => (
                    <div 
                      key={message._id}
                      className={`message ${message.sender._id === user._id ? 'outgoing' : 'incoming'} ${message.isSending ? 'sending' : ''} ${message.error ? 'error' : ''}`}
                    >
                      <div className="message-content">
                        <p>{message.content}</p>
                      </div>
                      <span className="message-time">
                        {new Date(message.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {message.sender._id === user._id && !message.isSending && !message.error && (
                        <div className="read-status">
                          {message.readBy.some(id => 
                            id !== user._id && selectedChat.participants.some(p => p._id === id)
                          ) ? 'Read' : 'Delivered'}
                        </div>
                      )}
                      {message.error && (
                        <div className="error-message">
                          Failed to send
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Add a larger div for better scrolling to bottom */}
                  <div className="messages-end-spacer" ref={messagesEndRef} style={{ height: '20px' }}></div>
                </>
              )}
              
              {isUserTyping() && (
                <div className="typing-indicator">
                  Someone is typing...
                </div>
              )}
            </div>
            
            {/* Message Input */}
            <div className="message-input-container">
              <div className="message-input">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => { 
                    setNewMessage(e.target.value); 
                    handleTyping();
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                  <FaSmile />
                </button>
              </div>
              <button className="send-btn" onClick={handleSendMessage}>
                <FaPaperPlane />
              </button>
              {showEmojiPicker && (
                <div className="emoji-picker-container" ref={emojiPickerRef}>
                  <EmojiPicker 
                    onEmojiClick={handleEmojiClick}
                    height={300}
                    width={300}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="welcome-container"
            >
              <h2>Welcome, {user?.firstName}!</h2>
              <p>Select a chat to start messaging</p>
            </motion.div>
          </div>
        )}
      </div>
      
      {/* Profile Drawer */}
      {isProfileOpen && selectedChat && (
        <ProfileDrawer
          chat={selectedChat}
          onClose={() => setIsProfileOpen(false)}
          onDeleteContact={(chatId) => {
            handleDeleteContact(chatId);
            setIsProfileOpen(false); // Close the drawer after deletion
          }}
        />
      )}
      
      {/* Add connection status indicator */}
      <ConnectionStatus />
    </div>
  );
};

export default ChatPage;
