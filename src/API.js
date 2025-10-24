// API Service for EyyTrike Backend Communication
class APIService {
  constructor() {
    // For production, connect to Railway backend
    this.baseURL = process.env.REACT_APP_API_URL || 'https://eyyback-production.up.railway.app/api';
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
          this.setToken(null);
          localStorage.removeItem('user');
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
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
