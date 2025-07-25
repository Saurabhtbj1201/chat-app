import React, { forwardRef } from 'react';
import { FaUserCircle, FaSignOutAlt, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const HeaderMenu = forwardRef(({ isOpen, onClose, onProfileClick, onDeleteContact, selectedChat }, ref) => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  if (!isOpen) return null;

  const handleProfileClick = () => {
    navigate('/profile');
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="header-dropdown" ref={ref}>
      {/* If in sidebar menu show Profile option */}
      {!selectedChat && (
        <div className="header-dropdown-item" onClick={handleProfileClick}>
          <FaUserCircle />
          <span>Profile</span>
        </div>
      )}

      {/* If in chat header menu show Contact Profile option */}
      {selectedChat && !selectedChat.isGroupChat && (
        <div className="header-dropdown-item" onClick={onProfileClick}>
          <FaUserCircle />
          <span>View Profile</span>
        </div>
      )}

      {/* Add Delete Contact option for one-on-one chats */}
      {selectedChat && !selectedChat.isGroupChat && (
        <div className="header-dropdown-item" onClick={() => {
          onDeleteContact(selectedChat._id);
          onClose();
        }}>
          <FaTrash />
          <span>Delete Contact</span>
        </div>
      )}

      {/* Always show Logout option */}
      <div className="header-dropdown-item" onClick={handleLogout}>
        <FaSignOutAlt />
        <span>Logout</span>
      </div>
    </div>
  );
});

export default HeaderMenu;
