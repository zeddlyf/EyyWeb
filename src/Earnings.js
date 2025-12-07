import React, { useState, useEffect, useCallback } from 'react';
import api from './API';

function Earnings({ user, onLogout, onNavigateToDashboard, onNavigateToAnalytics, onNavigateToUserManagement }) {
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    platformEarnings: 0,
    driverTotalEarnings: 0,
    totalTransactions: 0,
    earningsByPeriod: [],
    driverEarnings: [],
    payments: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('day'); // day, week, month
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Fetch earnings data
  const fetchEarnings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        groupBy: timeRange,
      });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const data = await api.makeRequest(`/payments/admin/earnings?${params.toString()}`);
      setEarnings(data);
    } catch (err) {
      setError('Failed to load earnings: ' + err.message);
      console.error('Error fetching earnings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchEarnings();
    }
  }, [fetchEarnings, startDate, endDate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#1f2937' }}>Earnings Analytics</h1>
        </div>

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
              <div>Loading earnings data...</div>
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
            {/* Date Range and Group By Controls */}
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                    Group By
                  </label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: 'white'
                    }}
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
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
                      {formatCurrency(earnings.totalEarnings)}
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
                  <div style={{ fontSize: '24px', marginRight: '12px' }}>🏢</div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Platform Earnings</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatCurrency(earnings.platformEarnings)}
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
                  <div style={{ fontSize: '24px', marginRight: '12px' }}>🚗</div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Driver Earnings</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatCurrency(earnings.driverTotalEarnings)}
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
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Transactions</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                      {earnings.totalTransactions}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Chart */}
            {earnings.earningsByPeriod && earnings.earningsByPeriod.length > 0 && (
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                marginBottom: '32px'
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
                  Earnings Trend (Grouped by {timeRange})
                </h3>
                <div style={{ display: 'flex', alignItems: 'end', gap: '12px', height: '200px', overflowX: 'auto' }}>
                  {earnings.earningsByPeriod.map((item, index) => {
                    const maxEarnings = Math.max(...earnings.earningsByPeriod.map(e => e.total), 1);
                    const height = (item.total / maxEarnings) * 160;
                    return (
                      <div key={index} style={{ flex: 1, minWidth: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: '100%',
                          height: `${height}px`,
                          background: '#3B82F6',
                          borderRadius: '4px 4px 0 0',
                          marginBottom: '8px',
                          minHeight: '4px'
                        }}></div>
                        <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center', wordBreak: 'break-word' }}>
                          {formatDate(item.period)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Earning Drivers */}
            {earnings.driverEarnings && earnings.driverEarnings.length > 0 && (
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                marginBottom: '32px'
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>Top Earning Drivers</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Rank</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Driver</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Total Earnings</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Rides</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.driverEarnings.slice(0, 10).map((driver, index) => (
                        <tr key={driver.driverId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', color: '#1f2937' }}>{index + 1}</td>
                          <td style={{ padding: '12px', color: '#1f2937', fontWeight: '500' }}>{driver.driverName}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: '600' }}>
                            {formatCurrency(driver.total)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#6b7280' }}>{driver.rides}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Payments */}
            {earnings.payments && earnings.payments.length > 0 && (
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>Recent Payments</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>User</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Method</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Amount</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.payments.map((payment) => (
                        <tr key={payment._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', color: '#1f2937', fontSize: '14px' }}>
                            {formatDate(payment.date || payment.createdAt)}
                          </td>
                          <td style={{ padding: '12px', color: '#1f2937', fontSize: '14px' }}>
                            {payment.user ? `${payment.user.firstName} ${payment.user.lastName}` : 'N/A'}
                          </td>
                          <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px', textTransform: 'capitalize' }}>
                            {payment.method || 'N/A'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: '600', fontSize: '14px' }}>
                            {formatCurrency(payment.amount)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: payment.status === 'PAID' ? '#d1fae5' : payment.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                              color: payment.status === 'PAID' ? '#065f46' : payment.status === 'PENDING' ? '#92400e' : '#991b1b'
                            }}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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

export default Earnings;

