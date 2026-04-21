# 🌐 Secure Real-Time Chat Application

A premium, full-stack real-time messaging application built with **Node.js, Socket.IO, React, and MongoDB**.

## 🚀 Features
- **Real-Time Messaging**: Instant 1:1 and group communication via WebSockets.
- **End-to-End Encryption (E2EE)**: Messages are encrypted client-side using AES-256 before being sent.
- **User Authentication**: Secure JWT-based auth with password hashing (bcrypt).
- **File Sharing**: Support for sharing images and documents.
- **Typing Indicators**: Real-time status updates showing when a contact is typing.
- **Modern UI**: Sleek, glassmorphism-based design with smooth animations.
- **History Persistence**: Full chat history stored and searchable in MongoDB.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Framer Motion, Lucide Icons, Crypto-JS.
- **Backend**: Node.js, Express, Socket.IO, Mongoose.
- **Database**: MongoDB.
- **Containerization**: Docker & Docker Compose.

## 🏁 How to Run

### Option 1: Using Docker (Recommended)
1. Ensure Docker Desktop is running.
2. Run `docker-compose up --build`.
3. Open `http://localhost:5173`.

### Option 2: Local Development
1. **Start MongoDB** locally.
2. **Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🔒 Security
- All sensitive data is hashed.
- API endpoints are protected by JWT.
- Messages are encrypted before hitting the network.
