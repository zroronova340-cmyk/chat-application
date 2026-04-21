require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const os = require('os');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const roomRoutes = require('./routes/rooms');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/api/network', (req, res) => {
    const interfaces = os.networkInterfaces();
    let address = 'localhost';
    for (const k in interfaces) {
        for (const k2 in interfaces[k]) {
            const addressInfo = interfaces[k][k2];
            if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
                address = addressInfo.address;
            }
        }
    }
    res.json({ address });
});

// Serve Frontend Static Files (for production)
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
    }
});

// Socket.IO Logic
const users = new Map(); // socketId -> userId

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
        users.set(socket.id, userId);
        socket.join(userId);
        console.log(`User ${userId} joined their private room`);
    });

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    socket.on('send_message', (data) => {
        const { receiverId, content, senderId, isGroup, roomId } = data;
        
        if (isGroup || roomId) {
            io.to(roomId).emit('receive_message', data);
        } else {
            io.to(receiverId).emit('receive_message', data);
        }
    });

    socket.on('typing', (data) => {
        const { receiverId, userId, isTyping } = data;
        io.to(receiverId).emit('display_typing', { userId, isTyping });
    });

    socket.on('disconnect', () => {
        users.delete(socket.id);
        console.log('User disconnected:', socket.id);
    });
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error('MongoDB connection error:', err));
