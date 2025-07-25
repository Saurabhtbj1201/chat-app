import io from 'socket.io-client';

let socket;
let isInitialized = false;
let reconnectTimer = null;
let authFailCallback = null;

const initSocket = (userId, token, onAuthFail = null) => {
  if (!userId || !token) {
    console.error('Cannot initialize socket: missing userId or token');
    return null;
  }

  // Store auth fail callback
  if (onAuthFail) {
    authFailCallback = onAuthFail;
  }

  // Clear any existing reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (!isInitialized) {
    // Connect to the socket server with auth token
    socket = io(process.env.REACT_APP_API_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket'],
      auth: {
        token: `Bearer ${token}`
      },
      query: {
        userId
      }
    });

    // Debug connection events
    socket.on('connect', () => {
      console.log('Socket connected. Socket ID:', socket.id);
      
      if (userId) {
        socket.emit('setup', userId);
        console.log('User setup emitted for ID:', userId);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      
      // Handle authentication errors
      if (error.message === 'Authentication error') {
        console.error('Socket authentication failed. Token may be invalid.');
        
        // Call the auth fail callback if provided
        if (authFailCallback) {
          authFailCallback('SOCKET_AUTH_FAILED');
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected. Reason:', reason);
      
      // Handle specific disconnection reasons
      if (reason === 'io server disconnect') {
        // Server disconnected the client due to authentication issues
        console.error('Server disconnected the socket. Authentication may have failed.');
        
        // Call the auth fail callback if provided
        if (authFailCallback) {
          authFailCallback('SERVER_DISCONNECT');
        }
      }
    });

    socket.on('reconnect', (attempt) => {
      console.log('Socket reconnected after', attempt, 'attempts');
      
      if (userId) {
        socket.emit('setup', userId);
        console.log('User setup emitted again for ID:', userId);
      }
    });

    isInitialized = true;
  } else if (userId && socket) {
    // If socket already initialized but user ID changed
    socket.emit('setup', userId);
    console.log('User setup emitted for ID:', userId);
  }

  return socket;
};

const getSocket = () => socket;

const disconnect = () => {
  if (socket) {
    socket.disconnect();
    isInitialized = false;
    console.log('Socket disconnected manually');
    
    // Clear auth fail callback
    authFailCallback = null;
    
    // Clear any reconnect timer
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }
};

export default {
  initSocket,
  getSocket,
  disconnect
};
