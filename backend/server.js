const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const chatRoutes = require('./routes/chat.routes');
const messageRoutes = require('./routes/message.routes');
const { setupSocket } = require('./services/socket.service');
const jwt = require('jsonwebtoken');

dotenv.config();

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.use(passport.initialize());

// Passport config
require('./config/passport')(passport);

// Setup socket authentication middleware
io.use((socket, next) => {
  try {
    // Try to get token from auth object first, then from query params
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      console.error('Socket auth failed: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Socket auth failed: Invalid token', err.message);
        return next(new Error('Authentication error: Invalid token'));
      }
      
      // Store user information in socket object for later use
      socket.userId = decoded.id; // Use consistent property name with socket.service.js
      socket.user = decoded;
      console.log(`Socket authenticated for user: ${decoded.id}`);
      next();
    });
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
});

// Setup socket.io
setupSocket(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// MongoDB Connection with improved options and error handling
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  connectTimeoutMS: 10000, // Give up initial connection after 10s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Consider using a local MongoDB instance for development:');
    console.log('1. Install MongoDB Community Edition');
    console.log('2. Start MongoDB: mongod --dbpath=C:\\data\\db');
    console.log('3. Update .env to use: MONGODB_URI=mongodb://localhost:27017/chatapp');
  });

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  // Log S3 configuration status
  if (process.env.AWS_S3_BUCKET_NAME) {
    console.log(`S3 bucket configured: ${process.env.AWS_S3_BUCKET_NAME}`);
  } else {
    console.warn('S3 bucket not configured - using local file storage');
  }
});

// Add error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Add more robust error handling for API requests
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: err.message,
      code: 'VALIDATION_ERROR' 
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      message: 'Invalid ID format', 
      details: err.message,
      code: 'INVALID_ID' 
    });
  }
  
  // Handle ECONNRESET errors which can happen with slow connections
  if (err.code === 'ECONNRESET') {
    return res.status(408).json({
      message: 'Connection reset by client',
      code: 'CONNECTION_RESET'
    });
  }
  
  // Handle timeout errors
  if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
    return res.status(408).json({
      message: 'Request timeout',
      code: 'REQUEST_TIMEOUT'
    });
  }
  
  // Default error response
  res.status(500).json({ 
    message: 'Something went wrong!',
    code: 'SERVER_ERROR',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Add a simple route to check server status
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
