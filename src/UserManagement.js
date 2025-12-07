import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from './API';

function UserManagement({ user, onLogout, onNavigateToDashboard, onNavigateToAnalytics, initialSearch }) {
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
  const scrollRef = useRef(null);
  const fabRef = useRef(null);
  const scrollRaf = useRef(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [fabOffset, setFabOffset] = useState(16);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Fetch all users from the backend
  const fetchUsers = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (typeof initialSearch === 'string') {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  // Close dropdown when clicking outside (covers fixed dropdown as well)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownOpen &&
        !event.target.closest('.dropdown-container') &&
        !event.target.closest('.um-fixed-dropdown')
      ) {
        setDropdownOpen(null);
      }
    };

    const handleKeyDown = (event) => {
      if (dropdownOpen && event.key === 'Escape') {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  // Floating Action Button: scroll detection and overlap handling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (scrollRaf.current) return;
      scrollRaf.current = requestAnimationFrame(() => {
        scrollRaf.current = 0;
        const st = el.scrollTop || 0;
        setIsScrolled(st > 160);

        if (fabRef.current && dropdownOpen) {
          const fabRect = fabRef.current.getBoundingClientRect();
          const menu = document.querySelector(`[data-dropdown-id="${dropdownOpen}"]`);
          if (menu) {
            const menuRect = menu.getBoundingClientRect();
            const intersects = !(
              fabRect.right < menuRect.left ||
              fabRect.left > menuRect.right ||
              fabRect.bottom < menuRect.top ||
              fabRect.top > menuRect.bottom
            );
            setFabOffset(intersects ? 64 : 16);
          } else {
            setFabOffset(16);
          }
        } else {
          setFabOffset(16);
        }

        if (dropdownOpen) {
          const btn = document.querySelector(`[data-action-btn-id="${dropdownOpen}"]`);
          if (btn) {
            const rect = btn.getBoundingClientRect();
            const dw = 260;
            const left = Math.max(16, Math.min(rect.left, window.innerWidth - dw - 16));
            setDropdownPos({ top: rect.bottom + 8, left });
          }
        }
      });
    };

    // Initialize state on mount and re-run when dropdown changes
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = 0;
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
      
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phoneNumber) {
        setError('Please fill in all required fields');
        setActionLoading(false);
        return;
      }
      
      if (!formData.password) {
        setError('Password is required for new users');
        setActionLoading(false);
        return;
      }
      
      if (formData.role === 'driver' && !formData.licenseNumber) {
        setError('License number is required for drivers');
        setActionLoading(false);
        return;
      }
      
      if (!formData.address.city || !formData.address.province) {
        setError('City and Province are required');
        setActionLoading(false);
        return;
      }
      
      // Prepare user data
      const userData = {
        ...formData,
        // Ensure address is properly formatted
        address: {
          ...formData.address,
          fullAddress: [
            formData.address.street,
            formData.address.city,
            formData.address.province,
            formData.address.postalCode,
            formData.address.country
          ].filter(Boolean).join(', ')
        }
      };
      
      await api.createUser(userData);
      
      // Refresh the users list
      await fetchUsers();
      
      // Reset form and close modal
      resetForm();
      setShowUserForm(false);
      
      setSuccessMessage('User created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Failed to create user: ' + (err.message || 'Unknown error occurred'));
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
      
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phoneNumber) {
        setError('Please fill in all required fields');
        setActionLoading(false);
        return;
      }
      
      if (formData.role === 'driver' && !formData.licenseNumber) {
        setError('License number is required for drivers');
        setActionLoading(false);
        return;
      }
      
      if (!formData.address.city || !formData.address.province) {
        setError('City and Province are required');
        setActionLoading(false);
        return;
      }
      
      // Prepare user data (exclude password if empty)
      const userData = {
        ...formData,
        // Remove password if not provided
        ...(formData.password ? { password: formData.password } : {}),
        // Ensure address is properly formatted
        address: {
          ...formData.address,
          fullAddress: [
            formData.address.street,
            formData.address.city,
            formData.address.province,
            formData.address.postalCode,
            formData.address.country
          ].filter(Boolean).join(', ')
        }
      };
      
      // Remove password from data if it's empty (don't update password)
      if (!formData.password) {
        delete userData.password;
      }
      
      await api.updateUser(editingUser._id, userData);
      
      // Refresh the users list
      await fetchUsers();
      
      // Reset form and close modal
      resetForm();
      setShowUserForm(false);
      setEditingUser(null);
      
      setSuccessMessage('User updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user: ' + (err.message || 'Unknown error occurred'));
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

          /* Toolbar aesthetics */
          .um-toolbar input, .um-toolbar select {
            transition: box-shadow 160ms ease, border-color 160ms ease;
          }
          .um-toolbar input:focus, .um-toolbar select:focus {
            outline: none;
            border-color: #93c5fd;
            box-shadow: 0 0 0 3px rgba(147,197,253,0.35);
          }
          .um-toolbar button {
            transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, opacity 160ms ease;
          }
          @media (prefers-reduced-motion: no-preference) {
            .um-toolbar button:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            }
          }

          /* Floating Action Button styles */
          .um-fab, .um-fab-mini {
            box-shadow: 0 6px 12px rgba(0,0,0,0.12);
            border: none;
            cursor: pointer;
            color: white;
            background: var(--brand-primary);
            border-radius: 9999px;
          }
          .um-fab-mini {
            background: #6b7280;
          }
          @media (prefers-reduced-motion: no-preference) {
            .um-fab, .um-fab-mini {
              transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, opacity 180ms ease;
            }
            .um-fab:hover, .um-fab-mini:hover {
              transform: scale(1.03);
              box-shadow: 0 10px 20px rgba(0,0,0,0.18);
            }
          }
          .um-fab:focus-visible, .um-fab-mini:focus-visible {
            outline: 3px solid #93c5fd;
            outline-offset: 3px;
          }
        `}
      </style>
      <div ref={scrollRef} style={{ flex: 1, padding: '24px', overflowY: 'auto', scrollBehavior: 'smooth' }}>
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
          <div className="um-toolbar" style={{
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
                            data-action-btn-id={userItem._id}
                            onClick={(e) => {
                              const willOpen = dropdownOpen !== userItem._id;
                              setDropdownOpen(willOpen ? userItem._id : null);
                              if (willOpen) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const dw = 260;
                                const left = Math.max(16, Math.min(rect.left, window.innerWidth - dw - 16));
                                setDropdownPos({ top: rect.bottom + 8, left });
                              }
                              e.preventDefault();
                            }}
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
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => {
              // Close modal when clicking outside
              if (e.target === e.currentTarget && !actionLoading) {
                setShowUserForm(false);
                setEditingUser(null);
                resetForm();
              }
            }}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '0',
                maxWidth: '700px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                padding: '24px 28px',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '24px', 
                    color: 'white',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    {editingUser ? '✏️ Edit User' : '➕ Create New User'}
                  </h3>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}>
                    {editingUser ? 'Update user information' : 'Add a new user to the system'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!actionLoading) {
                      setShowUserForm(false);
                      setEditingUser(null);
                      resetForm();
                      setError('');
                    }
                  }}
                  disabled={actionLoading}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    fontSize: '28px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    color: 'white',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                    opacity: actionLoading ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!actionLoading) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div style={{
                padding: '28px',
                overflowY: 'auto',
                flex: 1
              }}>
                {/* Error Message in Modal */}
                {error && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    color: '#991b1b',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: '1px solid #fca5a5',
                    marginBottom: '20px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <span style={{ fontWeight: '500' }}>{error}</span>
                  </div>
                )}

              <form onSubmit={(e) => {
                e.preventDefault();
                if (editingUser) {
                  handleUpdateUser();
                } else {
                  handleCreateUser();
                }
              }}>
                <div style={{ display: 'grid', gap: '20px' }}>
                  {/* Personal Information Section */}
                  <div>
                    <h4 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      👤 Personal Information
                    </h4>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {/* Name Fields */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151', 
                            display: 'block', 
                            marginBottom: '6px' 
                          }}>
                            First Name <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            required
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              transition: 'all 0.2s',
                              background: '#fafafa'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#10b981';
                              e.target.style.background = 'white';
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.background = '#fafafa';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="Enter first name"
                          />
                        </div>
                        <div>
                          <label style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151', 
                            display: 'block', 
                            marginBottom: '6px' 
                          }}>
                            Last Name <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            required
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              transition: 'all 0.2s',
                              background: '#fafafa'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#10b981';
                              e.target.style.background = 'white';
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.background = '#fafafa';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ 
                          fontSize: '13px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          display: 'block', 
                          marginBottom: '6px' 
                        }}>
                          Middle Name
                        </label>
                        <input
                          type="text"
                          value={formData.middleName}
                          onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            background: '#fafafa'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.background = 'white';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.background = '#fafafa';
                            e.target.style.boxShadow = 'none';
                          }}
                          placeholder="Enter middle name (optional)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information Section */}
                  <div>
                    <h4 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      📧 Contact Information
                    </h4>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div>
                        <label style={{ 
                          fontSize: '13px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          display: 'block', 
                          marginBottom: '6px' 
                        }}>
                          Email Address <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            background: '#fafafa'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.background = 'white';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.background = '#fafafa';
                            e.target.style.boxShadow = 'none';
                          }}
                          placeholder="user@example.com"
                        />
                      </div>

                      <div>
                        <label style={{ 
                          fontSize: '13px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          display: 'block', 
                          marginBottom: '6px' 
                        }}>
                          Phone Number <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            background: '#fafafa'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.background = 'white';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.background = '#fafafa';
                            e.target.style.boxShadow = 'none';
                          }}
                          placeholder="+63 9XX XXX XXXX"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Account Security Section */}
                  <div>
                    <h4 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      🔒 Account Security
                    </h4>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {!editingUser ? (
                        <div>
                          <label style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151', 
                            display: 'block', 
                            marginBottom: '6px' 
                          }}>
                            Password <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                            minLength={6}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              transition: 'all 0.2s',
                              background: '#fafafa'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#10b981';
                              e.target.style.background = 'white';
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.background = '#fafafa';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="Minimum 6 characters"
                          />
                          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Password must be at least 6 characters long
                          </p>
                        </div>
                      ) : (
                        <div>
                          <label style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151', 
                            display: 'block', 
                            marginBottom: '6px' 
                          }}>
                            New Password
                          </label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            minLength={6}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              transition: 'all 0.2s',
                              background: '#fafafa'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#10b981';
                              e.target.style.background = 'white';
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.background = '#fafafa';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="Leave blank to keep current password"
                          />
                          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Leave blank if you don't want to change the password
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role and License Section */}
                  <div>
                    <h4 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      👥 Role & Permissions
                    </h4>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151', 
                            display: 'block', 
                            marginBottom: '6px' 
                          }}>
                            User Role <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value, licenseNumber: e.target.value === 'driver' ? formData.licenseNumber : ''})}
                            required
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              background: '#fafafa',
                              transition: 'all 0.2s',
                              cursor: 'pointer'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#10b981';
                              e.target.style.background = 'white';
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.background = '#fafafa';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            <option value="commuter">👤 Commuter</option>
                            <option value="driver">🚗 Driver</option>
                          </select>
                        </div>
                        {formData.role === 'driver' && (
                          <div>
                            <label style={{ 
                              fontSize: '13px', 
                              fontWeight: '600', 
                              color: '#374151', 
                              display: 'block', 
                              marginBottom: '6px' 
                            }}>
                              License Number <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.licenseNumber}
                              onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                              required={formData.role === 'driver'}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                background: '#fafafa'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#10b981';
                                e.target.style.background = 'white';
                                e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.background = '#fafafa';
                                e.target.style.boxShadow = 'none';
                              }}
                              placeholder="Enter license number"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div>
                    <h4 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      📍 Address Information
                    </h4>
                    <div style={{ display: 'grid', gap: '16px' }}>
                    
                      <div>
                        <label style={{ 
                          fontSize: '13px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          display: 'block', 
                          marginBottom: '6px' 
                        }}>
                          Street Address
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
                            padding: '10px 14px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            background: '#fafafa'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.background = 'white';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.background = '#fafafa';
                            e.target.style.boxShadow = 'none';
                          }}
                          placeholder="Street name and number"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151', 
                            display: 'block', 
                            marginBottom: '6px' 
                          }}>
                            City <span style={{ color: '#ef4444' }}>*</span>
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
                              padding: '10px 14px',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              transition: 'all 0.2s',
                              background: '#fafafa'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#10b981';
                              e.target.style.background = 'white';
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.background = '#fafafa';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="City name"
                          />
                        </div>
                        <div>
                          <label style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151', 
                            display: 'block', 
                            marginBottom: '6px' 
                          }}>
                            Province <span style={{ color: '#ef4444' }}>*</span>
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
                              padding: '10px 14px',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              transition: 'all 0.2s',
                              background: '#fafafa'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#10b981';
                              e.target.style.background = 'white';
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.background = '#fafafa';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="Province name"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151', 
                            display: 'block', 
                            marginBottom: '6px' 
                          }}>
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
                              padding: '10px 14px',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              transition: 'all 0.2s',
                              background: '#fafafa'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#10b981';
                              e.target.style.background = 'white';
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.background = '#fafafa';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="Postal code"
                          />
                        </div>
                        <div>
                          <label style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151', 
                            display: 'block', 
                            marginBottom: '6px' 
                          }}>
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
                              padding: '10px 14px',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              transition: 'all 0.2s',
                              background: '#fafafa'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#10b981';
                              e.target.style.background = 'white';
                              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.background = '#fafafa';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="Country"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '28px',
                  paddingTop: '20px',
                  borderTop: '2px solid #e5e7eb',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!actionLoading) {
                        setShowUserForm(false);
                        setEditingUser(null);
                        resetForm();
                        setError('');
                      }
                    }}
                    disabled={actionLoading}
                    style={{
                      padding: '12px 24px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: actionLoading ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!actionLoading) {
                        e.currentTarget.style.background = '#e5e7eb';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{
                      padding: '12px 28px',
                      background: actionLoading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: actionLoading ? 0.8 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: '150px',
                      justifyContent: 'center',
                      boxShadow: actionLoading ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!actionLoading) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = actionLoading ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.4)';
                    }}
                  >
                    {actionLoading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid white',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }}></div>
                        {editingUser ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        {editingUser ? '💾 Update User' : '✨ Create User'}
                      </>
                    )}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed-position dropdown (prevents table from scrolling when interacting) */}
      {user.role === 'admin' && dropdownOpen && (
        <div
          className="um-fixed-dropdown"
          data-dropdown-id={dropdownOpen}
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 900,
            minWidth: '200px',
            maxWidth: '260px',
            maxHeight: '320px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {(() => {
            const userItem = filteredUsers.find(u => u._id === dropdownOpen);
            if (!userItem) return null;
            return (
              <div style={{ padding: '6px 0' }}>
                <button
                  onClick={() => {
                    setSelectedUser(userItem);
                    setShowUserDetails(true);
                    setDropdownOpen(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                        padding: '10px 14px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        color: '#10b981',
                        opacity: actionLoading ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => !actionLoading && (e.currentTarget.style.background = '#f0fdf4')}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                        padding: '10px 14px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        color: '#ef4444',
                        opacity: actionLoading ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => !actionLoading && (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    color: userItem.isActive ? '#f59e0b' : '#10b981',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !actionLoading && (e.currentTarget.style.background = userItem.isActive ? '#fffbeb' : '#f0fdf4')}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  {userItem.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                </button>

                <div style={{ borderTop: '1px solid #e5e7eb', margin: '6px 0' }}></div>

                <button
                  onClick={() => {
                    handleDeleteUser(userItem._id, false);
                    setDropdownOpen(null);
                  }}
                  disabled={actionLoading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    color: '#f59e0b',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !actionLoading && (e.currentTarget.style.background = '#fffbeb')}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    color: '#ef4444',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !actionLoading && (e.currentTarget.style.background = '#fef2f2')}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  🗑️ Permanently Delete
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      {/* Fixed-position action button that stays anchored to viewport. Includes mini scroll-to-top when scrolled. */}
      {user.role === 'admin' && !showUserForm && !showUserDetails && (
        <div
          ref={fabRef}
          style={{
            position: 'fixed',
            bottom: `calc(${fabOffset}px + env(safe-area-inset-bottom, 0px))`,
            right: '16px',
            zIndex: 900,
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}
          aria-hidden={showUserForm || showUserDetails}
        >
          <button
            type="button"
            className="um-fab"
            aria-label="Create new user"
            title="Create new user"
            onClick={openCreateForm}
            style={{
              height: 'clamp(44px, 7.5vw, 56px)',
              padding: '0 18px',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              willChange: 'transform'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCreateForm();
              }
            }}
          >
            ➕ Create User
          </button>

          {isScrolled && (
            <button
              type="button"
              className="um-fab-mini"
              aria-label="Scroll to top"
              title="Scroll to top"
              onClick={() => {
                const el = scrollRef.current;
                if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                height: 'clamp(40px, 6.5vw, 48px)',
                width: 'clamp(40px, 6.5vw, 48px)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                willChange: 'transform'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const el = scrollRef.current;
                  if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              ⬆️
            </button>
          )}
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default UserManagement;
