const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.userData.userId;
        
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ]
        }).sort({ createdAt: 1 });
        
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        const { receiverId, roomId, content, type, isEncrypted } = req.body;
        
        // Default to disappearing after 24 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const message = new Message({
            sender: req.userData.userId,
            receiver: receiverId || null,
            room: roomId || null,
            content: req.file ? `/uploads/${req.file.filename}` : content,
            type: req.file ? 'image' : type,
            isEncrypted,
            expiresAt
        });
        await message.save();
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save a message (prevent it from disappearing)
router.put('/save/:messageId', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        // Toggle saved status
        message.isSaved = !message.isSaved;
        
        // If saved, remove the expiration timer
        if (message.isSaved) {
            message.expiresAt = undefined; 
        } else {
            // If unsaved, set a new 24hr timer from current time
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            message.expiresAt = expiresAt;
        }

        await message.save();
        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
