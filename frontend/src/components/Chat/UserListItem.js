import React from 'react';
import PropTypes from 'prop-types';

const UserListItem = ({ user, onClick }) => {
  return (
    <div className="user-list-item" onClick={onClick}>
      <img 
        src={user.profilePicture ? `${process.env.REACT_APP_API_URL}/uploads/${user.profilePicture}` : '/default-avatar.png'} 
        alt={`${user.firstName} ${user.lastName}`} 
      />
      <div className="user-list-item-info">
        <h4>{`${user.firstName} ${user.lastName}`}</h4>
        <p>{user.email}</p>
      </div>
    </div>
  );
};

UserListItem.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    profilePicture: PropTypes.string
  }).isRequired,
  onClick: PropTypes.func.isRequired
};

export default UserListItem;
