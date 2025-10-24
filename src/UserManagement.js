import React, { useState, useEffect } from 'react';
import api from './API';

function UserManagement({ user, onLogout, onNavigateToDashboard, onNavigateToAnalytics }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all, driver, commuter
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, approved, rejected
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingDriversCount, setPendingDriversCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'commuter',
    licenseNumber: '',
    address: {
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Philippines'
    }
  });
  const [dropdownOpen, setDropdownOpen] = useState(null); // Track which dropdown is open

  // Fetch all users from the backend
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Fetching users...');
      console.log('Current user:', user);
      
      // Check if user has admin role
      if (user.role !== 'admin') {
        setError('Access denied. Admin role required to manage users.');
        setUsers([]);
        return;
      }
      
      // Try to fetch all users
      const allUsers = await api.getAllUsers();
      console.log('Fetched users:', allUsers);
      
      // Filter out admin users (extra safety)
      const nonAdminUsers = allUsers.filter(user => user.role !== 'admin');
      setUsers(nonAdminUsers);
      
      // Count pending drivers
      const pendingCount = nonAdminUsers.filter(user => 
        user.role === 'driver' && user.approvalStatus === 'pending'
      ).length;
      setPendingDriversCount(pendingCount);
      
    } catch (err) {
      console.error('Error fetching users:', err);
      
      // If getAllUsers fails, try to fetch users by role and combine them
      try {
        console.log('Trying fallback method...');
        const [drivers, commuters] = await Promise.all([
          api.getUsersByRole('driver').catch(() => []),
          api.getUsersByRole('commuter').catch(() => [])
        ]);
        
        const combinedUsers = [...drivers, ...commuters];
        console.log('Fallback users:', combinedUsers);
        // Filter out admin users from fallback data too
        const nonAdminUsers = combinedUsers.filter(user => user.role !== 'admin');
        setUsers(nonAdminUsers);
        
        if (combinedUsers.length === 0) {
          setError('No users found. Please check your connection and try again.');
        }
      } catch (fallbackErr) {
        console.error('Fallback fetch also failed:', fallbackErr);
        setError(`Failed to load users: ${err.message}. Please check your connection and try again.`);
        setUsers([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    // Always exclude admin users (extra safety)
    filtered = filtered.filter(u => u.role !== 'admin');

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Filter by approval status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.approvalStatus === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.firstName.toLowerCase().includes(term) ||
        u.lastName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.phoneNumber.includes(term) ||
        (u.licenseNumber && u.licenseNumber.toLowerCase().includes(term))
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Handle user approval/rejection
  const handleUserAction = async (userId, action) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMessage('');
      
      await api.updateUserApprovalStatus(userId, action);
      
      // Refresh the users list to get updated data from the server
      await fetchUsers();
      
      setSuccessMessage(`Driver ${action} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setShowUserDetails(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Failed to update user approval status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle user activation/deactivation
  const handleUserToggle = async (userId, isActive) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMessage('');
      
      await api.updateUserStatus(userId, isActive);
      
      // Refresh the users list to get updated data from the server
      await fetchUsers();
      
      setSuccessMessage(`User ${isActive ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to update user status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle create new user
  const handleCreateUser = async () => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMessage('');
      
      await api.createUser(formData);
      
      // Refresh the users list
      await fetchUsers();
      
      // Reset form and close modal
      resetForm();
      setShowUserForm(false);
      
      setSuccessMessage('User created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to create user: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle update user
  const handleUpdateUser = async () => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMessage('');
      
      await api.updateUser(editingUser._id, formData);
      
      // Refresh the users list
      await fetchUsers();
      
      // Reset form and close modal
      resetForm();
      setShowUserForm(false);
      setEditingUser(null);
      
      setSuccessMessage('User updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to update user: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId, hardDelete = false) => {
    const message = hardDelete 
      ? 'Are you sure you want to PERMANENTLY delete this user? This action CANNOT be undone.'
      : 'Are you sure you want to deactivate this user? They will no longer be able to log in.';
      
    if (!window.confirm(message)) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMessage('');
      
      const response = await api.deleteUser(userId, hardDelete);
      console.log('Delete user response:', response);
      
      // Close user details modal if open
      if (showUserDetails && selectedUser && selectedUser._id === userId) {
        setShowUserDetails(false);
        setSelectedUser(null);
      }
      
      // Refresh the users list
      await fetchUsers();
      
      const successMsg = hardDelete ? 'User permanently deleted!' : 'User deactivated successfully!';
      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user: ' + (err.message || 'Unknown error occurred'));
    } finally {
      setActionLoading(false);
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      email: '',
      password: '',
      phoneNumber: '',
      role: 'commuter',
      licenseNumber: '',
      address: {
        street: '',
        city: '',
        province: '',
        postalCode: '',
        country: 'Philippines'
      }
    });
  };

  // Open form for creating new user
  const openCreateForm = () => {
    resetForm();
    setEditingUser(null);
    setShowUserForm(true);
  };

  // Open form for editing user
  const openEditForm = (user) => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      middleName: user.middleName || '',
      email: user.email || '',
      password: '', // Don't pre-fill password
      phoneNumber: user.phoneNumber || '',
      role: user.role || 'commuter',
      licenseNumber: user.licenseNumber || '',
      address: {
        street: user.address?.street || '',
        city: user.address?.city || '',
        province: user.address?.province || '',
        postalCode: user.address?.postalCode || '',
        country: user.address?.country || 'Philippines'
      }
    });
    setEditingUser(user);
    setShowUserForm(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: '#fbbf24', color: '#92400e' },
      approved: { background: '#10b981', color: '#065f46' },
      rejected: { background: '#ef4444', color: '#991b1b' }
    };
    
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        ...styles[status]
      }}>
        {status}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const styles = {
      driver: { background: '#3b82f6', color: 'white' },
      commuter: { background: '#8b5cf6', color: 'white' },
      admin: { background: '#f59e0b', color: 'white' }
    };
    
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'capitalize',
        ...styles[role]
      }}>
        {role}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <style>
        {`
          .dropdown-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .dropdown-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 3px;
          }
          .dropdown-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          .dropdown-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}
      </style>
      {/* Header */}
      <div style={{ 
        background: '#1f2937', 
        color: 'white', 
        padding: '16px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>👥 User Management</h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.8 }}>
            Manage commuters and drivers (excludes admin accounts)
            {user.role !== 'admin' && (
              <span style={{ 
                marginLeft: '12px', 
                background: '#ef4444', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                Admin Access Required
              </span>
            )}
            {user.role === 'admin' && pendingDriversCount > 0 && (
              <span style={{ 
                marginLeft: '12px', 
                background: '#fbbf24', 
                color: '#92400e', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {pendingDriversCount} pending driver{pendingDriversCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onNavigateToDashboard}
            style={{
              padding: '6px 12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🗺️ Map
          </button>
          <button
            onClick={onNavigateToAnalytics}
            style={{
              padding: '6px 12px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📊 Analytics
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: '6px 12px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {/* Admin Access Check */}
        {user.role !== 'admin' && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #fecaca',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>🚫 Access Denied</h3>
            <p style={{ margin: '0', fontSize: '16px' }}>
              You need admin privileges to access user management. 
              Please contact your administrator or login with an admin account.
            </p>
          </div>
        )}

        {/* Filters and Search - Only show for admin users */}
        {user.role === 'admin' && (
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            marginBottom: '24px'
          }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: '1', minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="all">All Roles</option>
              <option value="driver">Drivers</option>
              <option value="commuter">Commuters</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Quick Filter for Pending Drivers */}
            {pendingDriversCount > 0 && (
              <button
                onClick={() => {
                  setRoleFilter('driver');
                  setStatusFilter('pending');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#fbbf24',
                  color: '#92400e',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ⏳ Show Pending ({pendingDriversCount})
              </button>
            )}

            {/* Clear Filters Button */}
            {(roleFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🗑️ Clear Filters
              </button>
            )}

            {/* Create User Button */}
            <button
              onClick={openCreateForm}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ➕ Create User
            </button>

            {/* Test Connection Button */}
            <button
              onClick={async () => {
                try {
                  const result = await api.checkConnection();
                  if (result) {
                    setSuccessMessage('✅ Connection successful!');
                    setTimeout(() => setSuccessMessage(''), 3000);
                  } else {
                    setError('❌ Connection failed!');
                  }
                } catch (err) {
                  setError('❌ Connection test failed: ' + err.message);
                }
              }}
              style={{
                padding: '8px 16px',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔗 Test Connection
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? '⏳' : '🔄'} Refresh
            </button>
          </div>
        </div>
        )}

        {/* Success Message - Only show for admin users */}
        {user.role === 'admin' && successMessage && (
          <div style={{
            background: '#f0fdf4',
            color: '#166534',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            marginBottom: '16px'
          }}>
            ✅ {successMessage}
          </div>
        )}

        {/* Error Message - Only show for admin users */}
        {user.role === 'admin' && error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            marginBottom: '16px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Users Table - Only show for admin users */}
        {user.role === 'admin' && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {isLoading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px' 
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #3B82F6',
                  borderTop: '3px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px'
                }}></div>
                <div>Loading users...</div>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#6b7280'
            }}>
              No users found matching your criteria
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>User</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Role</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Contact</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Joined</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((userItem) => (
                    <tr key={userItem._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#1f2937' }}>
                            {userItem.firstName} {userItem.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {userItem.email}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getRoleBadge(userItem.role)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getStatusBadge(userItem.approvalStatus)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '14px', color: '#374151' }}>
                          📞 {userItem.phoneNumber}
                        </div>
                        {userItem.role === 'driver' && userItem.licenseNumber && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            🚗 {userItem.licenseNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                        {formatDate(userItem.createdAt)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div className="dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            onClick={() => setDropdownOpen(dropdownOpen === userItem._id ? null : userItem._id)}
                            style={{
                              padding: '6px 12px',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            Actions
                            <span style={{ fontSize: '10px' }}>
                              {dropdownOpen === userItem._id ? '▲' : '▼'}
                            </span>
                          </button>
                          
                          {dropdownOpen === userItem._id && (
                            <div className="dropdown-scroll" style={{
                              position: 'absolute',
                              top: '100%',
                              right: '0',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              zIndex: 1000,
                              minWidth: '160px',
                              maxWidth: '200px',
                              maxHeight: '300px',
                              marginTop: '4px',
                              overflowY: 'auto',
                              overflowX: 'hidden',
                              scrollbarWidth: 'thin',
                              scrollbarColor: '#cbd5e1 #f1f5f9'
                            }}>
                              <div style={{ padding: '4px 0' }}>
                                <button
                                  onClick={() => {
                                    setSelectedUser(userItem);
                                    setShowUserDetails(true);
                                    setDropdownOpen(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                                  onMouseLeave={(e) => e.target.style.background = 'none'}
                                >
                                  👁️ View Details
                                </button>
                                
                                <button
                                  onClick={() => {
                                    openEditForm(userItem);
                                    setDropdownOpen(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                                  onMouseLeave={(e) => e.target.style.background = 'none'}
                                >
                                  ✏️ Edit User
                                </button>
                                
                                {userItem.role === 'driver' && userItem.approvalStatus === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        handleUserAction(userItem._id, 'approved');
                                        setDropdownOpen(null);
                                      }}
                                      disabled={actionLoading}
                                      style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: 'none',
                                        border: 'none',
                                        textAlign: 'left',
                                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        color: '#10b981',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: actionLoading ? 0.6 : 1
                                      }}
                                      onMouseEnter={(e) => !actionLoading && (e.target.style.background = '#f0fdf4')}
                                      onMouseLeave={(e) => e.target.style.background = 'none'}
                                    >
                                      ✅ Approve Driver
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        handleUserAction(userItem._id, 'rejected');
                                        setDropdownOpen(null);
                                      }}
                                      disabled={actionLoading}
                                      style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: 'none',
                                        border: 'none',
                                        textAlign: 'left',
                                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: actionLoading ? 0.6 : 1
                                      }}
                                      onMouseEnter={(e) => !actionLoading && (e.target.style.background = '#fef2f2')}
                                      onMouseLeave={(e) => e.target.style.background = 'none'}
                                    >
                                      ❌ Reject Driver
                                    </button>
                                  </>
                                )}
                                
                                <button
                                  onClick={() => {
                                    handleUserToggle(userItem._id, !userItem.isActive);
                                    setDropdownOpen(null);
                                  }}
                                  disabled={actionLoading}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    color: userItem.isActive ? '#f59e0b' : '#10b981',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: actionLoading ? 0.6 : 1
                                  }}
                                  onMouseEnter={(e) => !actionLoading && (e.target.style.background = userItem.isActive ? '#fffbeb' : '#f0fdf4')}
                                  onMouseLeave={(e) => e.target.style.background = 'none'}
                                >
                                  {userItem.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                                </button>
                                
                                <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }}></div>
                                
                                <button
                                  onClick={() => {
                                    handleDeleteUser(userItem._id, false);
                                    setDropdownOpen(null);
                                  }}
                                  disabled={actionLoading}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    color: '#f59e0b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: actionLoading ? 0.6 : 1
                                  }}
                                  onMouseEnter={(e) => !actionLoading && (e.target.style.background = '#fffbeb')}
                                  onMouseLeave={(e) => e.target.style.background = 'none'}
                                >
                                  🚫 Deactivate User
                                </button>
                                
                                <button
                                  onClick={() => {
                                    handleDeleteUser(userItem._id, true);
                                    setDropdownOpen(null);
                                  }}
                                  disabled={actionLoading}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    color: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: actionLoading ? 0.6 : 1
                                  }}
                                  onMouseEnter={(e) => !actionLoading && (e.target.style.background = '#fef2f2')}
                                  onMouseLeave={(e) => e.target.style.background = 'none'}
                                >
                                  🗑️ Permanently Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* User Details Modal - Only show for admin users */}
        {user.role === 'admin' && showUserDetails && selectedUser && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#1f2937' }}>
                  User Details
                </h3>
                <button
                  onClick={() => {
                    setShowUserDetails(false);
                    setSelectedUser(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>First Name</label>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                      {selectedUser.firstName}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Last Name</label>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                      {selectedUser.lastName}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Email</label>
                  <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                    {selectedUser.email}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                      {selectedUser.phoneNumber}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Role</label>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                      {getRoleBadge(selectedUser.role)}
                    </div>
                  </div>
                </div>

                {selectedUser.role === 'driver' && selectedUser.licenseNumber && (
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>License Number</label>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                      {selectedUser.licenseNumber}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Address</label>
                  <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                    {selectedUser.address?.fullAddress || 'No address provided'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Status</label>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                      {getStatusBadge(selectedUser.approvalStatus)}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Active</label>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                      {selectedUser.isActive ? '✅ Yes' : '❌ No'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Rating</label>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                      ⭐ {selectedUser.rating?.toFixed(1) || 'No rating'}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>Joined Date</label>
                  <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                    {formatDate(selectedUser.createdAt)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => openEditForm(selectedUser)}
                  style={{
                    padding: '8px 16px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✏️ Edit User
                </button>
                
                <button
                  onClick={() => handleUserToggle(selectedUser._id, !selectedUser.isActive)}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 16px',
                    background: selectedUser.isActive ? '#f59e0b' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  {selectedUser.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                </button>
                
                {selectedUser.role === 'driver' && selectedUser.approvalStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUserAction(selectedUser._id, 'rejected')}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 16px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        opacity: actionLoading ? 0.6 : 1
                      }}
                    >
                      ❌ Reject
                    </button>
                    <button
                      onClick={() => handleUserAction(selectedUser._id, 'approved')}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        opacity: actionLoading ? 0.6 : 1
                      }}
                    >
                      ✅ Approve
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => handleDeleteUser(selectedUser._id, false)}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 16px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: actionLoading ? 0.6 : 1,
                    marginRight: '8px'
                  }}
                >
                  🚫 Deactivate
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser._id, true)}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 16px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  🗑️ Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Form Modal - Only show for admin users */}
        {user.role === 'admin' && showUserForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#1f2937' }}>
                  {editingUser ? 'Edit User' : 'Create New User'}
                </h3>
                <button
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (editingUser) {
                  handleUpdateUser();
                } else {
                  handleCreateUser();
                }
              }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Name Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* Contact Fields */}
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* Password Field */}
                  {!editingUser && (
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  )}

                  {/* Role and License */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Role *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: 'white'
                        }}
                      >
                        <option value="commuter">Commuter</option>
                        <option value="driver">Driver</option>
                      </select>
                    </div>
                    {formData.role === 'driver' && (
                      <div>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          License Number *
                        </label>
                        <input
                          type="text"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                          required={formData.role === 'driver'}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Address Fields */}
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1f2937' }}>Address</h4>
                    
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Street
                      </label>
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={(e) => setFormData({
                          ...formData, 
                          address: {...formData.address, street: e.target.value}
                        })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                      <div>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          City *
                        </label>
                        <input
                          type="text"
                          value={formData.address.city}
                          onChange={(e) => setFormData({
                            ...formData, 
                            address: {...formData.address, city: e.target.value}
                          })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Province *
                        </label>
                        <input
                          type="text"
                          value={formData.address.province}
                          onChange={(e) => setFormData({
                            ...formData, 
                            address: {...formData.address, province: e.target.value}
                          })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                      <div>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={formData.address.postalCode}
                          onChange={(e) => setFormData({
                            ...formData, 
                            address: {...formData.address, postalCode: e.target.value}
                          })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Country
                        </label>
                        <input
                          type="text"
                          value={formData.address.country}
                          onChange={(e) => setFormData({
                            ...formData, 
                            address: {...formData.address, country: e.target.value}
                          })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserForm(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: actionLoading ? 0.6 : 1
                    }}
                  >
                    {actionLoading ? '⏳' : (editingUser ? 'Update User' : 'Create User')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default UserManagement;
