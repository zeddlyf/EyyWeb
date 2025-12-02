import React, { useState } from 'react';
import api from './API'; 
import AddressForm from './AddressForm';

function AdminRegister({ onRegistered, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'admin',
    address: {
      street: '',
      barangay: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Philippines'
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await api.registerAdmin(formData);
      setSuccess('Admin account created successfully! The admin can now login with their credentials.');
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'admin',
        address: {
          street: '',
          city: '',
          province: '',
          postalCode: '',
          country: 'Philippines'
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 24, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <h2 style={{ marginBottom: 16 }}>Register Admin</h2>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: '14px' }}>
        Create a new admin account. Admin accounts have full access to the system.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>First Name *</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Middle Name</label>
          <input
            type="text"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Password *</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Phone Number *</label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            placeholder="+639123456789"
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <h3 style={{ marginTop: 24, marginBottom: 12 }}>Address</h3>
        
        <AddressForm
          value={formData.address}
          onChange={(addr) => setFormData(prev => ({ ...prev, address: { ...prev.address, ...addr } }))}
        />

        {error && (
          <div style={{ color: '#b91c1c', marginBottom: 12, padding: 8, backgroundColor: '#fef2f2', borderRadius: 4 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ color: '#059669', marginBottom: 12, padding: 8, backgroundColor: '#f0fdf4', borderRadius: 4 }}>
            {success}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%', padding: 10, background: '#111827', color: '#fff', borderRadius: 4, marginBottom: 12 }}
        >
          {isLoading ? 'Creating Admin Account...' : 'Create Admin Account'}
        </button>

        <button 
          type="button" 
          onClick={onSwitchToLogin}
          style={{ width: '100%', padding: 10, background: 'transparent', color: '#111827', border: '1px solid #d1d5db', borderRadius: 4 }}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}

export default AdminRegister;
