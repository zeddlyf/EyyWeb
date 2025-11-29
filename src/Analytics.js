import React, { useState, useEffect } from 'react';
import api from './API';

function Analytics({ user, onLogout, onNavigateToDashboard, onNavigateToUserManagement }) {
  const [analytics, setAnalytics] = useState({
    totalEarnings: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalRides: 0,
    completedRides: 0,
    averageRating: 0,
    earningsByDay: [],
    earningsByWeek: [],
    topEarningDays: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Get rides data
      const rides = await api.getRides();
      const payments = await api.getPayments();
      
      // Calculate analytics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate());
      
      // Filter rides by user role
      const userRides = rides.filter(ride => 
        (user.role === 'driver' && ride.driverId === user._id) ||
        (user.role === 'commuter' && ride.commuterId === user._id)
      );
      
      const userPayments = payments.filter(payment => 
        userRides.some(ride => ride._id === payment.rideId)
      );
      
      // Calculate earnings
      const totalEarnings = userPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      const todayEarnings = userPayments
        .filter(payment => new Date(payment.createdAt) >= today)
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      const weeklyEarnings = userPayments
        .filter(payment => new Date(payment.createdAt) >= weekAgo)
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      const monthlyEarnings = userPayments
        .filter(payment => new Date(payment.createdAt) >= monthAgo)
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      // Calculate ride statistics
      const completedRides = userRides.filter(ride => ride.status === 'completed').length;
      const totalRides = userRides.length;
      
      // Calculate average rating
      const ratings = userRides
        .filter(ride => ride.rating)
        .map(ride => ride.rating);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;
      
      // Generate earnings by day for the last 7 days
      const earningsByDay = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dayEarnings = userPayments
          .filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return paymentDate.toDateString() === date.toDateString();
          })
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        earningsByDay.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          earnings: dayEarnings
        });
      }
      
      // Generate earnings by week for the last 4 weeks
      const earningsByWeek = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekEarnings = userPayments
          .filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return paymentDate >= weekStart && paymentDate < weekEnd;
          })
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        earningsByWeek.push({
          week: `Week ${4 - i}`,
          earnings: weekEarnings
        });
      }
      
      // Find top earning days
      const topEarningDays = earningsByDay
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 3);
      
      setAnalytics({
        totalEarnings,
        todayEarnings,
        weeklyEarnings,
        monthlyEarnings,
        totalRides,
        completedRides,
        averageRating,
        earningsByDay,
        earningsByWeek,
        topEarningDays
      });
      
      setError('');
    } catch (err) {
      setError('Failed to load analytics: ' + err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user, timeRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const getEarningsData = () => {
    switch (timeRange) {
      case 'week':
        return analytics.earningsByDay;
      case 'month':
        return analytics.earningsByWeek;
      default:
        return analytics.earningsByDay;
    }
  };

  const getMaxEarnings = () => {
    const data = getEarningsData();
    return Math.max(...data.map(item => item.earnings), 1);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '400px' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #3B82F6',
                borderTop: '4px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <div>Loading analytics...</div>
            </div>
          </div>
        ) : error ? (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            textAlign: 'center'
          }}>
            {error}
          </div>
        ) : (
          <>
            {/* Time Range Selector */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {['week', 'month'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    style={{
                      padding: '8px 16px',
                      background: timeRange === range ? '#3B82F6' : '#e5e7eb',
                      color: timeRange === range ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Earnings Overview Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px', 
              marginBottom: '32px' 
            }}>
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '24px', marginRight: '12px' }}>💰</div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Earnings</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatCurrency(analytics.totalEarnings)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '24px', marginRight: '12px' }}>📅</div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Today's Earnings</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatCurrency(analytics.todayEarnings)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '24px', marginRight: '12px' }}>📊</div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>This Week</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatCurrency(analytics.weeklyEarnings)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '24px', marginRight: '12px' }}>📈</div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>This Month</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatCurrency(analytics.monthlyEarnings)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px', 
              marginBottom: '32px' 
            }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚗</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                  {analytics.totalRides}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Rides</div>
              </div>

              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                  {analytics.completedRides}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Completed</div>
              </div>

              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                  {analytics.averageRating.toFixed(1)}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg Rating</div>
              </div>
            </div>

            {/* Earnings Chart */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
              marginBottom: '32px'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
                Earnings Trend ({timeRange === 'week' ? 'Last 7 Days' : 'Last 4 Weeks'})
              </h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '12px', height: '200px' }}>
                {getEarningsData().map((item, index) => {
                  const height = (item.earnings / getMaxEarnings()) * 160;
                  return (
                    <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '100%',
                        height: `${height}px`,
                        background: '#3B82F6',
                        borderRadius: '4px 4px 0 0',
                        marginBottom: '8px',
                        minHeight: '4px'
                      }}></div>
                      <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                        {item.date || item.week}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                        {formatCurrency(item.earnings)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Earning Days */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>Top Earning Days</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analytics.topEarningDays.map((day, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        background: index === 0 ? '#fbbf24' : index === 1 ? '#d1d5db' : '#f59e0b',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'white',
                        marginRight: '12px'
                      }}>
                        {index + 1}
                      </div>
                      <span style={{ fontWeight: '500' }}>{day.date}</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#1f2937' }}>
                      {formatCurrency(day.earnings)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
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

export default Analytics;
