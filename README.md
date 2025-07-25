# Real-Time Chat Application

A full-featured real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.IO for real-time communication.

![Chat App Screenshot](https://placeholder-for-screenshot.png)

## Features

- **Real-time messaging** using Socket.IO
- **User authentication** with JWT and Passport.js
- **Social login** integration (Google, Facebook, GitHub, Twitter)
- **User profiles** with customizable avatars
- **One-on-one chats** between users
- **Group chats** with multiple participants
- **Message status indicators** (sent, delivered, read)
- **Typing indicators**
- **Online/offline status**
- **Read receipts**
- **User search** functionality
- **Responsive design** for mobile and desktop
- **Password reset** via email

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB object modeling
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **Passport.js** - Authentication strategies
- **Bcrypt.js** - Password hashing
- **Nodemailer** - Email sending
- **Multer** - File uploads

### Frontend
- **React.js** - UI library
- **React Router** - Client-side routing
- **Context API** - State management
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time communication
- **Framer Motion** - Animations
- **React Icons** - UI icons
- **CSS3** - Styling

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14.x or later)
- npm (v6.x or later)
- MongoDB (local installation or MongoDB Atlas account)
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/chat-app.git
cd chat-app
```

### 2. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit the `.env` file with your configuration:

```
MONGODB_URI=mongodb://<username>:<password>@cluster0.mongodb.net/chat-app?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
SENDGRID_API_KEY=your_sendgrid_api_key
```

### 3. Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit the `.env` file with your configuration:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 4. Running the Application

```bash
# Start the backend server
cd backend
npm run dev

# In a new terminal, start the frontend server
cd frontend
npm start
```

## Usage

1. Register a new account or log in with an existing account.
2. Complete your profile and upload a profile picture.
3. Add friends or search for users to chat with.
4. Start chatting in real-time!

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/YourFeature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some feature'`)
5. Push to the branch (`git push origin feature/YourFeature`)
6. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Your Name](https://github.com/yourusername)

