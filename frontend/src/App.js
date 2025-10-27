import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import LandingPage from './components/Landingpage';
import Employee from './components/Employee'; 
import Supplier from './components/Supplier';
import Utensils from './components/Utensils';
import Ingredients from './components/Ingredients';
import Flavors from './components/Flavors';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="app-loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing page should be accessible to everyone */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Login and Register should redirect to dashboard if already authenticated */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} 
          />
          
          {/* Dashboard should redirect to login if not authenticated */}
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
          />
           <Route 
            path="/employees" 
            element={isAuthenticated ? <Employee /> : <Navigate to="/login" />} 
          />
           <Route 
            path="/suppliers" 
            element={isAuthenticated ? <Supplier /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/utensils" 
            element={isAuthenticated ? <Utensils /> : <Navigate to="/login" />} 
          />
           <Route 
            path="/ingredients" 
            element={isAuthenticated ? <Ingredients /> : <Navigate to="/login" />} 
          />
            <Route
            path="/flavors"
            element={isAuthenticated ? <Flavors /> : <Navigate to="/login" />}
          />
          
          
          {/* Catch all route - redirect to landing page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;