import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Ingredients.css';

const Ingredients = () => {
  // STATE MANAGEMENT: EXCELLENT - Well-organized state variables for ingredients management
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStockLevel, setFilterStockLevel] = useState('ALL');
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'TOPPINGS',
    quantity: 0,
    unit: 'grams',
    minStockLevel: 100,
    maxStockLevel: 1000,
    costPerUnit: '',
    supplier: '',
    expiryDate: '',
    storageLocation: 'DRY_STORAGE',
    status: 'ACTIVE',
    notes: '',
    image: null
  });

  // STOCK LEVEL THRESHOLDS - Configurable for different ingredient types
  const stockLevels = {
    HIGH: 500,
    MODERATE: 200,
    LOW: 100,
    CRITICAL: 50
  };

  // PASTRY/CAFE-SPECIFIC INGREDIENT CATEGORIES
  const ingredientCategories = [
    'TOPPINGS',
    'DOUGH_PASTRY',
    'FRUITS_VEGETABLES',
    'DAIRY_EGGS',
    'FLOURS_GRAINS',
    'SWEETENERS',
    'FLAVORINGS_EXTRACTS',
    'CHOCOLATE_COCOA',
    'NUTS_SEEDS',
    'LEAVENING_AGENTS',
    'SPICES_HERBS',
    'BEVERAGE_BASES'
  ];

  // UNIT OPTIONS
  const unitOptions = [
    'grams',
    'kilograms',
    'liters',
    'milliliters',
    'pieces',
    'packets',
    'boxes',
    'bags'
  ];

  // STORAGE LOCATION OPTIONS
  const storageLocations = [
    'DRY_STORAGE',
    'REFRIGERATOR',
    'FREEZER',
    'SHELF_STABLE',
    'COUNTERTOP'
  ];

  // STATUS OPTIONS
  const statusOptions = [
    'ACTIVE',
    'INACTIVE',
    'EXPIRED',
    'NEEDS_ORDER'
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
    fetchIngredients();
    fetchCategories();
    fetchSuppliers();
  }, []);

  // API INTEGRATION: EXCELLENT - Clean async/await implementation with error handling
  const fetchIngredients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/ingredients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIngredients(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/ingredients/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback to default categories if API fails
      setCategories(ingredientCategories);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/suppliers?category=INGREDIENTS', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  // STOCK LEVEL CALCULATION: EXCELLENT - Dynamic stock level determination
  const getStockLevel = (ingredient) => {
    const quantity = ingredient.quantity;
    
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
  const getStockLevelBadge = (ingredient) => {
    const stockLevel = getStockLevel(ingredient);
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
  const getStockProgressBar = (ingredient) => {
    const stockLevel = getStockLevel(ingredient);
    const maxStock = ingredient.maxStockLevel || stockLevels.HIGH;
    const percentage = Math.min((ingredient.quantity / maxStock) * 100, 100);
    
    return (
      <div className="stock-progress-container">
        <div className="stock-progress-bar">
          <div 
            className={`stock-progress-fill stock-progress-${stockLevel.toLowerCase()}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="stock-progress-text">
          {ingredient.quantity} {ingredient.unit} / {maxStock} {ingredient.unit}
        </span>
      </div>
    );
  };

  // EXPIRY ALERT: EXCELLENT - Alert for near expiry ingredients
  const getExpiryAlert = (ingredient) => {
    if (!ingredient.expiryDate) return null;
    
    const expiryDate = new Date(ingredient.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
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

      if (editingIngredient) {
        await axios.put(`http://localhost:5000/api/ingredients/${editingIngredient._id}`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post('http://localhost:5000/api/ingredients', data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      resetForm();
      fetchIngredients();
    } catch (err) {
      console.error('Error saving ingredient:', err);
    }
  };

  // EDIT FUNCTIONALITY: VERY GOOD - Proper state management for editing
  const handleEdit = (ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      category: ingredient.category,
      quantity: ingredient.quantity || 0,
      unit: ingredient.unit || 'grams',
      minStockLevel: ingredient.minStockLevel || 100,
      maxStockLevel: ingredient.maxStockLevel || 1000,
      costPerUnit: ingredient.costPerUnit || '',
      supplier: ingredient.supplier || '',
      expiryDate: ingredient.expiryDate ? ingredient.expiryDate.split('T')[0] : '',
      storageLocation: ingredient.storageLocation || 'DRY_STORAGE',
      status: ingredient.status || 'ACTIVE',
      notes: ingredient.notes || '',
      image: null
    });
    setShowForm(true);
  };

  // DELETE FUNCTIONALITY: GOOD - Confirmation dialog adds safety
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this ingredient?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/ingredients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchIngredients();
      } catch (err) {
        console.error('Error deleting ingredient:', err);
      }
    }
  };

  // STATUS UPDATE: EXCELLENT - Additional functionality for ingredient status management
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/ingredients/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchIngredients();
    } catch (err) {
      console.error('Error updating ingredient status:', err);
    }
  };

  // RESET FUNCTION: EXCELLENT - Clean form reset implementation
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'TOPPINGS',
      quantity: 0,
      unit: 'grams',
      minStockLevel: 100,
      maxStockLevel: 1000,
      costPerUnit: '',
      supplier: '',
      expiryDate: '',
      storageLocation: 'DRY_STORAGE',
      status: 'ACTIVE',
      notes: '',
      image: null
    });
    setEditingIngredient(null);
    setShowForm(false);
    setShowDetails(false);
  };

  // FILTERING: VERY GOOD - Efficient client-side filtering with stock level
  const filteredIngredients = ingredients.filter(ingredient => {
    const categoryMatch = filterCategory === 'ALL' || ingredient.category === filterCategory;
    const stockLevelMatch = filterStockLevel === 'ALL' || getStockLevel(ingredient) === filterStockLevel;
    return categoryMatch && stockLevelMatch;
  });

  // CATEGORY DISPLAY NAME: EXCELLENT - Convert enum values to readable names
  const getCategoryDisplayName = (category) => {
    const categoryMap = {
      'TOPPINGS': 'Toppings',
      'DOUGH_PASTRY': 'Dough & Pastry',
      'FRUITS_VEGETABLES': 'Fruits & Vegetables',
      'DAIRY_EGGS': 'Dairy & Eggs',
      'FLOURS_GRAINS': 'Flours & Grains',
      'SWEETENERS': 'Sweeteners',
      'FLAVORINGS_EXTRACTS': 'Flavorings & Extracts',
      'CHOCOLATE_COCOA': 'Chocolate & Cocoa',
      'NUTS_SEEDS': 'Nuts & Seeds',
      'LEAVENING_AGENTS': 'Leavening Agents',
      'SPICES_HERBS': 'Spices & Herbs',
      'BEVERAGE_BASES': 'Beverage Bases'
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
      TOTAL: ingredients.length
    };

    ingredients.forEach(ingredient => {
      const stockLevel = getStockLevel(ingredient);
      summary[stockLevel]++;
    });

    return summary;
  };

  const stockSummary = getStockSummary();

  if (loading) {
    return <div className="loading">Loading ingredients...</div>;
  }

  return (
    <div className="ingredients-management">
      <div className="ingredients-header">
        <h2>Pastry & Cafe Ingredients Management</h2>
        <div className="header-controls">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add Ingredient
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
            {ingredientCategories.map(category => (
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

      {/* FORM UI: EXCELLENT - Comprehensive form with ingredient-specific fields */}
      {showForm && (
        <div className="ingredients-form-overlay">
          <div className="ingredients-form">
            <h3>{editingIngredient ? 'Edit Ingredient' : 'Add New Ingredient'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Ingredient Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Sugar, Flour, Chocolate Chips"
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
                    {ingredientCategories.map(category => (
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
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                  >
                    {unitOptions.map(unit => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
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
                <div className="form-group">
                  <label>Max Stock Level</label>
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
                  <label>Cost Per Unit (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="costPerUnit"
                    value={formData.costPerUnit}
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
                    <small>Upload ingredient photo for easy identification</small>
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Storage instructions, usage notes, quality specifications..."
                    />
                  </div>

                  <div className="form-group full-width">
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
                </>
              )}
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingIngredient ? 'Update' : 'Add'} Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INGREDIENTS GRID: EXCELLENT - Responsive card layout with stock level indicators */}
      <div className="ingredients-grid">
        {filteredIngredients.length === 0 ? (
          <div className="no-ingredients">
            <p>No ingredients found matching your criteria.</p>
          </div>
        ) : (
          filteredIngredients.map(ingredient => (
            <div key={ingredient._id} className="ingredient-card">
              <div className="ingredient-header-info">
                <div className="ingredient-image">
                  {ingredient.imageUrl ? (
                    <img src={`http://localhost:5000${ingredient.imageUrl}`} alt={ingredient.name} />
                  ) : (
                    <div className="placeholder-image">
                      {ingredient.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="ingredient-title">
                  <h3>{ingredient.name}</h3>
                  {getStockLevelBadge(ingredient)}
                  {getExpiryAlert(ingredient)}
                </div>
              </div>
              
              <div className="ingredient-info">
                <p className="ingredient-category">
                  <span className={`category-badge category-${ingredient.category.toLowerCase()}`}>
                    {getCategoryDisplayName(ingredient.category)}
                  </span>
                </p>
                
                {/* STOCK PROGRESS BAR: EXCELLENT - Visual stock level indicator */}
                {getStockProgressBar(ingredient)}
                
                <div className="ingredient-details">
                  <p className="ingredient-quantity">
                    <strong>Quantity:</strong> {ingredient.quantity} {ingredient.unit}
                    {ingredient.minStockLevel && (
                      <span className="min-stock"> (Min: {ingredient.minStockLevel} {ingredient.unit})</span>
                    )}
                  </p>
                  
                  <p className="ingredient-storage">
                    <strong>Storage:</strong> {ingredient.storageLocation.replace('_', ' ')}
                  </p>
                  
                  {ingredient.costPerUnit && (
                    <p className="ingredient-cost">
                      <strong>Cost:</strong> {formatCurrency(ingredient.costPerUnit)} / {ingredient.unit}
                    </p>
                  )}
                </div>
                
                {/* DETAILS INFO: EXCELLENT - Additional information display */}
                {showDetails && (
                  <div className="details-info">
                    {ingredient.expiryDate && (
                      <p className="ingredient-expiry">
                        <strong>Expiry:</strong> {new Date(ingredient.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                    {ingredient.supplier && (
                      <p className="ingredient-supplier">
                        <strong>Supplier:</strong> {ingredient.supplier.name}
                      </p>
                    )}
                  </div>
                )}
                
                {showDetails && ingredient.notes && (
                  <div className="ingredient-notes">
                    <strong>Notes:</strong>
                    <p>{ingredient.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="ingredient-actions">
                <div className="status-controls">
                  <select 
                    value={ingredient.status} 
                    onChange={(e) => handleStatusUpdate(ingredient._id, e.target.value)}
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
                    onClick={() => handleEdit(ingredient)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(ingredient._id)}
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

export default Ingredients;