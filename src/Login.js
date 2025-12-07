import React, { useEffect, useMemo, useState } from 'react';
import api from './API';

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');

  useEffect(() => {
    const handler = () => setSessionMessage('Your session has expired. Please login again.');
    window.addEventListener('api:sessionExpired', handler);
    return () => window.removeEventListener('api:sessionExpired', handler);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSessionMessage('');
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
    <div className="login-root" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      overflow: 'hidden', 
      background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <style>{`
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
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .login-card { 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          animation: slideUp 0.4s ease-out;
        }
        .login-field { 
          transition: all 0.2s ease;
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
        }
        .login-field:focus { 
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
          background: white;
        }
        .login-btn { 
          transition: all 0.2s ease;
        }
        @media (prefers-reduced-motion: no-preference) {
          .login-btn:hover:not(:disabled) { 
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
          }
          .login-btn:active:not(:disabled) {
            transform: translateY(0);
          }
        }
        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }
        .input-with-icon {
          padding-left: 44px !important;
        }
      `}</style>

      {/* Background decorative elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        animation: 'shimmer 20s linear infinite',
        pointerEvents: 'none'
      }}></div>

      <div style={{ 
        width: '100%', 
        maxWidth: 440, 
        position: 'relative',
        zIndex: 1
      }}>
        <div className="login-card" role="form" aria-label="Login" style={{ 
          width: '100%', 
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 24,
          padding: 0,
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          {/* Header with gradient */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '32px 32px 24px 32px',
            textAlign: 'center'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 12, 
              marginBottom: 8 
            }}>
              <img 
                src={process.env.PUBLIC_URL + '/EyytrikeLogo2.png'} 
                alt="EyyTrike Logo" 
                style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '4px'
                }} 
              />
            </div>
            <h1 style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              color: 'white',
              margin: '0 0 8px 0'
            }}>
              Welcome Back
            </h1>
            <p style={{ 
              fontSize: 14, 
              color: 'rgba(255, 255, 255, 0.9)',
              margin: 0
            }}>
              Sign in to continue to EyyTrike
            </p>
          </div>

          <div style={{ padding: '32px' }}>
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Email Field */}
                <div>
                  <label 
                    htmlFor="email" 
                    style={{ 
                      display: 'block', 
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: '#374151', 
                      marginBottom: 8 
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span className="input-icon" style={{ fontSize: '18px' }}>📧</span>
                    <input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      className="login-field input-with-icon" 
                      placeholder="Enter your email"
                      style={{ 
                        padding: '12px 14px 12px 44px', 
                        border: '2px solid #e5e7eb', 
                        borderRadius: 12, 
                        fontSize: 14,
                        background: '#fafafa',
                        width: '100%',
                        boxSizing: 'border-box'
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
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label 
                      htmlFor="password" 
                      style={{ 
                        display: 'block', 
                        fontSize: 13, 
                        fontWeight: 600, 
                        color: '#374151'
                      }}
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        // Navigate to forgot password if implemented
                        alert('Forgot password feature coming soon!');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#10b981',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span className="input-icon" style={{ fontSize: '18px' }}>🔒</span>
                    <input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      className="login-field input-with-icon" 
                      placeholder="Enter your password"
                      style={{ 
                        padding: '12px 44px 12px 44px', 
                        border: '2px solid #e5e7eb', 
                        borderRadius: 12, 
                        fontSize: 14,
                        background: '#fafafa',
                        width: '100%',
                        boxSizing: 'border-box'
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
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(v => !v)} 
                      aria-label={showPassword ? 'Hide password' : 'Show password'} 
                      title={showPassword ? 'Hide password' : 'Show password'} 
                      style={{ 
                        position: 'absolute', 
                        right: 12, 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'none', 
                        border: 'none', 
                        color: '#6b7280', 
                        cursor: 'pointer', 
                        fontSize: 18, 
                        padding: 4, 
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.color = '#374151';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.color = '#6b7280';
                      }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              
                {/* Error Messages */}
                {sessionMessage && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    color: '#991b1b', 
                    border: '1px solid #fca5a5', 
                    padding: '12px 16px', 
                    borderRadius: 12,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: 500
                  }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <span>{sessionMessage}</span>
                  </div>
                )}
                {error && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    color: '#991b1b', 
                    border: '1px solid #fca5a5', 
                    padding: '12px 16px', 
                    borderRadius: 12,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: 500
                  }}>
                    <span style={{ fontSize: '18px' }}>❌</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="login-btn" 
                  style={{ 
                    width: '100%', 
                    padding: '14px 20px', 
                    background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 12, 
                    fontSize: 15, 
                    fontWeight: 600,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: isLoading ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid white',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      Sign In
                    </>
                  )}
                </button>

              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Additional CSS for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Login;
