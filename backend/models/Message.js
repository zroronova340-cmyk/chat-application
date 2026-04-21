const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For 1:1
    group: { type: String, default: null }, // For group chats (room ID)
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    isEncrypted: { type: Boolean, default: false },
    isSaved: { type: Boolean, default: false },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    expiresAt: { type: Date }
}, { timestamps: true });

// TTL Index: Deletes document when current time > expiresAt
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
