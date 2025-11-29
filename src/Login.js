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

  useEffect(() => {}, []);

  const palette = useMemo(() => ({
    primary: 'var(--brand-primary)',
    secondary: 'var(--brand-secondary)',
    dark: 'var(--text-primary)',
    light: 'var(--surface)',
    border: 'var(--border)'
  }), []);

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
    <div className="login-root" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr', background: 'var(--surface-muted)' }}>
      <style>{`
        .login-card { box-shadow: 0 12px 24px -8px rgba(0,0,0,0.12); border: 1px solid var(--border); overflow: hidden; }
        .login-field { transition: box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease; box-sizing: border-box; width: 100%; max-width: 100%; }
        .login-field:focus { outline: none; border-color: var(--brand-accent); box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.35); }
        .login-btn { transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, opacity 160ms ease; }
        @media (prefers-reduced-motion: no-preference) {
          .login-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(0,0,0,0.18) }
        }
        .login-grid { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 768px) { .login-grid { grid-template-columns: 1fr } }
        @media (min-width: 1024px) { .login-grid { grid-template-columns: 1fr } }
      `}</style>

      <div className="login-grid" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div className="login-card" role="form" aria-label="Login" style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <img src={process.env.PUBLIC_URL + '/EyytrikeLogo2.png'} alt="Brand" style={{ width: 36, height: 36, borderRadius: 8 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: palette.dark }}>Sign in to EyyTrike</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use your account credentials</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="login-field" style={{ padding: '10px 12px', border: '1px solid var(--brand-border)', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="login-field" style={{ padding: '10px 12px', paddingRight: '44px', border: '1px solid var(--brand-border)', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} className="login-btn" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'white', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 16, padding: 4, borderRadius: 8 }}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              
                {sessionMessage && (
                  <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: 10 }}>{sessionMessage}</div>
                )}
                {error && (
                  <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: 10 }}>{error}</div>
                )}
                <button type="submit" disabled={isLoading} className="login-btn" style={{ width: '100%', padding: '12px 14px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </button>
              
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
