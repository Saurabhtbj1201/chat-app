# 💬 Real-Time Chat Application

A full-featured real-time chat application built with the **MERN** stack (MongoDB, Express, React, Node.js) and **Socket.IO** for instant communication.

![Chat App Screenshot](https://placeholder-for-screenshot.png)

## 🚀 Live Demo

🔗 [https://master.d1mxcnht7o30t1.amplifyapp.com/](https://master.d1mxcnht7o30t1.amplifyapp.com/)

---

## 🧩 Features

- ⚡ **Real-time messaging** using Socket.IO  
- 🔐 **User authentication** with JWT & Passport.js  
- 🌐 **Social login** (Google, Facebook, GitHub, Twitter)  
- 🧑‍🎨 **Customizable user profiles & avatars**  
- 💬 **One-on-one and group chats**  
- 📶 **Online/offline status**  
- ✍️ **Typing indicators**  
- 📬 **Message status** (sent, delivered, read)  
- 👁️‍🗨️ **Read receipts**  
- 🔍 **User search**  
- 📱 **Fully responsive design**  
- 📧 **Password reset via email**

---

## 🛠️ Technology Stack

### 🖥️ Backend

| Tech | Description |
|------|-------------|
| ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white) | JavaScript runtime |
| ![Express.js](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white) | Web framework |
| ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white) | Database |
| ![Mongoose](https://img.shields.io/badge/Mongoose-880000?logo=mongoose&logoColor=white) | MongoDB object modeling |
| ![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socket.io&logoColor=white) | Real-time communication |
| ![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white) | Authentication |
| ![Passport.js](https://img.shields.io/badge/Passport.js-34E27A?logo=passport&logoColor=white) | Authentication strategies |
| ![Bcrypt](https://img.shields.io/badge/Bcrypt.js-F3C614?logoColor=black) | Password hashing |
| ![Nodemailer](https://img.shields.io/badge/Nodemailer-009E60?logo=mail.ru&logoColor=white) | Email sending |
| ![Multer](https://img.shields.io/badge/Multer-FF6F00?logo=upload&logoColor=white) | File uploads |

### 🌐 Frontend

| Tech | Description |
|------|-------------|
| ![React](https://img.shields.io/badge/React.js-61DAFB?logo=react&logoColor=black) | UI library |
| ![React Router](https://img.shields.io/badge/React%20Router-CA4245?logo=react-router&logoColor=white) | Routing |
| ![Context API](https://img.shields.io/badge/Context%20API-6DB33F?logo=react&logoColor=white) | State management |
| ![Axios](https://img.shields.io/badge/Axios-5A29E4?logo=axios&logoColor=white) | HTTP client |
| ![Socket.IO](https://img.shields.io/badge/Socket.IO%20Client-010101?logo=socket.io&logoColor=white) | Real-time client |
| ![Framer Motion](https://img.shields.io/badge/Framer%20Motion-0055FF?logo=framer&logoColor=white) | Animations |
| ![React Icons](https://img.shields.io/badge/React%20Icons-E91E63?logo=react&logoColor=white) | UI icons |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) | Styling |

---

## 📦 Prerequisites

Ensure the following are installed on your system:

- Node.js (v14.x or later)
- npm (v6.x or later)
- MongoDB (Local or Atlas)
- Git

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Saurabhtbj1201/chat-app.git
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

Made with ❤️ by [Saurabh Kumar](https://github.com/saurabhtbj1201)

## 🔗 Connect With Me

<p align="center">
  <a href="https://www.linkedin.com/in/Saurabhtbj1201/"><img src="https://img.shields.io/badge/LinkedIn-%230077B5.svg?logo=linkedin&logoColor=white" alt="LinkedIn"/></a>
  <a href="https://x.com/saurabhtbj1201"><img src="https://img.shields.io/badge/Twitter-%231DA1F2.svg?logo=Twitter&logoColor=white" alt="Twitter"/></a>
  <a href="https://www.instagram.com/saurabhtbj1201"><img src="https://img.shields.io/badge/Instagram-%23E4405F.svg?logo=Instagram&logoColor=white" alt="Instagram"/></a>
  <a href="https://www.facebook.com/Saurabhtbj1201"><img src="https://img.shields.io/badge/Facebook-%231877F2.svg?logo=Facebook&logoColor=white" alt="Facebook"/></a>
  <a href="https://www.quora.com/profile/Saurabh-Kumar-17241"><img src="https://img.shields.io/badge/Quora-%23B92B27.svg?logo=Quora&logoColor=white" alt="Quora"/></a>
  <a href="https://saurabh-12.blogspot.com/"><img src="https://img.shields.io/badge/Blogger-%23FF5722.svg?logo=Blogger&logoColor=white" alt="Blogger"/></a>
  <a href="https://saurabh1201.medium.com/"><img src="https://img.shields.io/badge/Medium-%2312100E.svg?logo=Medium&logoColor=white" alt="Medium"/></a>
  <a href="https://www.gu-saurabh.tech"><img src="https://img.shields.io/badge/Portfolio-%2300C4CC.svg?logo=Google-Chrome&logoColor=white" alt="Portfolio"/></a>
  <a href="https://wa.me/919798024301"><img src="https://img.shields.io/badge/WhatsApp-25D366?style=flat&logo=whatsapp&logoColor=white" alt="WhatsApp"/></a>
</p>

---