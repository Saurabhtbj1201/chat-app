const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/user.model');

// Mock bcrypt
jest.mock('bcryptjs');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should hash password before saving', async () => {
    // Setup
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed_password');
    
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    };
    
    const user = new User(userData);
    user.isModified = jest.fn().mockReturnValue(true);
    
    // Get the middleware function
    const preSaveHook = user.schema.pre.mock.calls.find(call => call[0] === 'save')[1];
    
    // Execute the middleware
    await preSaveHook.call(user, () => {});
    
    // Assert
    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
    expect(user.password).toBe('hashed_password');
  });
  
  it('should not hash password if not modified', async () => {
    // Setup
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'already_hashed'
    };
    
    const user = new User(userData);
    user.isModified = jest.fn().mockReturnValue(false);
    
    // Get the middleware function
    const preSaveHook = user.schema.pre.mock.calls.find(call => call[0] === 'save')[1];
    
    // Execute the middleware
    await preSaveHook.call(user, () => {});
    
    // Assert
    expect(bcrypt.genSalt).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(user.password).toBe('already_hashed');
  });
  
  it('should correctly compare passwords', async () => {
    // Setup
    bcrypt.compare.mockResolvedValue(true);
    
    const user = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'hashed_password'
    });
    
    // Execute
    const result = await user.matchPassword('password123');
    
    // Assert
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
    expect(result).toBe(true);
  });
});
