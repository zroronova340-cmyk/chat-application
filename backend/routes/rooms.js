const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// Create a room
router.post('/', auth, async (req, res) => {
    try {
        const { name } = req.body;
        const room = new Room({
            name,
            creator: req.userData.userId,
            members: [req.userData.userId]
        });
        await room.save();
        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all rooms the user is part of
router.get('/', auth, async (req, res) => {
    try {
        const rooms = await Room.find({ members: req.userData.userId, isActive: true })
            .populate('creator', 'username')
            .populate('members', 'username');
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Invite a user to a room
router.post('/:roomId/invite', auth, async (req, res) => {
    try {
        const { userId } = req.body;
        const room = await Room.findById(req.params.roomId);
        
        if (!room) return res.status(404).json({ message: 'Room not found' });
        
        if (!room.members.includes(userId)) {
            room.members.push(userId);
            await room.save();
        }
        res.status(200).json(room);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Terminate a room (only for creator)
router.delete('/:roomId', auth, async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        
        if (room.creator.toString() !== req.userData.userId) {
            return res.status(403).json({ message: 'Only creator can terminate this room' });
        }
        
        room.isActive = false;
        await room.save(); // Soft delete
        res.status(200).json({ message: 'Room terminated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
