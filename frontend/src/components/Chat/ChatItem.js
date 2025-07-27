import React, { useContext, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AuthContext } from '../../context/AuthContext';
import { FaEllipsisV, FaTrash, FaUserCircle } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const ChatItem = ({ chat, isSelected, onClick, isOnline, onDeleteContact, onViewProfile }) => {
  const { user } = useContext(AuthContext);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  
  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && 
          menuRef.current && 
          !menuRef.current.contains(event.target) &&
          !menuButtonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
  // Determine chat name and image
  const getChatData = () => {
    if (chat.isGroupChat) {
      return {
        name: chat.groupName,
        image: 'default-group.png'
      };
    } else {
      const otherUser = chat.participants.find(p => p._id !== user?._id);
      return {
        name: otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User',
        image: otherUser?.profilePicture || 'default-avatar.png',
        user: otherUser
      };
    }
  };
  
  const chatData = getChatData();
  
  const handleMenuClick = (e) => {
    e.stopPropagation(); // Prevent chat selection when clicking menu
    setShowMenu(!showMenu);
  };
  
  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    onDeleteContact(chat._id);
    setShowMenu(false);
  };
  
  // Update handleProfileClick to check if onViewProfile is a function
  const handleProfileClick = (e) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    if (!chat.isGroupChat && chatData.user && typeof onViewProfile === 'function') {
      onViewProfile(chat, chatData.user);
      setShowMenu(false);
    } else {
      console.warn('onViewProfile is not a function or missing');
      setShowMenu(false);
    }
  };
  
  return (
    <div 
      className={`chat-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <img 
        className="chat-item-avatar" 
        src={chatData.image} // Already S3 URL from backend
        alt={chatData.name} 
      />
      <div className="chat-item-details">
        <div className="chat-item-header">
          <span className="chat-item-name">{chatData.name}</span>
          {chat.latestMessage && (
            <span className="chat-item-time">
              {formatDistanceToNow(new Date(chat.latestMessage.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
        <div className="chat-item-message">
          {chat.latestMessage ? (
            chat.latestMessage.sender._id === user?._id ? 
              `You: ${chat.latestMessage.content}` : 
              chat.latestMessage.content
          ) : (
            'No messages yet'
          )}
        </div>
        <div className="chat-item-status">
          {!chat.isGroupChat && (
            <>
              <span className={isOnline ? 'online-indicator' : 'offline-indicator'}></span>
              <span className="chat-item-status-text">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Add 3-dot menu button */}
      <button 
        className="chat-item-menu-button"
        onClick={handleMenuClick}
        ref={menuButtonRef}
      >
        <FaEllipsisV />
      </button>
      
      {/* Dropdown menu */}
      {showMenu && (
        <div className="chat-item-dropdown" ref={menuRef}>
          {/* Only show profile option for one-on-one chats */}
          {!chat.isGroupChat && (
            <button className="chat-item-dropdown-item" onClick={handleProfileClick}>
              <FaUserCircle />
              <span>View Profile</span>
            </button>
          )}
          <button className="chat-item-dropdown-item" onClick={handleDeleteClick}>
            <FaTrash />
            <span>Delete Contact</span>
          </button>
        </div>
      )}
    </div>
  );
};

ChatItem.propTypes = {
  chat: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  isOnline: PropTypes.bool,
  onDeleteContact: PropTypes.func.isRequired,
  onViewProfile: PropTypes.func.isRequired
};

ChatItem.defaultProps = {
  isSelected: false,
  isOnline: false,
  onViewProfile: () => console.warn('onViewProfile prop not provided')
};

export default ChatItem;
