const authController = require('../../controllers/auth.controller');
const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../models/user.model');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('../../services/email.service');

describe('Auth Controller', () => {
  let req, res;
  
  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: { _id: 'test-user-id' }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('register', () => {
    it('should register a new user and return token', async () => {
      // Setup
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      };
      
      req.file = { filename: 'profile-pic.jpg' };
      
      const mockUser = {
        _id: 'new-user-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        profilePicture: 'profile-pic.jpg'
      };
      
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(User.create).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        mobile: undefined,
        profilePicture: 'profile-pic.jpg'
      });
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        token: 'mock-token',
        user: expect.objectContaining({
          id: 'new-user-id',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          profilePicture: 'profile-pic.jpg'
        })
      });
    });
    
    it('should return error if user already exists', async () => {
      // Setup
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      };
      
      User.findOne.mockResolvedValue({ email: 'john@example.com' });
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(User.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
    });
  });
  
  describe('login', () => {
    it('should login user and return token', async () => {
      // Setup
      req.body = {
        email: 'john@example.com',
        password: 'password123'
      };
      
      const mockUser = {
        _id: 'user-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        profilePicture: 'profile.jpg',
        matchPassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };
      
      User.findOne.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(mockUser.matchPassword).toHaveBeenCalledWith('password123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        token: 'mock-token',
        user: expect.objectContaining({
          id: 'user-id',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          profilePicture: 'profile.jpg'
        })
      });
    });
    
    it('should return error if user not found', async () => {
      // Setup
      req.body = {
        email: 'john@example.com',
        password: 'password123'
      };
      
      User.findOne.mockResolvedValue(null);
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
    
    it('should return error if password is incorrect', async () => {
      // Setup
      req.body = {
        email: 'john@example.com',
        password: 'password123'
      };
      
      const mockUser = {
        matchPassword: jest.fn().mockResolvedValue(false)
      };
      
      User.findOne.mockResolvedValue(mockUser);
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(mockUser.matchPassword).toHaveBeenCalledWith('password123');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
  });
});
