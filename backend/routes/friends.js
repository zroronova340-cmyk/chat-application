const express = require('express');
const router = express.Router();
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Send a friend request
router.post('/request', auth, async (req, res) => {
    try {
        const { receiverUsername } = req.body;
        const receiver = await User.findOne({ username: receiverUsername });
        
        if (!receiver) return res.status(404).json({ message: 'User not found' });
        if (receiver._id.toString() === req.userData.userId) {
            return res.status(400).json({ message: 'Cannot invite yourself' });
        }

        // Check if request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: req.userData.userId, receiver: receiver._id },
                { sender: receiver._id, receiver: req.userData.userId }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'Request already exists or you are already friends' });
        }

        const newRequest = new FriendRequest({
            sender: req.userData.userId,
            receiver: receiver._id
        });

        await newRequest.save();
        res.status(201).json({ message: 'Invitation sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pending requests for the current user
router.get('/pending', auth, async (req, res) => {
    try {
        const requests = await FriendRequest.find({ 
            receiver: req.userData.userId, 
            status: 'pending' 
        }).populate('sender', 'username');
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accept a friend request
router.put('/accept/:requestId', auth, async (req, res) => {
    try {
        const request = await FriendRequest.findById(req.params.requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        
        if (request.receiver.toString() !== req.userData.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        request.status = 'accepted';
        await request.save();
        res.status(200).json({ message: 'Invitation accepted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get list of friends (accepted requests)
router.get('/list', auth, async (req, res) => {
    try {
        const userId = req.userData.userId;
        const friends = await FriendRequest.find({
            $or: [
                { sender: userId, status: 'accepted' },
                { receiver: userId, status: 'accepted' }
            ]
        }).populate('sender', 'username').populate('receiver', 'username');

        // Extract the other person from the request
        const friendList = friends.map(req => {
            return req.sender._id.toString() === userId ? req.receiver : req.sender;
        });

        res.status(200).json(friendList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
