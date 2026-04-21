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
        const { receiverId, content, type, isEncrypted } = req.body;
        const message = new Message({
            sender: req.userData.userId,
            receiver: receiverId,
            content: req.file ? `/uploads/${req.file.filename}` : content,
            type: req.file ? 'image' : type,
            isEncrypted
        });
        await message.save();
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
