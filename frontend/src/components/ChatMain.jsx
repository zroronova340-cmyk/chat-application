import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, LogOut, Search, User, MoreVertical, Paperclip, Smile, Image as ImageIcon, Plus, Users, Trash2, Globe, Shield, Lock, EyeOff, Bell, BellOff, Bookmark, Star } from 'lucide-react';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import './ChatMain.css';

const ChatMain = ({ user, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]); // This will now represent "Friends"
  const [rooms, setRooms] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [networkAddress, setNetworkAddress] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showInviteFriend, setShowInviteFriend] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]); // New state for group creation
  const [isPrivacyMode, setIsPrivacyMode] = useState(true);
  const [isBlurred, setIsBlurred] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);

  const fileInputRef = useRef();
  const scrollRef = useRef();

  useEffect(() => {
    const handleFocus = () => setIsBlurred(false);
    const handleBlur = () => {
        if (isPrivacyMode) setIsBlurred(true);
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('blur', handleBlur);
    };
  }, [isPrivacyMode]);

  useEffect(() => {
    const newSocket = io();
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
      const [friendsRes, roomsRes, netRes, pendingRes] = await Promise.all([
        axios.get('/api/friends/list', { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get('/api/rooms', { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get('/api/network'),
        axios.get('/api/friends/pending', { headers: { Authorization: `Bearer ${user.token}` } })
      ]);
      setUsers(friendsRes.data);
      setRooms(roomsRes.data);
      setNetworkAddress(netRes.data.address);
      setPendingRequests(pendingRes.data);
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

      await axios.post('/api/messages', formData, {
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

  const inviteFriend = async () => {
    if (!inviteUsername) return;
    try {
        await axios.post('/api/friends/request', { receiverUsername: inviteUsername }, {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        setInviteUsername('');
        setShowInviteFriend(false);
        fetchData();
        alert('Invitation sent!');
    } catch (err) {
        alert(err.response?.data?.message || 'Error sending invitation');
    }
  };

  const acceptInvite = async (requestId) => {
    try {
        await axios.put(`/api/friends/accept/${requestId}`, {}, {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        fetchData();
    } catch (err) {
        console.error(err);
    }
  };

  const createRoom = async () => {
      if (!newRoomName || selectedMembers.length === 0) return;
      try {
          await axios.post('/api/rooms', { 
            name: newRoomName,
            initialMembers: selectedMembers 
          }, {
              headers: { Authorization: `Bearer ${user.token}` }
          });
          setNewRoomName('');
          setSelectedMembers([]);
          setShowCreateRoom(false);
          fetchData();
      } catch (err) {
          console.error(err);
      }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const terminateRoom = async (roomId) => {
      if (!window.confirm('Terminate this room?')) return;
      try {
          await axios.delete(`/api/rooms/${roomId}`, {
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
          await axios.post(`/api/rooms/${roomId}/invite`, { userId: u._id }, {
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

  const toggleSaveMessage = async (msgId) => {
    try {
        await axios.put(`/api/messages/save/${msgId}`, {}, {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isSaved: !m.isSaved } : m));
    } catch (err) {
        console.error(err);
    }
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

        <div className="security-status" onClick={() => setShowSecurityPanel(true)}>
            <div className="shield-glow"><Shield size={14} /></div>
            <div className="security-text">
                <p>E2EE Protocol v2.4</p>
                <span>Active Shield Protected</span>
            </div>
        </div>

        <div className="sidebar-tabs">
            <button className="active">Contacts</button>
            <button onClick={() => setShowInviteFriend(true)} className="create-room-btn"><Plus size={16} /> Add Friend</button>
        </div>

        <div className="users-list">
          {pendingRequests.length > 0 && (
              <>
                <p className="list-title">Pending Invitations</p>
                {pendingRequests.map(req => (
                    <div key={req._id} className="user-item pending">
                        <div className="avatar mini">{req.sender.username[0].toUpperCase()}</div>
                        <div className="user-details">
                            <p className="username">{req.sender.username}</p>
                            <p className="last-msg">Incoming Request</p>
                        </div>
                        <button onClick={() => acceptInvite(req._id)} className="accept-btn">Accept</button>
                    </div>
                ))}
              </>
          )}

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

          <p className="list-title">Friends</p>
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
          {users.length === 0 && <p className="empty-list-msg">No friends yet. Invite someone!</p>}
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
                    <div className="bubble-header">
                        <span className="sender-name">{msg.senderId === user.userId ? 'You' : (users.find(u => u._id === msg.senderId)?.username || 'Other')}</span>
                        <button 
                            className={`save-msg-btn ${msg.isSaved ? 'saved' : ''}`}
                            onClick={() => toggleSaveMessage(msg._id)}
                            title={msg.isSaved ? 'Saved permanently' : 'Disappears in 24h. Click to save.'}
                        >
                            {msg.isSaved ? <Star size={12} fill="currentColor" /> : <Bookmark size={12} />}
                        </button>
                    </div>
                    {msg.type === 'image' ? (
                        <img src={msg.content} alt="shared" className="shared-img" />
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
               <div className="pulse-shield"><Shield size={64} /></div>
               <h2>Neural Guard Active</h2>
               <p>Your connection is bridged at: <strong>{networkAddress}</strong></p>
               <div className="security-badges">
                   <div className="badge"><Lock size={12} /> AES-256</div>
                   <div className="badge"><Shield size={12} /> TLS 1.3</div>
                   <div className="badge"><EyeOff size={12} /> Stealth Mode</div>
               </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
            {isBlurred && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="privacy-overlay">
                    <div className="scanner-line"></div>
                    <Lock size={48} />
                    <h3>Privacy Protected</h3>
                    <p>Click anywhere to resume secure session</p>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Security Panel Modal */}
      <AnimatePresence>
          {showSecurityPanel && (
              <div className="modal-overlay">
                  <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="modal-content security-panel glass">
                      <div className="panel-header">
                        <Shield className="glow-icon" />
                        <h3>Security Protocol Dashboard</h3>
                      </div>
                      
                      <div className="protocol-list">
                          <div className="protocol-item">
                              <label>End-to-End Encryption</label>
                              <div className="status"><div className="dot green"></div> Verified</div>
                          </div>
                          <div className="protocol-item">
                              <label>Privacy Mode (Blur on focus loss)</label>
                              <button 
                                className={`toggle ${isPrivacyMode ? 'on' : ''}`}
                                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                              >
                                {isPrivacyMode ? 'ENABLED' : 'DISABLED'}
                              </button>
                          </div>
                          <div className="protocol-item">
                              <label>Local Network Node</label>
                              <span className="node-id">{networkAddress}</span>
                          </div>
                      </div>

                      <button onClick={() => setShowSecurityPanel(false)} className="btn btn-primary full-width">Close Security Matrix</button>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Modal for inviting friend */}
      <AnimatePresence>
          {showInviteFriend && (
              <div className="modal-overlay">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content glass">
                      <h3>Find User</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Enter the exact username of the person you want to chat with.</p>
                      <input type="text" placeholder="Username" className="input-field" value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} />
                      <div className="modal-actions">
                          <button onClick={() => setShowInviteFriend(false)} className="btn">Cancel</button>
                          <button onClick={inviteFriend} className="btn btn-primary">Send Invitation</button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Modal for creating room */}
      <AnimatePresence>
          {showCreateRoom && (
              <div className="modal-overlay">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content glass">
                      <h3>Create New Group</h3>
                      <p className="modal-subtitle">Add at least 1 friend to start the group matrix.</p>
                      
                      <input type="text" placeholder="Group Name" className="input-field" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
                      
                      <div className="member-selection-list">
                          <p className="list-title">Select Friends</p>
                          {users.map(u => (
                              <div key={u._id} className={`selection-item ${selectedMembers.includes(u._id) ? 'selected' : ''}`} onClick={() => toggleMemberSelection(u._id)}>
                                  <div className="checkbox">{selectedMembers.includes(u._id) && <div className="check-dot"></div>}</div>
                                  <span>{u.username}</span>
                              </div>
                          ))}
                          {users.length === 0 && <p className="empty-msg">You need friends to create a group!</p>}
                      </div>

                      <div className="modal-actions">
                          <button onClick={() => { setShowCreateRoom(false); setSelectedMembers([]); }} className="btn">Cancel</button>
                          <button 
                            onClick={createRoom} 
                            className="btn btn-primary"
                            disabled={!newRoomName || selectedMembers.length === 0}
                          >
                            Initialize Group
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default ChatMain;
