import React, { useEffect, useState } from 'react';
import api from './API';
import Dashboard from './Dashboard';
import Analytics from './Analytics';
import UserManagement from './UserManagement';

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await api.login(email, password);
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <h2 style={{ marginBottom: 16 }}>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>
        {error && (
          <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
        )}
        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: 10, background: '#111827', color: '#fff', borderRadius: 4 }}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'analytics', or 'users'

  useEffect(() => {
    if (api.isAuthenticated()) {
      setUser(api.getCurrentUser());
    }
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentView('dashboard');
  };

  if (!user) {
    return <Login onLoggedIn={setUser} />;
  }

  if (currentView === 'analytics') {
    return (
      <Analytics 
        user={user} 
        onLogout={handleLogout}
        onNavigateToDashboard={() => setCurrentView('dashboard')}
        onNavigateToUserManagement={() => setCurrentView('users')}
      />
    );
  }

  if (currentView === 'users') {
    return (
      <UserManagement 
        user={user} 
        onLogout={handleLogout}
        onNavigateToDashboard={() => setCurrentView('dashboard')}
        onNavigateToAnalytics={() => setCurrentView('analytics')}
      />
    );
  }

  return (
    <Dashboard 
      user={user} 
      onLogout={handleLogout}
      onNavigateToAnalytics={() => setCurrentView('analytics')}
      onNavigateToUserManagement={() => setCurrentView('users')}
    />
  );
}

export default App;