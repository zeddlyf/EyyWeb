import React, { useEffect, useState } from 'react';
import api from './API';
import Dashboard from './Dashboard';
import Analytics from './Analytics';
import UserManagement from './UserManagement';
import Register from './Register';
import AdminRegister from './AdminRegister';
import Navbar from './components/Navbar';
import Overlay from './components/Overlay';
import Login from './Login';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'adminRegister', 'dashboard', 'analytics', 'users', 'feedbackAdmin', 'notifications'
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    if (api.isAuthenticated()) {
      setUser(api.getCurrentUser());
      setCurrentView('dashboard');
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      api.logout();
      setUser(null);
      setCurrentView('login');
    };
    window.addEventListener('api:sessionExpired', handler);
    return () => window.removeEventListener('api:sessionExpired', handler);
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentView('login');
  };

  const handleRegistered = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  if (!user) {
    if (currentView === 'register') {
      return (
        <Register 
          onRegistered={handleRegistered}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      );
    }
    
    if (currentView === 'adminRegister') {
      return (
        <AdminRegister 
          onRegistered={handleRegistered}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      );
    }
    
    return (
      <Login 
        onLoggedIn={setUser}
        onSwitchToRegister={() => setCurrentView('register')}
        onSwitchToAdminRegister={() => setCurrentView('adminRegister')}
      />
    );
  }

  const renderView = () => {
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
          initialSearch={globalSearchQuery}
        />
      );
    }

    if (currentView === 'feedbackAdmin') {
      const FeedbackAdmin = require('./FeedbackAdmin').default;
      return (
        <FeedbackAdmin
          user={user}
          onLogout={handleLogout}
          onNavigateToDashboard={() => setCurrentView('dashboard')}
        />
      );
    }

    if (currentView === 'notifications') {
      const NotificationCenter = require('./NotificationCenter').default;
      return (
        <NotificationCenter
          user={user}
          onLogout={handleLogout}
          onNavigateToDashboard={() => setCurrentView('dashboard')}
        />
      );
    }


    

    return (
      <Dashboard 
        user={user} 
        onLogout={handleLogout}
        onNavigateToAnalytics={() => setCurrentView('analytics')}
        onNavigateToUserManagement={() => setCurrentView('users')}
        onNavigateToFeedbackAdmin={() => setCurrentView('feedbackAdmin')}
        onNavigateToNotifications={() => setCurrentView('notifications')}
      />
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        user={user}
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onLogout={handleLogout}
        onGlobalSearch={(q) => { setGlobalSearchQuery(q); setCurrentView('users'); }}
        onBrandClick={() => { setCurrentView('dashboard'); setOverlayOpen(false); }}
      />
      <div style={{ flex: 1, position: 'relative' }}>
        <Overlay
          open={overlayOpen}
          onClose={() => setOverlayOpen(false)}
          title="Quick Actions"
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <button data-overlay-focus="true" style={{ padding: '8px 12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6 }} onClick={() => { setCurrentView('analytics'); setOverlayOpen(false); }}>Go to Analytics</button>
            <button data-overlay-focus="true" style={{ padding: '8px 12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 6 }} onClick={() => { setCurrentView('users'); setOverlayOpen(false); }}>Manage Users</button>
          </div>
        </Overlay>
        {renderView()}
      </div>
    </div>
  );
}

export default App;
