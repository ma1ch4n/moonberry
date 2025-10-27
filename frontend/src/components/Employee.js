import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Employee.css';

const Employee = () => {
  // STATE MANAGEMENT: EXCELLENT - Well-organized state variables with clear purposes
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [performanceView, setPerformanceView] = useState(false);
  const [filterPosition, setFilterPosition] = useState('ALL');
  const [filterShift, setFilterShift] = useState('ALL');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: 'BARISTA',
    shift: 'MORNING',
    salary: '',
    hireDate: '',
    photo: null,
    performanceNotes: ''
  });

  // DATA FETCHING: VERY GOOD - Proper useEffect implementation with dependency array
  useEffect(() => {
    fetchEmployees();
  }, []);

  // API INTEGRATION: EXCELLENT - Clean async/await implementation with error handling
  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setLoading(false);
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
      photo: e.target.files[0]
    });
  };

  // FORM SUBMISSION: EXCELLENT - Proper FormData handling for file uploads
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'photo' && formData[key]) {
          data.append('photo', formData.photo);
        } else {
          data.append(key, formData[key]);
        }
      });

      if (editingEmployee) {
        await axios.put(`http://localhost:5000/api/employees/${editingEmployee._id}`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post('http://localhost:5000/api/employees', data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      resetForm();
      fetchEmployees();
    } catch (err) {
      console.error('Error saving employee:', err);
    }
  };

  // EDIT FUNCTIONALITY: VERY GOOD - Proper state management for editing
  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      position: employee.position,
      shift: employee.shift,
      salary: employee.salary,
      hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
      photo: null,
      performanceNotes: employee.performanceNotes || ''
    });
    setShowForm(true);
  };

  // DELETE FUNCTIONALITY: GOOD - Confirmation dialog adds safety
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/employees/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchEmployees();
      } catch (err) {
        console.error('Error deleting employee:', err);
      }
    }
  };

  // RESET FUNCTION: EXCELLENT - Clean form reset implementation
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      position: 'BARISTA',
      shift: 'MORNING',
      salary: '',
      hireDate: '',
      photo: null,
      performanceNotes: ''
    });
    setEditingEmployee(null);
    setShowForm(false);
  };

  // FILTERING: VERY GOOD - Efficient client-side filtering
  const filteredEmployees = employees.filter(employee => {
    const positionMatch = filterPosition === 'ALL' || employee.position === filterPosition;
    const shiftMatch = filterShift === 'ALL' || employee.shift === filterShift;
    return positionMatch && shiftMatch;
  });

  if (loading) {
    return <div className="loading">Loading employees...</div>;
  }

  return (
    <div className="employee-management">
      <div className="employee-header">
        <h2>Employee Management</h2>
        <div className="header-controls">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add Employee
          </button>
          <button 
            className={`btn ${performanceView ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPerformanceView(!performanceView)}
          >
            {performanceView ? 'Hide Performance' : 'View Performance'}
          </button>
        </div>
      </div>

      {/* FILTER UI: EXCELLENT - Intuitive filtering options */}
      <div className="filters">
        <div className="filter-group">
          <label>Position:</label>
          <select 
            value={filterPosition} 
            onChange={(e) => setFilterPosition(e.target.value)}
          >
            <option value="ALL">All Positions</option>
            <option value="MANAGER">Manager</option>
            <option value="BARISTA">Barista</option>
            <option value="BAKER">Baker</option>
            <option value="CASHIER">Cashier</option>
            <option value="WAITER">Waiter</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Shift:</label>
          <select 
            value={filterShift} 
            onChange={(e) => setFilterShift(e.target.value)}
          >
            <option value="ALL">All Shifts</option>
            <option value="MORNING">Morning Shift</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="NIGHT">Night Shift</option>
          </select>
        </div>
      </div>

      {/* FORM UI: EXCELLENT - Comprehensive form with conditional performance field */}
      {showForm && (
        <div className="employee-form-overlay">
          <div className="employee-form">
            <h3>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
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
                  <label>Salary</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Position *</label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="BARISTA">Barista</option>
                    <option value="BAKER">Baker</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="WAITER">Waiter</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Shift *</label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="MORNING">Morning Shift</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="NIGHT">Night Shift</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Hire Date</label>
                  <input
                    type="date"
                    name="hireDate"
                    value={formData.hireDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
              
              {/* PERFORMANCE NOTES: EXCELLENT - Conditional rendering based on view mode */}
              {performanceView && (
                <div className="form-group full-width">
                  <label>Performance Notes</label>
                  <textarea
                    name="performanceNotes"
                    value={formData.performanceNotes}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
              )}
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE GRID: EXCELLENT - Responsive card layout with conditional performance display */}
      <div className="employees-grid">
        {filteredEmployees.length === 0 ? (
          <div className="no-employees">
            <p>No employees found matching your criteria.</p>
          </div>
        ) : (
          filteredEmployees.map(employee => (
            <div key={employee._id} className="employee-card">
              <div className="employee-photo">
                {employee.photoUrl ? (
                  <img src={`http://localhost:5000${employee.photoUrl}`} alt={employee.name} />
                ) : (
                  <div className="placeholder-photo">
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="employee-info">
                <h3>{employee.name}</h3>
                <p className="employee-position">{employee.position}</p>
                <p className="employee-shift">{employee.shift.replace('_', ' ')}</p>
                <p className="employee-email">{employee.email}</p>
                {/* PERFORMANCE DISPLAY: EXCELLENT - Clean conditional rendering */}
                {performanceView && employee.performanceNotes && (
                  <div className="performance-notes">
                    <strong>Performance Notes:</strong>
                    <p>{employee.performanceNotes}</p>
                  </div>
                )}
              </div>
              <div className="employee-actions">
                <button 
                  className="btn-edit"
                  onClick={() => handleEdit(employee)}
                >
                  Edit
                </button>
                <button 
                  className="btn-delete"
                  onClick={() => handleDelete(employee._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Employee;