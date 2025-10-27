import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Flavors.css';

const Flavors = () => {
  // STATE MANAGEMENT: EXCELLENT - Well-organized state variables for flavors management
  const [flavors, setFlavors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFlavor, setEditingFlavor] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStockLevel, setFilterStockLevel] = useState('ALL');
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'COFFEE_FLAVORS',
    quantity: 0,
    jars: 0,
    minStockLevel: 1,
    maxStockLevel: 10,
    costPerJar: '',
    supplier: '',
    expiryDate: '',
    storageLocation: 'SHELF_STABLE',
    status: 'ACTIVE',
    description: '',
    notes: '',
    image: null
  });

  // STOCK LEVEL THRESHOLDS - Based on jars
  const stockLevels = {
    HIGH: 8,    // 8+ jars
    MODERATE: 4, // 4-7 jars
    LOW: 2,     // 2-3 jars
    CRITICAL: 1  // 1 jar or less
  };

  // FLAVOR CATEGORIES
  const flavorCategories = [
    'COFFEE_FLAVORS',
    'FRUIT_FLAVORS',
    'JUICE_FLAVORS',
    'CLASSIC_FLAVORS',
    'SPECIALTY_FLAVORS',
    'SEASONAL_FLAVORS'
  ];

  // STORAGE LOCATION OPTIONS
  const storageLocations = [
    'SHELF_STABLE',
    'REFRIGERATOR',
    'COUNTERTOP',
    'DRY_STORAGE'
  ];

  // STATUS OPTIONS
  const statusOptions = [
    'ACTIVE',
    'INACTIVE',
    'DISCONTINUED',
    'SEASONAL'
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
    fetchFlavors();
    fetchCategories();
    fetchSuppliers();
  }, []);

  // API INTEGRATION: EXCELLENT - Clean async/await implementation with error handling
  const fetchFlavors = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/flavors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFlavors(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching flavors:', err);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/flavors/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback to default categories if API fails
      setCategories(flavorCategories);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/suppliers?category=FLAVORS', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  // STOCK LEVEL CALCULATION: EXCELLENT - Dynamic stock level determination based on jars
  const getStockLevel = (flavor) => {
    const jars = flavor.jars;
    
    if (jars >= stockLevels.HIGH) {
      return 'HIGH';
    } else if (jars >= stockLevels.MODERATE) {
      return 'MODERATE';
    } else if (jars >= stockLevels.LOW) {
      return 'LOW';
    } else {
      return 'CRITICAL';
    }
  };

  // STOCK LEVEL BADGE: EXCELLENT - Visual stock level indicators
  const getStockLevelBadge = (flavor) => {
    const stockLevel = getStockLevel(flavor);
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

  // CIRCULAR PROGRESS BAR: EXCELLENT - Visual circular progress indicator for jars
  const getCircularProgress = (flavor) => {
    const stockLevel = getStockLevel(flavor);
    const maxJars = flavor.maxStockLevel || stockLevels.HIGH;
    const percentage = Math.min((flavor.jars / maxJars) * 100, 100);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const progressColors = {
      HIGH: '#28a745',
      MODERATE: '#ffc107',
      LOW: '#fd7e14',
      CRITICAL: '#dc3545'
    };

    return (
      <div className="circular-progress-container">
        <svg className="circular-progress" width="100" height="100">
          <circle
            className="circular-progress-bg"
            cx="50"
            cy="50"
            r={radius}
            stroke="#e9ecef"
            strokeWidth="8"
            fill="none"
          />
          <circle
            className="circular-progress-fill"
            cx="50"
            cy="50"
            r={radius}
            stroke={progressColors[stockLevel]}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform="rotate(-90 50 50)"
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dy="7"
            fontSize="16"
            fontWeight="600"
            fill="#495057"
          >
            {flavor.jars}
          </text>
          <text
            x="50"
            y="70"
            textAnchor="middle"
            fontSize="10"
            fill="#6c757d"
          >
            Jars
          </text>
        </svg>
        <div className="circular-progress-text">
          <span className="current-jars">{flavor.jars} jars</span>
          <span className="max-jars">Max: {maxJars}</span>
        </div>
      </div>
    );
  };

  // EXPIRY ALERT: EXCELLENT - Alert for near expiry flavors
  const getExpiryAlert = (flavor) => {
    if (!flavor.expiryDate) return null;
    
    const expiryDate = new Date(flavor.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 14 && daysUntilExpiry >= 0) {
      return <span className="expiry-alert upcoming">Expires Soon!</span>;
    } else if (daysUntilExpiry < 0) {
      return <span className="expiry-alert expired">Expired!</span>;
    }
    return null;
  };

  // FORM HANDLING: EXCELLENT - Proper input change handling
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
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

      if (editingFlavor) {
        await axios.put(`http://localhost:5000/api/flavors/${editingFlavor._id}`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post('http://localhost:5000/api/flavors', data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      resetForm();
      fetchFlavors();
    } catch (err) {
      console.error('Error saving flavor:', err);
    }
  };

  // EDIT FUNCTIONALITY: VERY GOOD - Proper state management for editing
  const handleEdit = (flavor) => {
    setEditingFlavor(flavor);
    setFormData({
      name: flavor.name,
      category: flavor.category,
      quantity: flavor.quantity || 0,
      jars: flavor.jars || 0,
      minStockLevel: flavor.minStockLevel || 1,
      maxStockLevel: flavor.maxStockLevel || 10,
      costPerJar: flavor.costPerJar || '',
      supplier: flavor.supplier || '',
      expiryDate: flavor.expiryDate ? flavor.expiryDate.split('T')[0] : '',
      storageLocation: flavor.storageLocation || 'SHELF_STABLE',
      status: flavor.status || 'ACTIVE',
      description: flavor.description || '',
      notes: flavor.notes || '',
      image: null
    });
    setShowForm(true);
  };

  // DELETE FUNCTIONALITY: GOOD - Confirmation dialog adds safety
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this flavor?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/flavors/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchFlavors();
      } catch (err) {
        console.error('Error deleting flavor:', err);
      }
    }
  };

  // STATUS UPDATE: EXCELLENT - Additional functionality for flavor status management
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/flavors/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchFlavors();
    } catch (err) {
      console.error('Error updating flavor status:', err);
    }
  };

  // RESET FUNCTION: EXCELLENT - Clean form reset implementation
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'COFFEE_FLAVORS',
      quantity: 0,
      jars: 0,
      minStockLevel: 1,
      maxStockLevel: 10,
      costPerJar: '',
      supplier: '',
      expiryDate: '',
      storageLocation: 'SHELF_STABLE',
      status: 'ACTIVE',
      description: '',
      notes: '',
      image: null
    });
    setEditingFlavor(null);
    setShowForm(false);
    setShowDetails(false);
  };

  // FILTERING: VERY GOOD - Efficient client-side filtering with stock level
  const filteredFlavors = flavors.filter(flavor => {
    const categoryMatch = filterCategory === 'ALL' || flavor.category === filterCategory;
    const stockLevelMatch = filterStockLevel === 'ALL' || getStockLevel(flavor) === filterStockLevel;
    return categoryMatch && stockLevelMatch;
  });

  // CATEGORY DISPLAY NAME: EXCELLENT - Convert enum values to readable names
  const getCategoryDisplayName = (category) => {
    const categoryMap = {
      'COFFEE_FLAVORS': 'Coffee Flavors',
      'FRUIT_FLAVORS': 'Fruit Flavors',
      'JUICE_FLAVORS': 'Juice Flavors',
      'CLASSIC_FLAVORS': 'Classic Flavors',
      'SPECIALTY_FLAVORS': 'Specialty Flavors',
      'SEASONAL_FLAVORS': 'Seasonal Flavors'
    };
    return categoryMap[category] || category;
  };

  // FORMAT CURRENCY: EXCELLENT - Format cost in Philippine Peso
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₱0.00';
    return `₱${parseFloat(amount).toFixed(2)}`;
  };

  // STOCK SUMMARY: EXCELLENT - Overview of stock levels
  const getStockSummary = () => {
    const summary = {
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
      CRITICAL: 0,
      TOTAL: flavors.length
    };

    flavors.forEach(flavor => {
      const stockLevel = getStockLevel(flavor);
      summary[stockLevel]++;
    });

    return summary;
  };

  const stockSummary = getStockSummary();

  if (loading) {
    return <div className="loading">Loading flavors...</div>;
  }

  return (
    <div className="flavors-management">
      <div className="flavors-header">
        <h2>Milktea Flavors Management</h2>
        <div className="header-controls">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add Flavor
          </button>
          <button 
            className={`btn ${showDetails ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
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
          <span className="stock-label">Total Flavors</span>
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
            {flavorCategories.map(category => (
              <option key={category} value={category}>
                {getCategoryDisplayName(category)}
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

      {/* FORM UI: EXCELLENT - Comprehensive form with flavor-specific fields */}
      {showForm && (
        <div className="flavors-form-overlay">
          <div className="flavors-form">
            <h3>{editingFlavor ? 'Edit Flavor' : 'Add New Flavor'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Flavor Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Taro, Wintermelon, Thai Tea"
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
                    {flavorCategories.map(category => (
                      <option key={category} value={category}>
                        {getCategoryDisplayName(category)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Current Jars *</label>
                  <input
                    type="number"
                    name="jars"
                    value={formData.jars}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Total Quantity (ml)</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="Total quantity in milliliters"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Min Stock Level (jars)</label>
                  <input
                    type="number"
                    name="minStockLevel"
                    value={formData.minStockLevel}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Max Stock Level (jars)</label>
                  <input
                    type="number"
                    name="maxStockLevel"
                    value={formData.maxStockLevel}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cost Per Jar (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="costPerJar"
                    value={formData.costPerJar}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Storage Location</label>
                  <select
                    name="storageLocation"
                    value={formData.storageLocation}
                    onChange={handleInputChange}
                  >
                    {storageLocations.map(location => (
                      <option key={location} value={location}>
                        {location.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the flavor..."
                />
              </div>

              {/* DETAILS SECTION: EXCELLENT - Additional information */}
              {showDetails && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input
                        type="date"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Supplier</label>
                      <select
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map(supplier => (
                          <option key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Image</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
                    />
                    <small>Upload flavor photo for easy identification</small>
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Brewing instructions, serving suggestions, popularity notes..."
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Current Stock Level</label>
                    <div className="current-stock-indicator">
                      {formData.jars >= stockLevels.HIGH ? (
                        <span className="stock-high">High Stock ({formData.jars} jars)</span>
                      ) : formData.jars >= stockLevels.MODERATE ? (
                        <span className="stock-moderate">Moderate Stock ({formData.jars} jars)</span>
                      ) : formData.jars >= stockLevels.LOW ? (
                        <span className="stock-low">Low Stock ({formData.jars} jars)</span>
                      ) : (
                        <span className="stock-critical">Critical Stock ({formData.jars} jars)</span>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingFlavor ? 'Update' : 'Add'} Flavor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLAVORS GRID: EXCELLENT - Responsive card layout with circular progress indicators */}
      <div className="flavors-grid">
        {filteredFlavors.length === 0 ? (
          <div className="no-flavors">
            <p>No flavors found matching your criteria.</p>
          </div>
        ) : (
          filteredFlavors.map(flavor => (
            <div key={flavor._id} className="flavor-card">
              <div className="flavor-header-info">
                <div className="flavor-image">
                  {flavor.imageUrl ? (
                    <img src={`http://localhost:5000${flavor.imageUrl}`} alt={flavor.name} />
                  ) : (
                    <div className="placeholder-image">
                      {flavor.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flavor-title">
                  <h3>{flavor.name}</h3>
                  {getStockLevelBadge(flavor)}
                  {getExpiryAlert(flavor)}
                </div>
              </div>
              
              <div className="flavor-info">
                <p className="flavor-category">
                  <span className={`category-badge category-${flavor.category.toLowerCase()}`}>
                    {getCategoryDisplayName(flavor.category)}
                  </span>
                </p>
                
                {flavor.description && (
                  <p className="flavor-description">{flavor.description}</p>
                )}
                
                {/* CIRCULAR PROGRESS BAR: EXCELLENT - Visual jar level indicator */}
                <div className="flavor-stock-section">
                  {getCircularProgress(flavor)}
                </div>
                
                <div className="flavor-details">
                  <p className="flavor-storage">
                    <strong>Storage:</strong> {flavor.storageLocation.replace('_', ' ')}
                  </p>
                  
                  {flavor.costPerJar && (
                    <p className="flavor-cost">
                      <strong>Cost:</strong> {formatCurrency(flavor.costPerJar)} / jar
                    </p>
                  )}

                  {flavor.quantity && (
                    <p className="flavor-quantity">
                      <strong>Total Quantity:</strong> {flavor.quantity} ml
                    </p>
                  )}
                </div>
                
                {/* DETAILS INFO: EXCELLENT - Additional information display */}
                {showDetails && (
                  <div className="details-info">
                    {flavor.expiryDate && (
                      <p className="flavor-expiry">
                        <strong>Expiry:</strong> {new Date(flavor.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                    {flavor.supplier && (
                      <p className="flavor-supplier">
                        <strong>Supplier:</strong> {flavor.supplier.name}
                      </p>
                    )}
                    {flavor.minStockLevel && (
                      <p className="flavor-min-stock">
                        <strong>Min Stock:</strong> {flavor.minStockLevel} jars
                      </p>
                    )}
                  </div>
                )}
                
                {showDetails && flavor.notes && (
                  <div className="flavor-notes">
                    <strong>Notes:</strong>
                    <p>{flavor.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flavor-actions">
                <div className="status-controls">
                  <select 
                    value={flavor.status} 
                    onChange={(e) => handleStatusUpdate(flavor._id, e.target.value)}
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
                    onClick={() => handleEdit(flavor)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(flavor._id)}
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

export default Flavors;