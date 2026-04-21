import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, LogOut, Search, User, MoreVertical, Paperclip, Smile, Image as ImageIcon, Plus, Users, Trash2, Globe } from 'lucide-react';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import './ChatMain.css';

const ChatMain = ({ user, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [networkAddress, setNetworkAddress] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const fileInputRef = useRef();
  const scrollRef = useRef();

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    newSocket.emit('join', user.userId);

    newSocket.on('receive_message', (data) => {
        if ((selectedUser && (data.senderId === selectedUser._id || data.receiverId === selectedUser._id)) || 
            (selectedRoom && data.roomId === selectedRoom._id)) {
            const decryptedContent = data.isEncrypted ? decryptMessage(data.content) : data.content;
            setMessages((prev) => [...prev, { ...data, content: decryptedContent }]);
        }
    });

    newSocket.on('display_typing', (data) => {
        if (selectedUser && data.userId === selectedUser._id) {
            setOtherUserTyping(data.isTyping);
        }
    });

    return () => newSocket.close();
  }, [user.userId, selectedUser, selectedRoom]);

  const fetchData = async () => {
    try {
      const [usersRes, roomsRes, netRes] = await Promise.all([
        axios.get('/api/auth/users'),
        axios.get('/api/rooms', { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get('/api/network')
      ]);
      setUsers(usersRes.data.filter(u => u._id !== user.userId));
      setRooms(roomsRes.data);
      setNetworkAddress(netRes.data.address);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.userId, user.token]);

  useEffect(() => {
    if (selectedUser || selectedRoom) {
      const fetchHistory = async () => {
        try {
          const endpoint = selectedUser 
            ? `/api/messages/${selectedUser._id}`
            : `/api/messages/room/${selectedRoom._id}`;
          
          // Note: need to add room history route in backend too, but for now we'll skip or use a generic one
          // For simplicity in this demo, we'll just fetch user messages or clear
          if (selectedUser) {
              const { data } = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${user.token}` }
              });
              setMessages(data.map(msg => ({
                ...msg,
                content: msg.isEncrypted ? decryptMessage(msg.content) : msg.content
              })));
          } else {
              setMessages([]); // Group messages can be added later
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchHistory();
      if (selectedRoom) {
          socket?.emit('join_room', selectedRoom._id);
      }
    }
  }, [selectedUser, selectedRoom, user.token, socket]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e, file = null) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !file || !(selectedUser || selectedRoom)) return;

    const isEncrypted = !file;
    const contentToSend = isEncrypted ? encryptMessage(inputText) : inputText;

    const messageData = {
      receiverId: selectedUser?._id || null,
      roomId: selectedRoom?._id || null,
      content: inputText || 'Sent a file',
      senderId: user.userId,
      isGroup: !!selectedRoom,
      isEncrypted,
      createdAt: new Date().toISOString()
    };

    socket.emit('send_message', { ...messageData, content: contentToSend });
    if (!selectedRoom) setMessages((prev) => [...prev, messageData]);
    
    try {
      const formData = new FormData();
      formData.append('receiverId', selectedUser?._id || '');
      formData.append('roomId', selectedRoom?._id || '');
      formData.append('isEncrypted', isEncrypted);
      
      if (file) {
        formData.append('file', file);
        formData.append('type', 'image');
      } else {
        formData.append('content', contentToSend);
        formData.append('type', 'text');
      }

      await axios.post('http://localhost:5000/api/messages', formData, {
        headers: { 
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'multipart/form-data'
        }
      });
    } catch (err) {
      console.error(err);
    }

    setInputText('');
    handleTyping(false);
  };

  const createRoom = async () => {
      if (!newRoomName) return;
      try {
          await axios.post('http://localhost:5000/api/rooms', { name: newRoomName }, {
              headers: { Authorization: `Bearer ${user.token}` }
          });
          setNewRoomName('');
          setShowCreateRoom(false);
          fetchData();
      } catch (err) {
          console.error(err);
      }
  };

  const terminateRoom = async (roomId) => {
      if (!window.confirm('Terminate this room?')) return;
      try {
          await axios.delete(`http://localhost:5000/api/rooms/${roomId}`, {
              headers: { Authorization: `Bearer ${user.token}` }
          });
          setSelectedRoom(null);
          fetchData();
      } catch (err) {
          console.error(err);
      }
  };

  const inviteUser = async (roomId) => {
      const username = window.prompt('Enter username to invite:');
      if (!username) return;
      try {
          const u = users.find(usr => usr.username === username);
          if (!u) return alert('User not found');
          await axios.post(`http://localhost:5000/api/rooms/${roomId}/invite`, { userId: u._id }, {
              headers: { Authorization: `Bearer ${user.token}` }
          });
          alert('User invited!');
      } catch (err) {
          console.error(err);
      }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) sendMessage(null, file);
  };

  const handleTyping = (typing) => {
    setIsTyping(typing);
    if (selectedUser) {
        socket.emit('typing', {
          receiverId: selectedUser._id,
          userId: user.userId,
          isTyping: typing
        });
    }
  };

  return (
    <div className="chat-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-profile">
            <div className="avatar">{user.username[0].toUpperCase()}</div>
            <div className="user-info">
              <h3>{user.username}</h3>
              <span className="status-badge">Active Now</span>
            </div>
          </div>
          <button onClick={onLogout} className="logout-btn"><LogOut size={18} /></button>
        </div>

        <div className="network-info">
            <Globe size={14} />
            <span>LAN Address: <strong>{networkAddress}:5173</strong></span>
        </div>

        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search..." />
        </div>

        <div className="sidebar-tabs">
            <button className="active">Direct</button>
            <button onClick={() => setShowCreateRoom(true)} className="create-room-btn"><Plus size={16} /> New Room</button>
        </div>

        <div className="users-list">
          <p className="list-title">Rooms</p>
          {rooms.map((r) => (
            <div 
              key={r._id} 
              className={`user-item ${selectedRoom?._id === r._id ? 'active' : ''}`}
              onClick={() => { setSelectedRoom(r); setSelectedUser(null); }}
            >
              <div className="avatar mini group"><Users size={18} /></div>
              <div className="user-details">
                <p className="username">{r.name}</p>
                <p className="last-msg">{r.members.length} members</p>
              </div>
              {r.creator._id === user.userId && (
                  <button onClick={(e) => { e.stopPropagation(); terminateRoom(r._id); }} className="terminate-btn"><Trash2 size={14} /></button>
              )}
            </div>
          ))}

          <p className="list-title">Contacts</p>
          {users.map((u) => (
            <div 
              key={u._id} 
              className={`user-item ${selectedUser?._id === u._id ? 'active' : ''}`}
              onClick={() => { setSelectedUser(u); setSelectedRoom(null); }}
            >
              <div className="avatar mini">{u.username[0].toUpperCase()}</div>
              <div className="user-details">
                <p className="username">{u.username}</p>
                <p className="last-msg">Secure channel</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        {(selectedUser || selectedRoom) ? (
          <>
            <div className="chat-header">
              <div className="header-info">
                <div className="avatar mini">
                    {selectedUser ? selectedUser.username[0].toUpperCase() : <Users size={18} />}
                </div>
                <div>
                  <h4>{selectedUser ? selectedUser.username : selectedRoom.name}</h4>
                  <p className="typing-indicator">{otherUserTyping ? 'Typing...' : (selectedRoom ? 'Group Chat' : 'Online')}</p>
                </div>
              </div>
              <div className="header-actions">
                {selectedRoom && (
                    <button onClick={() => inviteUser(selectedRoom._id)} className="invite-btn"><Plus size={16} /> Invite</button>
                )}
                <MoreVertical size={20} />
              </div>
            </div>

            <div className="messages-container">
              {messages.map((msg, index) => (
                <div key={index} className={`message-wrapper ${msg.senderId === user.userId || msg.sender === user.userId ? 'sent' : 'received'}`}>
                  <div className="message-bubble">
                    <span className="sender-name">{msg.senderId === user.userId ? 'You' : (users.find(u => u._id === msg.senderId)?.username || 'Other')}</span>
                    {msg.type === 'image' ? (
                        <img src={`http://localhost:5000${msg.content}`} alt="shared" className="shared-img" />
                    ) : (
                        msg.content
                    )}
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <form className="chat-footer" onSubmit={sendMessage}>
              <div className="footer-actions" onClick={() => fileInputRef.current.click()}>
                <Paperclip size={20} />
                <input type="file" hidden ref={fileInputRef} onChange={handleFileUpload} accept="image/*" />
              </div>
              <input 
                type="text" 
                placeholder="Type a message..." 
                className="input-field"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  handleTyping(true);
                  if (e.target.value === '') handleTyping(false);
                }}
              />
              <button type="submit" className="send-btn"><Send size={20} /></button>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="empty-state-content">
               <Globe size={64} color="var(--text-muted)" />
               <h2>Network Chat Active</h2>
               <p>Invite friends using your IP: <strong>{networkAddress}</strong></p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Modal for creating room */}
      <AnimatePresence>
          {showCreateRoom && (
              <div className="modal-overlay">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content glass">
                      <h3>Create New Room</h3>
                      <input type="text" placeholder="Room Name" className="input-field" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
                      <div className="modal-actions">
                          <button onClick={() => setShowCreateRoom(false)} className="btn">Cancel</button>
                          <button onClick={createRoom} className="btn btn-primary">Create</button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default ChatMain;
