// API Service for EyyTrike Backend Communication
class APIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
    this.token = localStorage.getItem('token');
  }

  // Update token when user logs in/out
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Get current token
  getToken() {
    return this.token || localStorage.getItem('token');
  }

  // Make authenticated request
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    if (token && this.isTokenExpiringSoon(token)) {
      try {
        const renewed = await this.renewToken();
        if (renewed && renewed.token) {
          this.setToken(renewed.token);
          localStorage.setItem('user', JSON.stringify(renewed.user));
        }
      } catch {}
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401) {
          const hadToken = !!this.getToken();
          const isExpired = data && data.error === 'Token expired';
          const isAuthRoute = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register');
          if (isExpired) {
            this.setToken(null);
            localStorage.removeItem('user');
            try {
              if (hadToken && !isAuthRoute) {
                window.dispatchEvent(new CustomEvent('api:sessionExpired'));
              }
            } catch {}
          }
          throw new Error(isExpired ? 'Session expired. Please login again.' : (data.error || 'Unauthorized'));
        }
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  decodeToken(token) {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  isTokenExpiringSoon(token, thresholdSeconds = 600) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp - now < thresholdSeconds;
  }

  async renewToken() {
    return await this.makeRequest('/auth/renew', { method: 'POST' });
  }

  // Authentication Methods
  async login(email, password) {
    const data = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  async register(userData) {
    const data = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    this.setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  async registerAdmin(userData) {
    const data = await this.makeRequest('/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    return data;
  }

  async getProfile() {
    return await this.makeRequest('/auth/me');
  }

  // User Management Methods
  async getUserProfile() {
    return await this.makeRequest('/users/profile');
  }

  async updateProfile(profileData) {
    return await this.makeRequest('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  async getUserAddress() {
    return await this.makeRequest('/users/address');
  }

  async updateAddress(addressData) {
    return await this.makeRequest('/users/address', {
      method: 'PATCH',
      body: JSON.stringify(addressData),
    });
  }

  async getUsersByCity(city, role = null) {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    const queryString = params.toString();
    return await this.makeRequest(`/users/by-city/${encodeURIComponent(city)}${queryString ? `?${queryString}` : ''}`);
  }

  async getNearbyDrivers(latitude, longitude, maxDistance = 5000) {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      maxDistance: maxDistance.toString(),
    });
    return await this.makeRequest(`/users/drivers/nearby?${params.toString()}`);
  }

  // Driver-specific Methods
  async updateDriverAvailability(isAvailable) {
    return await this.makeRequest('/users/driver/availability', {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    });
  }

  async updateDriverLocation(latitude, longitude) {
    return await this.makeRequest('/users/driver/location', {
      method: 'PATCH',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  // Ride Methods
  async createRide(rideData) {
    return await this.makeRequest('/rides', {
      method: 'POST',
      body: JSON.stringify(rideData),
    });
  }

  async getRides(status = null) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const queryString = params.toString();
    return await this.makeRequest(`/rides${queryString ? `?${queryString}` : ''}`);
  }

  async getRideById(rideId) {
    return await this.makeRequest(`/rides/${rideId}`);
  }

  async updateRideStatus(rideId, status, additionalData = {}) {
    return await this.makeRequest(`/rides/${rideId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...additionalData }),
    });
  }

  async acceptRide(rideId) {
    return await this.makeRequest(`/rides/${rideId}/accept`, {
      method: 'POST',
    });
  }

  async completeRide(rideId, rating = null) {
    return await this.makeRequest(`/rides/${rideId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  }

  // Feedback Methods
  async rateRide(rideId, rating, feedback) {
    return await this.makeRequest(`/rides/${rideId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback }),
    });
  }

  async listFeedback(driverId, { status = 'approved', sort = 'newest', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ status, sort, page: String(page), limit: String(limit) });
    if (driverId) params.append('driverId', driverId);
    return await this.makeRequest(`/rides/feedback?${params.toString()}`);
  }

  async feedbackDistribution(driverId) {
    const params = new URLSearchParams({ driverId });
    return await this.makeRequest(`/rides/feedback/distribution?${params.toString()}`);
  }

  async flagFeedback(rideId, reason = '') {
    return await this.makeRequest(`/rides/${rideId}/feedback/flag`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async adminListPendingFeedback() {
    return await this.makeRequest('/rides/admin/feedback/pending');
  }

  async adminApproveFeedback(rideId) {
    return await this.makeRequest(`/rides/admin/feedback/${rideId}/approve`, { method: 'POST' });
  }

  async adminRejectFeedback(rideId) {
    return await this.makeRequest(`/rides/admin/feedback/${rideId}/reject`, { method: 'POST' });
  }

  // Notifications
  async getNotifications({ unread = false, page = 1, limit = 50 } = {}) {
    const params = new URLSearchParams({ unread: String(unread), page: String(page), limit: String(limit) });
    return await this.makeRequest(`/notifications?${params.toString()}`);
  }
  async markNotificationRead(id) {
    return await this.makeRequest(`/notifications/${id}/read`, { method: 'PATCH' });
  }
  async getNotificationPreferences() {
    return await this.makeRequest(`/notifications/preferences`);
  }
  async setNotificationPreferences(prefs) {
    return await this.makeRequest(`/notifications/preferences`, { method: 'POST', body: JSON.stringify(prefs) });
  }
  async adminBroadcast(title, body, roles = []) {
    return await this.makeRequest(`/notifications/admin/broadcast`, { method: 'POST', body: JSON.stringify({ title, body, roles }) });
  }

  // Emergency
  async getEmergencyContacts() {
    return await this.makeRequest('/emergency/contacts');
  }
  async addEmergencyContact({ name, phone, priority = 1, enabled = true }) {
    return await this.makeRequest('/emergency/contacts', { method: 'POST', body: JSON.stringify({ name, phone, priority, enabled }) });
  }
  async updateEmergencyContact(id, patch) {
    return await this.makeRequest(`/emergency/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  }
  async deleteEmergencyContact(id) {
    return await this.makeRequest(`/emergency/contacts/${id}`, { method: 'DELETE' });
  }
  async requestEmergencyOtp() {
    return await this.makeRequest('/emergency/request-otp', { method: 'POST' });
  }
  async sendEmergencyAlert(payload) {
    return await this.makeRequest('/emergency/alert', { method: 'POST', body: JSON.stringify(payload) });
  }
  async getEmergencyDriverDetails(driverId) {
    return await this.makeRequest(`/emergency/driver/${driverId}/details`);
  }
  async reportAccident(driverId, location = {}, vehicle = {}) {
    return await this.makeRequest('/emergency/accident', { method: 'POST', body: JSON.stringify({ driverId, location, vehicle }) });
  }

  async listContactsV1({ page = 1, limit = 20, includeDeleted = false } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), includeDeleted: String(includeDeleted) })
    const data = await this.makeRequest(`/v1/contacts?${params.toString()}`)
    const items = Array.isArray(data?.data) ? data.data.map(d => ({ id: d.id, ...(d.attributes || {}) })) : []
    return { items, meta: data?.meta || {} }
  }
  async createContactV1(payload) {
    const data = await this.makeRequest('/v1/contacts', { method: 'POST', body: JSON.stringify(payload) })
    const d = data?.data
    return d ? { id: d.id, ...(d.attributes || {}) } : null
  }
  async getContactV1(id) {
    const data = await this.makeRequest(`/v1/contacts/${id}`)
    const d = data?.data
    return d ? { id: d.id, ...(d.attributes || {}) } : null
  }
  async updateContactV1(id, patch) {
    const data = await this.makeRequest(`/v1/contacts/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    const d = data?.data
    return d ? { id: d.id, ...(d.attributes || {}) } : null
  }
  async deleteContactV1(id) {
    const data = await this.makeRequest(`/v1/contacts/${id}`, { method: 'DELETE' })
    const d = data?.data
    return d ? { id: d.id, ...(d.attributes || {}) } : null
  }
  async listContactsByTypeV1(type) {
    const data = await this.makeRequest(`/v1/contacts/user/${encodeURIComponent(type)}`)
    const items = Array.isArray(data?.data) ? data.data.map(d => ({ id: d.id, ...(d.attributes || {}) })) : []
    return items
  }

  // Payment Methods
  async getPayments() {
    return await this.makeRequest('/payments');
  }

  async createPayment(paymentData) {
    return await this.makeRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async getPaymentById(paymentId) {
    return await this.makeRequest(`/payments/${paymentId}`);
  }

  // Wallet Methods
  async getWallet() {
    return await this.makeRequest('/wallets');
  }

  async addFunds(amount) {
    return await this.makeRequest('/wallets/add-funds', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async withdrawFunds(amount) {
    return await this.makeRequest('/wallets/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // Utility Methods
  async checkConnection() {
    try {
      await this.makeRequest('/auth/me');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Logout
  logout() {
    this.setToken(null);
    localStorage.removeItem('user');
  }

  // Get current user from localStorage
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  // Analytics Methods
  async getEarningsAnalytics(timeRange = 'week') {
    const params = new URLSearchParams({ timeRange });
    return await this.makeRequest(`/analytics/earnings?${params.toString()}`);
  }

  async getRideAnalytics(timeRange = 'week') {
    const params = new URLSearchParams({ timeRange });
    return await this.makeRequest(`/analytics/rides?${params.toString()}`);
  }

  async getDriverAnalytics(driverId = null) {
    const params = new URLSearchParams();
    if (driverId) params.append('driverId', driverId);
    const queryString = params.toString();
    return await this.makeRequest(`/analytics/driver${queryString ? `?${queryString}` : ''}`);
  }

  async getCommuterAnalytics(commuterId = null) {
    const params = new URLSearchParams();
    if (commuterId) params.append('commuterId', commuterId);
    const queryString = params.toString();
    return await this.makeRequest(`/analytics/commuter${queryString ? `?${queryString}` : ''}`);
  }

  // User Management Methods
  async getAllUsers() {
    const response = await this.makeRequest('/users/');
    // The backend returns { users, totalPages, currentPage, total }
    const users = response.users || response;
    // Filter out admin users
    return users.filter(user => user.role !== 'admin');
  }

  async getUsersByRole(role) {
    // Don't allow fetching admin users
    if (role === 'admin') {
      return [];
    }
    const params = new URLSearchParams({ role });
    const response = await this.makeRequest(`/users/?${params.toString()}`);
    const users = response.users || response;
    // Filter out admin users (extra safety)
    return users.filter(user => user.role !== 'admin');
  }

  async getPendingDrivers() {
    return await this.makeRequest('/users/admin/drivers/pending');
  }

  async updateUserApprovalStatus(userId, status) {
    if (status === 'approved') {
      return await this.makeRequest(`/users/admin/drivers/${userId}/approve`, {
        method: 'POST',
      });
    } else if (status === 'rejected') {
      return await this.makeRequest(`/users/admin/drivers/${userId}/reject`, {
        method: 'POST',
      });
    } else {
      return await this.makeRequest(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ approvalStatus: status }),
      });
    }
  }

  async updateUserStatus(userId, isActive) {
    return await this.makeRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async deleteUser(userId, hardDelete = false) {
    const endpoint = hardDelete ? `/users/${userId}/hard` : `/users/${userId}`;
    return await this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }

  async getUserById(userId) {
    return await this.makeRequest(`/users/${userId}`);
  }

  async searchUsers(query) {
    const params = new URLSearchParams({ search: query });
    const response = await this.makeRequest(`/users/?${params.toString()}`);
    return response.users || response;
  }

  async createUser(userData) {
    return await this.makeRequest('/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId, userData) {
    return await this.makeRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }
}

// Create and export a singleton instance
const api = new APIService();
export default api;

// Export the class for testing or multiple instances
export { APIService };
