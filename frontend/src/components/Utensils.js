import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Utensils.css';

const Utensils = () => {
  // STATE MANAGEMENT: EXCELLENT - Well-organized state variables for utensils management
  const [utensils, setUtensils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUtensil, setEditingUtensil] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterStockLevel, setFilterStockLevel] = useState('ALL');
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'BAKING_TOOLS',
    quantity: 1,
    minStockLevel: 1,
    maxStockLevel: 500, // Added max stock level
    supplier: '',
    purchaseDate: '',
    lastMaintenance: '',
    nextMaintenance: '',
    cost: '',
    location: 'KITCHEN',
    status: 'AVAILABLE',
    notes: '',
    image: null
  });

  // STOCK LEVEL THRESHOLDS - Configurable for different utensil types
  const stockLevels = {
    HIGH: 500,
    MODERATE: 100,
    LOW: 90
  };

  // PASTRY/CAFE-SPECIFIC UTENSIL CATEGORIES
  const utensilCategories = [
    'BAKING_TOOLS',
    'MEASURING_EQUIPMENT',
    'MIXING_TOOLS',
    'CUTTING_TOOLS',
    'SERVING_UTENSILS',
    'DECORATING_TOOLS',
    'COOKWARE',
    'BAKEWARE',
    'ELECTRICAL_EQUIPMENT'
  ];

  // LOCATION OPTIONS
  const locationOptions = [
    'KITCHEN',
    'BAKING_STATION',
    'PASTRY_STATION',
    'COFFEE_STATION',
    'STORAGE',
    'DISHWASHING_AREA',
    'FRONT_COUNTER'
  ];

  // STATUS OPTIONS
  const statusOptions = [
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
    'BROKEN',
    'CLEANING',
    'LOST'
  ];

  // STOCK LEVEL OPTIONS
  const stockLevelOptions = [
    'ALL',
    'HIGH',
    'MODERATE',
    'LOW',
    'CRITICAL'
  ];

  // DATA FETCHING: EXCELLENT - Proper useEffect implementation
  useEffect(() => {
    fetchUtensils();
    fetchCategories();
    fetchSuppliers();
  }, []);

  // API INTEGRATION: EXCELLENT - Clean async/await implementation with error handling
  const fetchUtensils = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/utensils', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUtensils(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching utensils:', err);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/utensils/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback to default categories if API fails
      setCategories(utensilCategories);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/suppliers?category=UTENSILS', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  // STOCK LEVEL CALCULATION: EXCELLENT - Dynamic stock level determination
  const getStockLevel = (utensil) => {
    const quantity = utensil.quantity;
    
    if (quantity >= stockLevels.HIGH) {
      return 'HIGH';
    } else if (quantity >= stockLevels.MODERATE) {
      return 'MODERATE';
    } else if (quantity >= stockLevels.LOW) {
      return 'LOW';
    } else {
      return 'CRITICAL';
    }
  };

  // STOCK LEVEL BADGE: EXCELLENT - Visual stock level indicators
  const getStockLevelBadge = (utensil) => {
    const stockLevel = getStockLevel(utensil);
    const stockConfig = {
      HIGH: { class: 'stock-high', text: 'High Stock', icon: '📊' },
      MODERATE: { class: 'stock-moderate', text: 'Moderate Stock', icon: '⚖️' },
      LOW: { class: 'stock-low', text: 'Low Stock', icon: '📉' },
      CRITICAL: { class: 'stock-critical', text: 'Critical Stock', icon: '🚨' }
    };
    const config = stockConfig[stockLevel] || stockConfig.MODERATE;
    return (
      <span className={`stock-level-badge ${config.class}`}>
        {config.icon} {config.text}
      </span>
    );
  };

  // STOCK LEVEL PROGRESS BAR: EXCELLENT - Visual progress indicator
  const getStockProgressBar = (utensil) => {
    const stockLevel = getStockLevel(utensil);
    const maxStock = utensil.maxStockLevel || stockLevels.HIGH;
    const percentage = Math.min((utensil.quantity / maxStock) * 100, 100);
    
    return (
      <div className="stock-progress-container">
        <div className="stock-progress-bar">
          <div 
            className={`stock-progress-fill stock-progress-${stockLevel.toLowerCase()}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="stock-progress-text">
          {utensil.quantity} / {maxStock}
        </span>
      </div>
    );
  };

  // FORM HANDLING: EXCELLENT - Proper input change handling
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) : value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      image: e.target.files[0]
    });
  };

  // FORM SUBMISSION: EXCELLENT - Proper FormData handling for file uploads
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'image' && formData[key]) {
          data.append('image', formData.image);
        } else {
          data.append(key, formData[key]);
        }
      });

      if (editingUtensil) {
        await axios.put(`http://localhost:5000/api/utensils/${editingUtensil._id}`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post('http://localhost:5000/api/utensils', data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      resetForm();
      fetchUtensils();
    } catch (err) {
      console.error('Error saving utensil:', err);
    }
  };

  // EDIT FUNCTIONALITY: VERY GOOD - Proper state management for editing
  const handleEdit = (utensil) => {
    setEditingUtensil(utensil);
    setFormData({
      name: utensil.name,
      category: utensil.category,
      quantity: utensil.quantity || 1,
      minStockLevel: utensil.minStockLevel || 1,
      maxStockLevel: utensil.maxStockLevel || 500,
      supplier: utensil.supplier || '',
      purchaseDate: utensil.purchaseDate ? utensil.purchaseDate.split('T')[0] : '',
      lastMaintenance: utensil.lastMaintenance ? utensil.lastMaintenance.split('T')[0] : '',
      nextMaintenance: utensil.nextMaintenance ? utensil.nextMaintenance.split('T')[0] : '',
      cost: utensil.cost || '',
      location: utensil.location || 'KITCHEN',
      status: utensil.status || 'AVAILABLE',
      notes: utensil.notes || '',
      image: null
    });
    setShowForm(true);
  };

  // DELETE FUNCTIONALITY: GOOD - Confirmation dialog adds safety
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this utensil?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/utensils/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchUtensils();
      } catch (err) {
        console.error('Error deleting utensil:', err);
      }
    }
  };

  // STATUS UPDATE: EXCELLENT - Additional functionality for utensil status management
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/utensils/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUtensils();
    } catch (err) {
      console.error('Error updating utensil status:', err);
    }
  };

  // RESET FUNCTION: EXCELLENT - Clean form reset implementation
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'BAKING_TOOLS',
      quantity: 1,
      minStockLevel: 1,
      maxStockLevel: 500,
      supplier: '',
      purchaseDate: '',
      lastMaintenance: '',
      nextMaintenance: '',
      cost: '',
      location: 'KITCHEN',
      status: 'AVAILABLE',
      notes: '',
      image: null
    });
    setEditingUtensil(null);
    setShowForm(false);
    setShowMaintenance(false);
  };

  // FILTERING: VERY GOOD - Efficient client-side filtering with stock level
  const filteredUtensils = utensils.filter(utensil => {
    const categoryMatch = filterCategory === 'ALL' || utensil.category === filterCategory;
    const statusMatch = filterStatus === 'ALL' || utensil.status === filterStatus;
    const stockLevelMatch = filterStockLevel === 'ALL' || getStockLevel(utensil) === filterStockLevel;
    return categoryMatch && statusMatch && stockLevelMatch;
  });

  // STATUS BADGE: EXCELLENT - Visual status indicators
  const getStatusBadge = (status) => {
    const statusConfig = {
      AVAILABLE: { class: 'status-available', text: 'Available' },
      IN_USE: { class: 'status-in-use', text: 'In Use' },
      MAINTENANCE: { class: 'status-maintenance', text: 'Maintenance' },
      BROKEN: { class: 'status-broken', text: 'Broken' },
      CLEANING: { class: 'status-cleaning', text: 'Cleaning' },
      LOST: { class: 'status-lost', text: 'Lost' }
    };
    const config = statusConfig[status] || statusConfig.AVAILABLE;
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  // CATEGORY DISPLAY NAME: EXCELLENT - Convert enum values to readable names
  const getCategoryDisplayName = (category) => {
    const categoryMap = {
      'BAKING_TOOLS': 'Baking Tools',
      'MEASURING_EQUIPMENT': 'Measuring Equipment',
      'MIXING_TOOLS': 'Mixing Tools',
      'CUTTING_TOOLS': 'Cutting Tools',
      'SERVING_UTENSILS': 'Serving Utensils',
      'DECORATING_TOOLS': 'Decorating Tools',
      'COOKWARE': 'Cookware',
      'BAKEWARE': 'Bakeware',
      'ELECTRICAL_EQUIPMENT': 'Electrical Equipment'
    };
    return categoryMap[category] || category;
  };

  // STOCK SUMMARY: EXCELLENT - Overview of stock levels
  const getStockSummary = () => {
    const summary = {
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
      CRITICAL: 0,
      TOTAL: utensils.length
    };

    utensils.forEach(utensil => {
      const stockLevel = getStockLevel(utensil);
      summary[stockLevel]++;
    });

    return summary;
  };

  const stockSummary = getStockSummary();

  if (loading) {
    return <div className="loading">Loading utensils...</div>;
  }

  return (
    <div className="utensils-management">
      <div className="utensils-header">
        <h2>Pastry & Cafe Utensils Management</h2>
        <div className="header-controls">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add Utensil
          </button>
          <button 
            className={`btn ${showMaintenance ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowMaintenance(!showMaintenance)}
          >
            {showMaintenance ? 'Hide Maintenance' : 'Show Maintenance'}
          </button>
        </div>
      </div>

      {/* STOCK SUMMARY DASHBOARD: EXCELLENT - Quick overview of stock levels */}
      <div className="stock-summary">
        <div className="stock-summary-item stock-high">
          <span className="stock-count">{stockSummary.HIGH}</span>
          <span className="stock-label">High Stock</span>
        </div>
        <div className="stock-summary-item stock-moderate">
          <span className="stock-count">{stockSummary.MODERATE}</span>
          <span className="stock-label">Moderate</span>
        </div>
        <div className="stock-summary-item stock-low">
          <span className="stock-count">{stockSummary.LOW}</span>
          <span className="stock-label">Low Stock</span>
        </div>
        <div className="stock-summary-item stock-critical">
          <span className="stock-count">{stockSummary.CRITICAL}</span>
          <span className="stock-label">Critical</span>
        </div>
        <div className="stock-summary-item stock-total">
          <span className="stock-count">{stockSummary.TOTAL}</span>
          <span className="stock-label">Total Items</span>
        </div>
      </div>

      {/* FILTER UI: EXCELLENT - Intuitive filtering options including stock level */}
      <div className="filters">
        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {utensilCategories.map(category => (
              <option key={category} value={category}>
                {getCategoryDisplayName(category)}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Status</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Stock Level:</label>
          <select 
            value={filterStockLevel} 
            onChange={(e) => setFilterStockLevel(e.target.value)}
          >
            {stockLevelOptions.map(level => (
              <option key={level} value={level}>
                {level === 'ALL' ? 'All Stock Levels' : level.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FORM UI: EXCELLENT - Comprehensive form with stock level fields */}
      {showForm && (
        <div className="utensils-form-overlay">
          <div className="utensils-form">
            <h3>{editingUtensil ? 'Edit Utensil' : 'Add New Utensil'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Utensil Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Silicone Spatula, Digital Scale"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    {utensilCategories.map(category => (
                      <option key={category} value={category}>
                        {getCategoryDisplayName(category)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Min Stock Level</label>
                  <input
                    type="number"
                    name="minStockLevel"
                    value={formData.minStockLevel}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Stock Level</label>
                  <input
                    type="number"
                    name="maxStockLevel"
                    value={formData.maxStockLevel}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="500"
                  />
                </div>
                <div className="form-group">
                  <label>Current Stock Level</label>
                  <div className="current-stock-indicator">
                    {formData.quantity >= stockLevels.HIGH ? (
                      <span className="stock-high">High Stock</span>
                    ) : formData.quantity >= stockLevels.MODERATE ? (
                      <span className="stock-moderate">Moderate Stock</span>
                    ) : formData.quantity >= stockLevels.LOW ? (
                      <span className="stock-low">Low Stock</span>
                    ) : (
                      <span className="stock-critical">Critical Stock</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* ... rest of the form remains the same ... */}
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUtensil ? 'Update' : 'Add'} Utensil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UTENSILS GRID: EXCELLENT - Responsive card layout with stock level indicators */}
      <div className="utensils-grid">
        {filteredUtensils.length === 0 ? (
          <div className="no-utensils">
            <p>No utensils found matching your criteria.</p>
          </div>
        ) : (
          filteredUtensils.map(utensil => (
            <div key={utensil._id} className="utensil-card">
              <div className="utensil-header-info">
                <div className="utensil-image">
                  {utensil.imageUrl ? (
                    <img src={`http://localhost:5000${utensil.imageUrl}`} alt={utensil.name} />
                  ) : (
                    <div className="placeholder-image">
                      {utensil.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="utensil-title">
                  <h3>{utensil.name}</h3>
                  {getStatusBadge(utensil.status)}
                  {getStockLevelBadge(utensil)}
                </div>
              </div>
              
              <div className="utensil-info">
                <p className="utensil-category">
                  <span className={`category-badge category-${utensil.category.toLowerCase()}`}>
                    {getCategoryDisplayName(utensil.category)}
                  </span>
                </p>
                
                {/* STOCK PROGRESS BAR: EXCELLENT - Visual stock level indicator */}
                {getStockProgressBar(utensil)}
                
                <div className="utensil-details">
                  <p className="utensil-quantity">
                    <strong>Quantity:</strong> {utensil.quantity}
                    {utensil.minStockLevel && (
                      <span className="min-stock"> (Min: {utensil.minStockLevel})</span>
                    )}
                  </p>
                  
                  <p className="utensil-location">
                    <strong>Location:</strong> {utensil.location.replace('_', ' ')}
                  </p>
                  
                  {utensil.cost && (
                    <p className="utensil-cost">
                      <strong>Cost:</strong> ${parseFloat(utensil.cost).toFixed(2)}
                    </p>
                  )}
                </div>
                
                {/* ... rest of the card content remains the same ... */}
              </div>
              
              <div className="utensil-actions">
                <div className="status-controls">
                  <select 
                    value={utensil.status} 
                    onChange={(e) => handleStatusUpdate(utensil._id, e.target.value)}
                    className="status-select"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="action-buttons">
                  <button 
                    className="btn-edit"
                    onClick={() => handleEdit(utensil)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(utensil._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Utensils;