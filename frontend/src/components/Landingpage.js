import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landingpage.css';

const LandingPage = () => {
  const [emojiIndex, setEmojiIndex] = useState(0);
  const navigate = useNavigate();
  const emojis = ['🍓', '🍰', '🧁', '🍪', '🎂', '🍩', '🍫', '🥐'];

  useEffect(() => {
    // Cycle through emojis
    const emojiInterval = setInterval(() => {
      setEmojiIndex((prev) => (prev + 1) % emojis.length);
    }, 1500);

    return () => clearInterval(emojiInterval);
  }, [emojis.length]);

  const handleGetStarted = () => {
    console.log('Get Started clicked - navigating to /login');
    
    // First try using react-router navigate
    navigate('/login');
    
    // Fallback in case navigate doesn't work or there's a redirect issue
    setTimeout(() => {
      // Check if we're still on the landing page (navigation didn't work)
      if (window.location.pathname === '/' || window.location.pathname === '/landing') {
        console.log('Fallback navigation triggered');
        window.location.href = '/login';
      }
    }, 100);
  };

  return (
    <div className="landing-container">
      <div className="content">
        <h1 className="logo">M<span className="logo-o">O</span><span className="logo-o">O</span>NBERRY</h1>
        <h2 className="tagline">Sweet Inventory Management System</h2>
        
        <div className="emoji-container">
          {emojis.map((emoji, index) => (
            <span 
              key={index} 
              className={`emoji ${index === emojiIndex ? 'active' : ''}`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {emoji}
            </span>
          ))}
        </div>

        <p className="description">
          Moonberry is a deliciously designed inventory system specifically for pastry shops, 
          bakeries, and sweet treat businesses. Keep track of your ingredients, products, 
          and stock levels with our easy-to-use platform.
        </p>

        <div className="features">
          <div className="feature">
            <span className="feature-emoji">📊</span>
            <h3>Inventory Tracking</h3>
            <p>Monitor stock levels in real-time</p>
          </div>
          <div className="feature">
            <span className="feature-emoji">🧾</span>
            <h3>Order Management</h3>
            <p>Handle supplier orders with ease</p>
          </div>
          <div className="feature">
            <span className="feature-emoji">📈</span>
            <h3>Employee Activity</h3>
            <p>Tracks employees!</p>
          </div>
        </div>

        <button className="cta-button" onClick={handleGetStarted}>
          Get Started
        </button>
      </div>
    </div>
  );
};

export default LandingPage;