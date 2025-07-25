const Chat = require('../models/chat.model');
const User = require('../models/user.model');

// Create or access one-to-one chat
exports.accessChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'UserId is required' });
    }

    // Check if chat exists
    let chat = await Chat.find({
      isGroupChat: false,
      $and: [
        { participants: { $elemMatch: { $eq: req.user._id } } },
        { participants: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('participants', '-password')
      .populate('latestMessage');

    // Populate sender in latest message
    chat = await User.populate(chat, {
      path: 'latestMessage.sender',
      select: 'firstName lastName profilePicture email',
    });

    if (chat.length > 0) {
      res.json(chat[0]);
    } else {
      // Create new chat
      const newChat = await Chat.create({
        participants: [req.user._id, userId],
        isGroupChat: false,
      });

      const fullChat = await Chat.findById(newChat._id).populate(
        'participants',
        '-password'
      );

      res.status(201).json(fullChat);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all chats for a user
exports.fetchChats = async (req, res) => {
  try {
    // Find all chats where the user is a participant
    let chats = await Chat.find({
      participants: { $elemMatch: { $eq: req.user._id } },
    })
      .populate('participants', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    // Populate sender in latest message
    chats = await User.populate(chats, {
      path: 'latestMessage.sender',
      select: 'firstName lastName profilePicture email',
    });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create group chat
exports.createGroupChat = async (req, res) => {
  try {
    // Check if group name and users are provided
    if (!req.body.name || !req.body.users) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Parse users array
    let users = JSON.parse(req.body.users);

    // A group chat needs at least 2 users
    if (users.length < 2) {
      return res.status(400).json({ message: 'A group chat needs at least 2 users' });
    }

    // Add current user to group
    users.push(req.user._id);

    // Create group chat
    const groupChat = await Chat.create({
      groupName: req.body.name,
      participants: users,
      isGroupChat: true,
      groupAdmin: req.user._id,
    });

    // Fetch full group chat details
    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('participants', '-password')
      .populate('groupAdmin', '-password');

    res.status(201).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Rename group chat
exports.renameGroupChat = async (req, res) => {
  try {
    const { chatId, groupName } = req.body;

    // Update group name
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { groupName },
      { new: true }
    )
      .populate('participants', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add user to group
exports.addToGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    // Check if the user adding is the admin
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admins can add users' });
    }

    // Add user to group
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { participants: userId } },
      { new: true }
    )
      .populate('participants', '-password')
      .populate('groupAdmin', '-password');

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove user from group
exports.removeFromGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    // Check if the user removing is the admin
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admins can remove users' });
    }

    // Remove user from group
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { participants: userId } },
      { new: true }
    )
      .populate('participants', '-password')
      .populate('groupAdmin', '-password');

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
