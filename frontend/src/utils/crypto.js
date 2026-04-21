import CryptoJS from 'crypto-js';

const SECRET_KEY = 'chat-app-shared-secret'; // In a real app, this would be per-room derived keys

export const encryptMessage = (message) => {
    return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
};

export const decryptMessage = (encryptedMessage) => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        return 'Decryption Error';
    }
};
