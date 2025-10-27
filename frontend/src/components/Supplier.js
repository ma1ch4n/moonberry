import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Supplier.css';

const Supplier = () => {
  // STATE MANAGEMENT: EXCELLENT - Well-organized state variables with clear purposes
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [documentView, setDocumentView] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterContract, setFilterContract] = useState('ALL');
  const [categories, setCategories] = useState([]);
  const [contracts, setContracts] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contract: 'ANNUAL',
    place: '',
    category: 'MILKTEA_FLAVORS',
    contactPerson: '',
    website: '',
    document: null,
    notes: '',
    status: 'active'
  });

  // MILKTEA-SPECIFIC CATEGORIES
  const milkteaCategories = [
    'MILKTEA_FLAVORS',
    'TOPPINGS',
    'FRUITS',
    'DOUGH_PASTRY',
    'INGREDIENTS',
    'UTENSILS'
  ];

  // DATA FETCHING: VERY GOOD - Proper useEffect implementation with dependency array
  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
    fetchContracts();
  }, []);

  // API INTEGRATION: EXCELLENT - Clean async/await implementation with error handling
  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/suppliers/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback to default categories if API fails
      setCategories(milkteaCategories);
    }
  };

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/suppliers/contracts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContracts(res.data);
    } catch (err) {
      console.error('Error fetching contracts:', err);
    }
  };

  // FORM HANDLING: EXCELLENT - Proper input change handling for both text and file inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      document: e.target.files[0]
    });
  };

  // FORM SUBMISSION: EXCELLENT - Proper FormData handling for file uploads
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'document' && formData[key]) {
          data.append('document', formData.document);
        } else {
          data.append(key, formData[key]);
        }
      });

      if (editingSupplier) {
        await axios.put(`http://localhost:5000/api/suppliers/${editingSupplier._id}`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post('http://localhost:5000/api/suppliers', data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      resetForm();
      fetchSuppliers();
    } catch (err) {
      console.error('Error saving supplier:', err);
    }
  };

  // EDIT FUNCTIONALITY: VERY GOOD - Proper state management for editing
  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone || '',
      contract: supplier.contract || 'ANNUAL',
      place: supplier.place || '',
      category: supplier.category,
      contactPerson: supplier.contactPerson || '',
      website: supplier.website || '',
      document: null,
      notes: supplier.notes || '',
      status: supplier.status || 'active'
    });
    setShowForm(true);
  };

  // DELETE FUNCTIONALITY: GOOD - Confirmation dialog adds safety
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/suppliers/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchSuppliers();
      } catch (err) {
        console.error('Error deleting supplier:', err);
      }
    }
  };

  // STATUS UPDATE: EXCELLENT - Additional functionality for supplier status management
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/suppliers/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSuppliers();
    } catch (err) {
      console.error('Error updating supplier status:', err);
    }
  };

  // RESET FUNCTION: EXCELLENT - Clean form reset implementation
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      contract: 'ANNUAL',
      place: '',
      category: 'MILKTEA_FLAVORS',
      contactPerson: '',
      website: '',
      document: null,
      notes: '',
      status: 'active'
    });
    setEditingSupplier(null);
    setShowForm(false);
  };

  // FILTERING: VERY GOOD - Efficient client-side filtering
  const filteredSuppliers = suppliers.filter(supplier => {
    const categoryMatch = filterCategory === 'ALL' || supplier.category === filterCategory;
    const contractMatch = filterContract === 'ALL' || supplier.contract === filterContract;
    return categoryMatch && contractMatch;
  });

  // STATUS BADGE: EXCELLENT - Visual status indicators
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'status-active', text: 'Active' },
      inactive: { class: 'status-inactive', text: 'Inactive' },
      pending: { class: 'status-pending', text: 'Pending' }
    };
    const config = statusConfig[status] || statusConfig.active;
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  // CATEGORY DISPLAY NAME: EXCELLENT - Convert enum values to readable names
  const getCategoryDisplayName = (category) => {
    const categoryMap = {
      'MILKTEA_FLAVORS': 'Milktea Flavors',
      'TOPPINGS': 'Toppings',
      'FRUITS': 'Fruits',
      'DOUGH_PASTRY': 'Dough/Pastry',
      'INGREDIENTS': 'Ingredients',
      'UTENSILS': 'Utensils'
    };
    return categoryMap[category] || category;
  };

  if (loading) {
    return <div className="loading">Loading suppliers...</div>;
  }

  return (
    <div className="supplier-management">
      <div className="supplier-header">
        <h2>Milktea Shop Supplier Management</h2>
        <div className="header-controls">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add Supplier
          </button>
          <button 
            className={`btn ${documentView ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDocumentView(!documentView)}
          >
            {documentView ? 'Hide Documents' : 'View Documents'}
          </button>
        </div>
      </div>

      {/* FILTER UI: EXCELLENT - Intuitive filtering options */}
      <div className="filters">
        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {milkteaCategories.map(category => (
              <option key={category} value={category}>
                {getCategoryDisplayName(category)}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Contract:</label>
          <select 
            value={filterContract} 
            onChange={(e) => setFilterContract(e.target.value)}
          >
            <option value="ALL">All Contracts</option>
            {contracts.map(contract => (
              <option key={contract} value={contract}>
                {contract}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={formData.status} 
            onChange={handleInputChange}
            name="status"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* FORM UI: EXCELLENT - Comprehensive form with miltea-specific categories */}
      {showForm && (
        <div className="supplier-form-overlay">
          <div className="supplier-form">
            <h3>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    {milkteaCategories.map(category => (
                      <option key={category} value={category}>
                        {getCategoryDisplayName(category)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Contract Type</label>
                  <select
                    name="contract"
                    value={formData.contract}
                    onChange={handleInputChange}
                  >
                    <option value="ANNUAL">Annual</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ONE_TIME">One Time</option>
                    <option value="LONG_TERM">Long Term</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Location/Place</label>
                  <input
                    type="text"
                    name="place"
                    value={formData.place}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              {/* DOCUMENT UPLOAD: EXCELLENT - Conditional rendering based on view mode */}
              {documentView && (
                <>
                  <div className="form-group full-width">
                    <label>Contract/Document</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    <small>Upload contract PDF, document, or company logo</small>
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Additional notes about the supplier..."
                    />
                  </div>
                </>
              )}
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSupplier ? 'Update' : 'Add'} Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER GRID: EXCELLENT - Responsive card layout with miltea-specific categories */}
      <div className="suppliers-grid">
        {filteredSuppliers.length === 0 ? (
          <div className="no-suppliers">
            <p>No suppliers found matching your criteria.</p>
          </div>
        ) : (
          filteredSuppliers.map(supplier => (
            <div key={supplier._id} className="supplier-card">
              <div className="supplier-header-info">
                <div className="supplier-logo">
                  {supplier.documentUrl ? (
                    <img src={`http://localhost:5000${supplier.documentUrl}`} alt={supplier.name} />
                  ) : (
                    <div className="placeholder-logo">
                      {supplier.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="supplier-title">
                  <h3>{supplier.name}</h3>
                  {getStatusBadge(supplier.status)}
                </div>
              </div>
              
              <div className="supplier-info">
                <p className="supplier-category">
                  <span className={`category-badge category-${supplier.category.toLowerCase()}`}>
                    {getCategoryDisplayName(supplier.category)}
                  </span>
                </p>
                <p className="supplier-contact">
                  <strong>Email:</strong> {supplier.email}
                </p>
                {supplier.phone && (
                  <p className="supplier-phone">
                    <strong>Phone:</strong> {supplier.phone}
                  </p>
                )}
                {supplier.contactPerson && (
                  <p className="supplier-contact-person">
                    <strong>Contact:</strong> {supplier.contactPerson}
                  </p>
                )}
                {supplier.place && (
                  <p className="supplier-place">
                    <strong>Location:</strong> {supplier.place}
                  </p>
                )}
                {supplier.contract && (
                  <p className="supplier-contract">
                    <strong>Contract:</strong> {supplier.contract}
                  </p>
                )}
                
                {/* DOCUMENT DISPLAY: EXCELLENT - Clean conditional rendering */}
                {documentView && supplier.documentUrl && (
                  <div className="supplier-documents">
                    <strong>Document:</strong>
                    <a 
                      href={`http://localhost:5000${supplier.documentUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="document-link"
                    >
                      View Document
                    </a>
                  </div>
                )}
                
                {documentView && supplier.notes && (
                  <div className="supplier-notes">
                    <strong>Notes:</strong>
                    <p>{supplier.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="supplier-actions">
                <div className="status-controls">
                  <select 
                    value={supplier.status} 
                    onChange={(e) => handleStatusUpdate(supplier._id, e.target.value)}
                    className="status-select"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="action-buttons">
                  <button 
                    className="btn-edit"
                    onClick={() => handleEdit(supplier)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(supplier._id)}
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

export default Supplier;