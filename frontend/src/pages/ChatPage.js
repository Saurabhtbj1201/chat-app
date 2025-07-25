import React, { useContext, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaEllipsisV, FaPaperPlane, FaSmile, FaUserPlus, FaTimes, FaSync } from 'react-icons/fa';
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
    selectedChat, 
    setSelectedChat,
    messages,
    fetchMessages,
    sendMessage,
    onlineUsers,
    typingUsers,
    startTyping,
    stopTyping,
    clearNotifications,
    setMessages // Add this line to fix the error:
  } = useContext(ChatContext);
  
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false); // Replace isSearching with loading
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
  const [isRefreshing, setIsRefreshing] = useState(false); // Add a refreshing state to show loading indicator
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  
  // Refs for the dropdown menus
  const sidebarMenuRef = useRef(null);
  const chatMenuRef = useRef(null);
  const sidebarButtonRef = useRef(null);
  const chatButtonRef = useRef(null);
  
  // Fetch chats when component mounts
  useEffect(() => {
    // Only fetch on initial component mount, not on every fetchChats change
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array for initial load only
  
  // Fetch messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
      clearNotifications(selectedChat._id);
    }
  }, [selectedChat]); // Only depends on selectedChat, not fetchMessages
  
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
  
  // Modify the message fetching effect to wait for token
  useEffect(() => {
    if (selectedChat && token) {
      fetchMessages(selectedChat._id);
      clearNotifications(selectedChat._id);
    }
  }, [selectedChat, token, fetchMessages, clearNotifications]); // Add token dependency
  
  // Handle search
  const handleSearch = async () => {
    if (!searchTerm) return;
    
    setLoading(true);
    
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/users?search=${searchTerm}`);
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle user search input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    
    if (e.target.value === '') {
      setSearchResults([]);
    }
  };
  
  // Start a chat with a user
  const accessChat = async (userId) => {
    try {
      const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/chats`, { userId });
      
      if (!chats.find((c) => c._id === data._id)) {
        fetchChats();
      }
      
      setSelectedChat(data);
      setSearchResults([]);
      setSearchTerm('');
    } catch (error) {
      console.error('Error accessing chat:', error);
    }
  };
  
  // Update handleRefresh to check both user and token
  const handleRefresh = async () => {
    if (!user || !token) {
      console.warn('Cannot refresh: User or authentication token not available');
      return;
    }
    
    setIsRefreshing(true);
    try {
      await fetchChats();
      if (selectedChat) {
        await fetchMessages(selectedChat._id);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Improve handleSendMessage to check authentication first
  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;
    
    // Check authentication before sending
    if (!user || !token) {
      console.error('Cannot send message: Not authenticated');
      return;
    }
    
    sendMessage(selectedChat._id, newMessage);
    setNewMessage('');
    stopTyping(selectedChat._id);
  };
  
  // Handle message typing
  const handleTyping = () => {
    startTyping(selectedChat._id);
    
    // Clear existing timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Set new timeout
    const timeout = setTimeout(() => {
      stopTyping(selectedChat._id);
    }, 3000);
    
    setTypingTimeout(timeout);
  };
  
  // Add emoji to message
  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };
  
  // Get chat name and image
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
        name: `${otherUser.firstName} ${otherUser.lastName}`,
        image: otherUser.profilePicture
      };
    }
  };
  
  // Check if a user is typing in the selected chat
  const isUserTyping = () => {
    if (!selectedChat || !typingUsers[selectedChat._id]) return false;
    
    const typingInChat = typingUsers[selectedChat._id];
    return typingInChat.some(userId => userId !== user._id);
  };
  
  // Add a function to fetch all users
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
  
  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      // For sidebar menu
      if (showHeaderMenu && 
          sidebarMenuRef.current && 
          !sidebarMenuRef.current.contains(event.target) &&
          !sidebarButtonRef.current.contains(event.target)) {
        setShowHeaderMenu(false);
      }
      
      // For chat header menu
      if (showChatMenu && 
          chatMenuRef.current && 
          !chatMenuRef.current.contains(event.target) &&
          !chatButtonRef.current.contains(event.target)) {
        setShowChatMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeaderMenu, showChatMenu]);
  
  // Add this function to handle deleting a contact
  const handleDeleteContact = async (chatId) => {
    try {
      // Call API to delete chat
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/chats/${chatId}`);
      
      // Update local state
      fetchChats();
      
      // If the deleted chat was selected, clear selection
      if (selectedChat && selectedChat._id === chatId) {
        setSelectedChat(null);
      }
      
      // Show success message or notification here if desired
    } catch (error) {
      console.error('Error deleting contact:', error);
      // Show error message or notification here if desired
    }
  };
  
  // Update message rendering to show sending/error states
  const handleRetryMessage = (message) => {
    // Remove the failed message
    setMessages(prev => prev.filter(m => m._id !== message._id));
    
    // Try sending again
    sendMessage(selectedChat._id, message.content);
  };
  
  // Fix the handleViewProfile function and ensure it's properly defined and passed
  // Make sure handleViewProfile is correctly defined
  const handleViewProfile = (chat, contactUser) => {
    console.log("Viewing profile for:", contactUser.firstName, contactUser.lastName);
    setSelectedChat(chat);
    setIsProfileOpen(true);
  };
  
  // Add this function to filter chats based on search term
  const getFilteredChats = () => {
    if (!chatSearchTerm.trim()) {
      return chats;
    }
    
    return chats.filter(chat => {
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
  
  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <div className="user-profile-header">
            <img 
              src={user?.profilePicture ? `${process.env.REACT_APP_API_URL}/uploads/${user.profilePicture}` : '/default-avatar.png'} 
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
                onChange={(e) => setSearchUserTerm(e.target.value)}
              />
              <button className="search-btn">
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
                          src={user.profilePicture ? `${process.env.REACT_APP_API_URL}/uploads/${user.profilePicture}` : '/default-avatar.png'} 
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
          {getFilteredChats().length > 0 ? (
            getFilteredChats().map(chat => (
              <ChatItem
                key={chat._id}
                chat={chat}
                isSelected={selectedChat?._id === chat._id}
                onClick={() => setSelectedChat(chat)}
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
      <div className="chat-area">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-user-info">
                <img 
                  src={selectedChat ? `${process.env.REACT_APP_API_URL}/uploads/${getChatData(selectedChat).image}` : '/default-avatar.png'} 
                  alt="Profile" 
                />
                <div>
                  <h3>{selectedChat ? getChatData(selectedChat).name : 'Select a chat'}</h3>
                  {selectedChat && !selectedChat.isGroupChat && (
                    <p className={
                      onlineUsers.has(selectedChat.participants.find(p => p._id !== user?._id)?._id) 
                      ? "status-online" 
                      : "status-offline"
                    }>
                      {onlineUsers.has(
                        selectedChat.participants.find(p => p._id !== user?._id)?._id
                      ) ? 'Online' : 'Offline'}
                    </p>
                  )}
                  {selectedChat && selectedChat.isGroupChat && (
                    <p>{selectedChat.participants.length} members</p>
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
            <div className="chat-messages">
              {messages.map(message => (
                <div 
                  key={message._id}
                  className={`message ${message.sender._id === user._id ? 'outgoing' : 'incoming'} ${message.isSending ? 'sending' : ''} ${message.error ? 'error' : ''}`}
                >
                  <div className="message-content">
                    {message.content}
                    <span className="message-time">
                      {message.isSending ? 'Sending...' : 
                       message.error ? 'Failed to send' :
                       new Date(message.createdAt).toLocaleTimeString([], { 
                         hour: '2-digit', 
                         minute: '2-digit' 
                       })}
                    </span>
                  </div>
                  {message.sender._id === user._id && !message.isSending && !message.error && (
                    <div className="read-status">
                      {message.readBy.some(id => 
                        id !== user._id && selectedChat.participants.some(p => p._id === id)
                      ) ? 'Read' : 'Delivered'}
                    </div>
                  )}
                  {message.error && (
                    <button 
                      className="retry-btn"
                      onClick={() => handleRetryMessage(message)}
                    >
                      Retry
                    </button>
                  )}
                </div>
              ))}
              
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
                {showEmojiPicker && (
                  <div className="emoji-picker-container">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </div>
                )}
              </div>
              <button className="send-btn" onClick={handleSendMessage}>
                <FaPaperPlane />
              </button>
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
      {isProfileOpen && (
        <ProfileDrawer 
          chat={selectedChat} 
          onClose={() => setIsProfileOpen(false)} 
          onDeleteContact={handleDeleteContact}
        />
      )}
    </div>
  );
};



export default ChatPage;