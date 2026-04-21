import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, User, MessageCircle } from 'lucide-react';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    try {
      const { data } = await axios.post(`http://localhost:5000${endpoint}`, formData);
      if (isLogin) {
        onLogin(data);
      } else {
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="auth-card glass"
    >
      <div className="auth-header">
        <div className="auth-logo">
          <MessageCircle size={40} color="var(--primary)" />
        </div>
        <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p>{isLogin ? 'Enter your credentials to continue' : 'Join our secure chat community'}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <AnimatePresence mode="wait">
          {!isLogin && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="input-group"
            >
              <User size={20} />
              <input
                type="text"
                placeholder="Username"
                className="input-field"
                required
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="input-group">
          <Mail size={20} />
          <input
            type="email"
            placeholder="Email Address"
            className="input-field"
            required
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="input-group">
          <Lock size={20} />
          <input
            type="password"
            placeholder="Password"
            className="input-field"
            required
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary">
          {isLogin ? <><LogIn size={20} /> Sign In</> : <><UserPlus size={20} /> Sign Up</>}
        </button>
      </form>

      <div className="auth-footer">
        <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn">
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
        </button>
      </div>


    </motion.div>
  );
};

export default Auth;
