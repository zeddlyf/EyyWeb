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
      pending: { 
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
        color: '#78350f',
        border: '1px solid #fbbf24',
        icon: '⏳'
      },
      approved: { 
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', 
        color: '#065f46',
        border: '1px solid #10b981',
        icon: '✅'
      },
      rejected: { 
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', 
        color: '#991b1b',
        border: '1px solid #ef4444',
        icon: '❌'
      }
    };
    
    const style = styles[status] || styles.pending;
    
    return (
      <span className="um-badge" style={{
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        ...style
      }}>
        <span>{style.icon}</span>
        {status}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const styles = {
      driver: { 
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
        color: 'white',
        icon: '🚗'
      },
      commuter: { 
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
        color: 'white',
        icon: '👤'
      },
      admin: { 
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
        color: 'white',
        icon: '👑'
      }
    };
    
    const style = styles[role] || styles.commuter;
    
    return (
      <span className="um-badge" style={{
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        textTransform: 'capitalize',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        ...style
      }}>
        <span>{style.icon}</span>
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-muted)' }}>
      <style>
        {`
          .dropdown-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .dropdown-scroll::-webkit-scrollbar-track {
            background: var(--surface-muted);
            border-radius: 4px;
          }
          .dropdown-scroll::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 4px;
          }
          .dropdown-scroll::-webkit-scrollbar-thumb:hover {
            background: var(--text-muted);
          }

          /* Toolbar aesthetics */
          .um-toolbar input, .um-toolbar select {
            transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
          }
          .um-toolbar input:focus, .um-toolbar select:focus {
            outline: none;
            border-color: var(--brand-primary);
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
            background: var(--surface);
          }
          .um-toolbar button {
            transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
          }
          @media (prefers-reduced-motion: no-preference) {
            .um-toolbar button:hover:not(:disabled) {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .um-toolbar button:active:not(:disabled) {
              transform: translateY(0);
            }
          }

          /* Table row hover effects */
          .um-table-row {
            transition: all 150ms ease;
          }
          @media (prefers-reduced-motion: no-preference) {
            .um-table-row:hover {
              background: var(--surface-muted);
              transform: scale(1.001);
            }
          }

          /* Floating Action Button styles */
          .um-fab, .um-fab-mini {
            box-shadow: 0 4px 14px rgba(22, 163, 74, 0.25);
            border: none;
            cursor: pointer;
            color: white;
            background: var(--brand-primary);
            border-radius: 9999px;
            font-weight: 600;
          }
          .um-fab-mini {
            background: var(--text-muted);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
          }
          @media (prefers-reduced-motion: no-preference) {
            .um-fab, .um-fab-mini {
              transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
            }
            .um-fab:hover:not(:disabled), .um-fab-mini:hover:not(:disabled) {
              transform: translateY(-2px) scale(1.02);
              box-shadow: 0 8px 20px rgba(22, 163, 74, 0.35);
            }
            .um-fab-mini:hover:not(:disabled) {
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
            }
            .um-fab:active:not(:disabled), .um-fab-mini:active:not(:disabled) {
              transform: translateY(0) scale(1);
            }
          }
          .um-fab:focus-visible, .um-fab-mini:focus-visible {
            outline: 3px solid var(--brand-primary);
            outline-offset: 3px;
          }
          .um-fab:disabled, .um-fab-mini:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          /* Badge animations */
          .um-badge {
            transition: all 150ms ease;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          @media (prefers-reduced-motion: no-preference) {
            .um-badge:hover {
              transform: scale(1.05);
            }
          }

          /* Modal backdrop */
          .um-modal-backdrop {
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }

          /* Action button improvements */
          .um-action-btn {
            transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
          }
          @media (prefers-reduced-motion: no-preference) {
            .um-action-btn:hover:not(:disabled) {
              transform: translateY(-1px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.12);
            }
          }
        `}
      </style>
      <div ref={scrollRef} style={{ flex: 1, padding: '24px', overflowY: 'auto', scrollBehavior: 'smooth' }}>
        {/* Admin Access Check */}
        {user.role !== 'admin' && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            color: '#991b1b',
            padding: '32px',
            borderRadius: '16px',
            border: '2px solid #fca5a5',
            textAlign: 'center',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)'
          }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🚫</div>
            <h3 style={{ 
              margin: '0 0 12px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#991b1b'
            }}>
              Access Denied
            </h3>
            <p style={{ 
              margin: '0', 
              fontSize: '16px',
              color: '#7f1d1d',
              lineHeight: '1.6'
            }}>
              You need admin privileges to access user management. 
              Please contact your administrator or login with an admin account.
            </p>
          </div>
        )}

        {/* Filters and Search - Only show for admin users */}
        {user.role === 'admin' && (
          <div className="um-toolbar" style={{
            background: 'var(--surface)',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
            border: '1px solid var(--border)',
            marginBottom: '24px'
          }}>
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center', 
            flexWrap: 'wrap' 
          }}>
            {/* Search */}
            <div style={{ 
              flex: '1', 
              minWidth: '240px',
              position: 'relative'
            }}>
              <input
                type="text"
                placeholder="🔍 Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: 'var(--surface-muted)',
                  color: 'var(--text-primary)',
                  transition: 'all 200ms ease'
                }}
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: '10px',
                fontSize: '14px',
                background: 'var(--surface-muted)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                minWidth: '140px'
              }}
            >
              <option value="all">👥 All Roles</option>
              <option value="driver">🚗 Drivers</option>
              <option value="commuter">👤 Commuters</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: '10px',
                fontSize: '14px',
                background: 'var(--surface-muted)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                minWidth: '140px'
              }}
            >
              <option value="all">📊 All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="rejected">❌ Rejected</option>
            </select>

            {/* Quick Filter for Pending Drivers */}
            {pendingDriversCount > 0 && (
              <button
                onClick={() => {
                  setRoleFilter('driver');
                  setStatusFilter('pending');
                }}
                className="um-action-btn"
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, var(--brand-accent) 0%, var(--brand-yellow-600) 100%)',
                  color: '#78350f',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)'
                }}
              >
                ⏳ Pending ({pendingDriversCount})
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
                className="um-action-btn"
                style={{
                  padding: '12px 20px',
                  background: 'var(--surface-muted)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                🗑️ Clear
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="um-action-btn"
              style={{
                padding: '12px 20px',
                background: isLoading ? 'var(--text-muted)' : 'var(--text-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: isLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  Loading...
                </>
              ) : (
                <>🔄 Refresh</>
              )}
            </button>
          </div>
        </div>
        )}

        {/* Success Message - Only show for admin users */}
        {user.role === 'admin' && successMessage && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            color: '#166534',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '2px solid #86efac',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(22, 101, 52, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <span style={{ fontWeight: '500', fontSize: '15px' }}>{successMessage}</span>
          </div>
        )}

        {/* Error Message - Only show for admin users */}
        {user.role === 'admin' && error && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            color: '#991b1b',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '2px solid #fca5a5',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ fontWeight: '500', fontSize: '15px' }}>{error}</span>
          </div>
        )}

        {/* Users Table - Only show for admin users */}
        {user.role === 'admin' && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}>
          {isLoading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '300px',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid var(--brand-primary)',
                borderTop: '4px solid transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}></div>
              <div style={{ 
                color: 'var(--text-muted)', 
                fontSize: '15px',
                fontWeight: '500'
              }}>
                Loading users...
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 40px',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                No users found
              </div>
              <div style={{ fontSize: '14px' }}>
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'No users in the system yet'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ 
                    background: 'linear-gradient(135deg, var(--surface-muted) 0%, var(--surface) 100%)',
                    borderBottom: '2px solid var(--border)'
                  }}>
                    <th style={{ 
                      padding: '16px 20px', 
                      textAlign: 'left', 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>User</th>
                    <th style={{ 
                      padding: '16px 20px', 
                      textAlign: 'left', 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Role</th>
                    <th style={{ 
                      padding: '16px 20px', 
                      textAlign: 'left', 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Status</th>
                    <th style={{ 
                      padding: '16px 20px', 
                      textAlign: 'left', 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Contact</th>
                    <th style={{ 
                      padding: '16px 20px', 
                      textAlign: 'left', 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Joined</th>
                    <th style={{ 
                      padding: '16px 20px', 
                      textAlign: 'center', 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((userItem) => (
                    <tr 
                      key={userItem._id} 
                      className="um-table-row"
                      style={{ 
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--surface)'
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div>
                          <div style={{ 
                            fontWeight: '600', 
                            color: 'var(--text-primary)',
                            fontSize: '15px',
                            marginBottom: '4px'
                          }}>
                            {userItem.firstName} {userItem.lastName}
                          </div>
                          <div style={{ 
                            fontSize: '13px', 
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span>📧</span>
                            {userItem.email}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {getRoleBadge(userItem.role)}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {getStatusBadge(userItem.approvalStatus)}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ 
                          fontSize: '14px', 
                          color: 'var(--text-primary)',
                          fontWeight: '500',
                          marginBottom: userItem.role === 'driver' && userItem.licenseNumber ? '6px' : '0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>📞</span>
                          {userItem.phoneNumber}
                        </div>
                        {userItem.role === 'driver' && userItem.licenseNumber && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span>🚗</span>
                            {userItem.licenseNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        padding: '16px 20px', 
                        fontSize: '13px', 
                        color: 'var(--text-muted)'
                      }}>
                        {formatDate(userItem.createdAt)}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
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
                            className="um-action-btn"
                            style={{
                              padding: '8px 16px',
                              background: dropdownOpen === userItem._id 
                                ? 'var(--brand-primary)' 
                                : 'var(--surface-muted)',
                              color: dropdownOpen === userItem._id ? 'white' : 'var(--text-primary)',
                              border: dropdownOpen === userItem._id 
                                ? 'none' 
                                : '2px solid var(--border)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 200ms ease'
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
          <div 
            className="um-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowUserDetails(false);
                setSelectedUser(null);
              }
            }}
          >
            <div style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              padding: '0',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-green-700) 100%)',
                padding: '24px 28px',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
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
                    marginBottom: '4px'
                  }}>
                    👤 User Details
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUserDetails(false);
                    setSelectedUser(null);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    color: 'white',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  ×
                </button>
              </div>
              
              {/* Content */}
              <div style={{
                padding: '28px',
                overflowY: 'auto',
                flex: 1
              }}>

              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text-muted)', 
                      display: 'block', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>First Name</label>
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--surface-muted)', 
                      borderRadius: '10px', 
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      fontWeight: '500',
                      border: '1px solid var(--border)'
                    }}>
                      {selectedUser.firstName}
                    </div>
                  </div>
                  <div>
                    <label style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text-muted)', 
                      display: 'block', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Last Name</label>
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--surface-muted)', 
                      borderRadius: '10px', 
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      fontWeight: '500',
                      border: '1px solid var(--border)'
                    }}>
                      {selectedUser.lastName}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: 'var(--text-muted)', 
                    display: 'block', 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Email Address</label>
                  <div style={{ 
                    padding: '12px 16px', 
                    background: 'var(--surface-muted)', 
                    borderRadius: '10px', 
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                    fontWeight: '500',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📧</span>
                    {selectedUser.email}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text-muted)', 
                      display: 'block', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Phone Number</label>
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--surface-muted)', 
                      borderRadius: '10px', 
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      fontWeight: '500',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>📞</span>
                      {selectedUser.phoneNumber}
                    </div>
                  </div>
                  <div>
                    <label style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text-muted)', 
                      display: 'block', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Role</label>
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--surface-muted)', 
                      borderRadius: '10px', 
                      fontSize: '15px',
                      border: '1px solid var(--border)'
                    }}>
                      {getRoleBadge(selectedUser.role)}
                    </div>
                  </div>
                </div>

                {selectedUser.role === 'driver' && selectedUser.licenseNumber && (
                  <div>
                    <label style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text-muted)', 
                      display: 'block', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>License Number</label>
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--surface-muted)', 
                      borderRadius: '10px', 
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      fontWeight: '500',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>🚗</span>
                      {selectedUser.licenseNumber}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: 'var(--text-muted)', 
                    display: 'block', 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Address</label>
                  <div style={{ 
                    padding: '12px 16px', 
                    background: 'var(--surface-muted)', 
                    borderRadius: '10px', 
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📍</span>
                    {selectedUser.address?.fullAddress || 'No address provided'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text-muted)', 
                      display: 'block', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Status</label>
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--surface-muted)', 
                      borderRadius: '10px', 
                      fontSize: '15px',
                      border: '1px solid var(--border)'
                    }}>
                      {getStatusBadge(selectedUser.approvalStatus)}
                    </div>
                  </div>
                  <div>
                    <label style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text-muted)', 
                      display: 'block', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Active</label>
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--surface-muted)', 
                      borderRadius: '10px', 
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      fontWeight: '500',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {selectedUser.isActive ? '✅ Active' : '❌ Inactive'}
                    </div>
                  </div>
                  <div>
                    <label style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text-muted)', 
                      display: 'block', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Rating</label>
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--surface-muted)', 
                      borderRadius: '10px', 
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      fontWeight: '500',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>⭐</span>
                      {selectedUser.rating?.toFixed(1) || 'No rating'}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: 'var(--text-muted)', 
                    display: 'block', 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Joined Date</label>
                  <div style={{ 
                    padding: '12px 16px', 
                    background: 'var(--surface-muted)', 
                    borderRadius: '10px', 
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                    fontWeight: '500',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📅</span>
                    {formatDate(selectedUser.createdAt)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginTop: '28px', 
                paddingTop: '24px',
                borderTop: '2px solid var(--border)',
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => openEditForm(selectedUser)}
                  className="um-action-btn"
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, var(--brand-secondary) 0%, var(--brand-yellow-600) 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ✏️ Edit User
                </button>
                
                <button
                  onClick={() => handleUserToggle(selectedUser._id, !selectedUser.isActive)}
                  disabled={actionLoading}
                  className="um-action-btn"
                  style={{
                    padding: '12px 20px',
                    background: selectedUser.isActive 
                      ? 'linear-gradient(135deg, var(--brand-secondary) 0%, var(--brand-yellow-600) 100%)'
                      : 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-green-700) 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: actionLoading ? 0.6 : 1,
                    boxShadow: selectedUser.isActive 
                      ? '0 2px 8px rgba(245, 158, 11, 0.3)'
                      : '0 2px 8px rgba(22, 163, 74, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {selectedUser.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                </button>
                
                {selectedUser.role === 'driver' && selectedUser.approvalStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUserAction(selectedUser._id, 'approved')}
                      disabled={actionLoading}
                      className="um-action-btn"
                      style={{
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-green-700) 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        opacity: actionLoading ? 0.6 : 1,
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleUserAction(selectedUser._id, 'rejected')}
                      disabled={actionLoading}
                      className="um-action-btn"
                      style={{
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        opacity: actionLoading ? 0.6 : 1,
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      ❌ Reject
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => handleDeleteUser(selectedUser._id, false)}
                  disabled={actionLoading}
                  className="um-action-btn"
                  style={{
                    padding: '12px 20px',
                    background: 'var(--surface-muted)',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--border)',
                    borderRadius: '10px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: actionLoading ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  🚫 Deactivate
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser._id, true)}
                  disabled={actionLoading}
                  className="um-action-btn"
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: actionLoading ? 0.6 : 1,
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  🗑️ Delete Permanently
                </button>
              </div>
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
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)',
            zIndex: 900,
            minWidth: '220px',
            maxWidth: '280px',
            maxHeight: '400px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            animation: 'slideDown 0.2s ease-out'
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {(() => {
            const userItem = filteredUsers.find(u => u._id === dropdownOpen);
            if (!userItem) return null;
            return (
              <div style={{ padding: '8px' }}>
                <button
                  onClick={() => {
                    setSelectedUser(userItem);
                    setShowUserDetails(true);
                    setDropdownOpen(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    fontWeight: '500',
                    transition: 'all 150ms ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-muted)';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>👁️</span>
                  View Details
                </button>

                <button
                  onClick={() => {
                    openEditForm(userItem);
                    setDropdownOpen(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    fontWeight: '500',
                    transition: 'all 150ms ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-muted)';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>✏️</span>
                  Edit User
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
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        color: 'var(--brand-primary)',
                        borderRadius: '8px',
                        fontWeight: '500',
                        opacity: actionLoading ? 0.6 : 1,
                        transition: 'all 150ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                      onMouseEnter={(e) => {
                        if (!actionLoading) {
                          e.currentTarget.style.background = 'rgba(22, 163, 74, 0.1)';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>✅</span>
                      Approve Driver
                    </button>

                    <button
                      onClick={() => {
                        handleUserAction(userItem._id, 'rejected');
                        setDropdownOpen(null);
                      }}
                      disabled={actionLoading}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        color: '#ef4444',
                        borderRadius: '8px',
                        fontWeight: '500',
                        opacity: actionLoading ? 0.6 : 1,
                        transition: 'all 150ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                      onMouseEnter={(e) => {
                        if (!actionLoading) {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>❌</span>
                      Reject Driver
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
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    color: userItem.isActive ? 'var(--brand-secondary)' : 'var(--brand-primary)',
                    borderRadius: '8px',
                    fontWeight: '500',
                    opacity: actionLoading ? 0.6 : 1,
                    transition: 'all 150ms ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    if (!actionLoading) {
                      e.currentTarget.style.background = userItem.isActive 
                        ? 'rgba(245, 158, 11, 0.1)' 
                        : 'rgba(22, 163, 74, 0.1)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>
                    {userItem.isActive ? '⏸️' : '▶️'}
                  </span>
                  {userItem.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <div style={{ 
                  borderTop: '1px solid var(--border)', 
                  margin: '8px 0' 
                }}></div>

                <button
                  onClick={() => {
                    handleDeleteUser(userItem._id, false);
                    setDropdownOpen(null);
                  }}
                  disabled={actionLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    color: 'var(--brand-secondary)',
                    borderRadius: '8px',
                    fontWeight: '500',
                    opacity: actionLoading ? 0.6 : 1,
                    transition: 'all 150ms ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    if (!actionLoading) {
                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🚫</span>
                  Deactivate User
                </button>

                <button
                  onClick={() => {
                    handleDeleteUser(userItem._id, true);
                    setDropdownOpen(null);
                  }}
                  disabled={actionLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    color: '#ef4444',
                    borderRadius: '8px',
                    fontWeight: '500',
                    opacity: actionLoading ? 0.6 : 1,
                    transition: 'all 150ms ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    if (!actionLoading) {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🗑️</span>
                  Permanently Delete
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
        @keyframes slideDown {
          from { 
            opacity: 0;
            transform: translateY(-10px);
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
