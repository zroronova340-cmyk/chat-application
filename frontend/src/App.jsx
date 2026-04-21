import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import ChatMain from './components/ChatMain';
import './App.css';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className="app-container">
      {!user ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <ChatMain user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
