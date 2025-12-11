import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function Navbar({ user, currentView, onNavigate, onLogout, onGlobalSearch, onBrandClick }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navRef = useRef(null);
  const menuRef = useRef(null);
  const burgerRef = useRef(null);
  const [onlineCount, setOnlineCount] = useState(null);

  const items = useMemo(() => {
    const base = [
      {
        id: 'overview',
        label: 'Overview',
        children: [
          { id: 'dashboard', label: 'Map', view: 'dashboard' },
          { id: 'analytics', label: 'Analytics', view: 'analytics' }
        ]
      },
      {
        id: 'management',
        label: 'Management',
        children: [
          { id: 'users', label: 'Users', view: 'users' },
          { id: 'notifications', label: 'Notifications', view: 'notifications' }
        ]
      }
    ];
    if (user?.role === 'admin') {
      base.push({ id: 'admin', label: 'Admin', children: [{ id: 'feedbackAdmin', label: 'Moderate', view: 'feedbackAdmin' }] });
    }
    return base;
  }, [user]);

  const flatItems = useMemo(() => {
    const f = [];
    items.forEach(group => {
      group.children.forEach(child => f.push(child));
    });
    return f;
  }, [items]);

  const activeItemId = useMemo(() => flatItems.find(i => i.view === currentView)?.id || null, [flatItems, currentView]);

  useEffect(() => {
    const onKey = (e) => {
      if (!navRef.current) return;
      const interactive = navRef.current.querySelectorAll('[data-nav-focusable="true"]');
      if (interactive.length === 0) return;
      const idx = Array.from(interactive).indexOf(document.activeElement);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = interactive[(idx + 1 + interactive.length) % interactive.length];
        next && next.focus();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = interactive[(idx - 1 + interactive.length) % interactive.length];
        prev && prev.focus();
      }
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const handler = (e) => setOnlineCount(e.detail?.count ?? 0);
    window.addEventListener('dashboard:onlineDriversCount', handler);
    return () => window.removeEventListener('dashboard:onlineDriversCount', handler);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!navRef.current) return;
      if (!navRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (openMenu && menuRef.current) {
      const first = menuRef.current.querySelector('[role="menuitem"]');
      first && first.focus();
    }
  }, [openMenu]);

  

  const submitSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    onGlobalSearch && onGlobalSearch(q);
    setMobileOpen(false);
    setOpenMenu(null);
  };

  return (
    <nav
      ref={navRef}
      role="navigation"
      aria-label="Primary"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 3000,
        background: 'linear-gradient(90deg, #062c18 0%, #03160d 100%)',
        color: 'white',
        boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(6px)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-controls="burger-menu"
            aria-expanded={mobileOpen}
            onClick={() => {
              setMobileOpen(v => !v);
              setOpenMenu(null);
              setTimeout(() => {
                const first = burgerRef.current?.querySelector('[data-burger-item="true"]');
                first && first.focus();
              }, 0);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 6, background: 'transparent', border: '1px solid #374151', color: 'white' }}
          >
            {mobileOpen ? '✖' : '☰'}
          </button>
          <button
            onClick={onBrandClick}
            aria-haspopup="dialog"
            aria-controls="eyy-overlay"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <img src="/EyytrikeLogo2.png" alt="EyyTrike" style={{ width: 28, height: 28, borderRadius: 4 }} />
            <span style={{ fontWeight: 700 }}>EyyTrike</span>
          </button>
        </div>

        <div aria-label="Search" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 520, margin: '0 12px' }}>
          <input
            type="search"
            placeholder="Search users"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #374151', background: '#111827', color: 'white' }}
            aria-label="Search users"
          />
          <button onClick={submitSearch} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: 'var(--brand-primary)', color: 'white' }}>
            Search
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Signed in as</div>
          <div style={{ fontWeight: 600 }}>{user?.firstName} {user?.lastName}</div>
          {typeof onlineCount === 'number' && (
            <div aria-label="Online drivers" style={{ padding: '4px 8px', background: 'var(--brand-primary)', color: 'white', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>Online: {onlineCount}</div>
          )}
          <button onClick={onLogout} data-nav-focusable="true" style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6 }}>Logout</button>
        </div>
      </div>

      

      {mobileOpen && (
        <div
          id="burger-menu"
          ref={burgerRef}
          role="menu"
          aria-label="Main menu"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2500,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            padding: 12,
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            animation: 'fadeIn 120ms ease-out'
          }}
          onKeyDown={(e) => {
            const itemsEls = Array.from(burgerRef.current?.querySelectorAll('[data-burger-item="true"]') || []);
            const i = itemsEls.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = itemsEls[(i + 1 + itemsEls.length) % itemsEls.length];
              next && next.focus();
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const prev = itemsEls[(i - 1 + itemsEls.length) % itemsEls.length];
              prev && prev.focus();
            }
            if (e.key === 'Escape') setMobileOpen(false);
          }}
        >
          <div
            style={{
              width: 'min(480px, 94vw)',
              background: '#0b1220',
              border: '1px solid #1f2937',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
              animation: 'slideIn 160ms ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, color: 'white', letterSpacing: 0.2 }}>Quick Navigation</div>
              <button onClick={() => setMobileOpen(false)} style={{ padding: '6px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8 }}>Close</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', fontSize: 12 }}>Overview</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {items.find(g => g.id === 'overview')?.children.map(child => (
                  <button key={child.id} data-burger-item="true" role="menuitem" onClick={() => { onNavigate(child.view); setMobileOpen(false); }} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, background: activeItemId === child.id ? '#1f2937' : 'rgba(255,255,255,0.04)', color: 'white', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 120ms ease' }}>
                    <span>{child.id === 'dashboard' ? '🗺️' : child.id === 'analytics' ? '📊' : ''}</span>
                    <span>{child.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <div style={{ fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', fontSize: 12 }}>Management</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {items.find(g => g.id === 'management')?.children.map(child => (
                  <button key={child.id} data-burger-item="true" role="menuitem" onClick={() => { onNavigate(child.view); setMobileOpen(false); }} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, background: activeItemId === child.id ? '#1f2937' : 'rgba(255,255,255,0.04)', color: 'white', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 120ms ease' }}>
                    <span>{child.id === 'users' ? '👥' : child.id === 'notifications' ? '🔔' : ''}</span>
                    <span>{child.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {items.find(g => g.id === 'admin') && (
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                <div style={{ fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', fontSize: 12 }}>Admin</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {items.find(g => g.id === 'admin')?.children.map(child => (
                    <button key={child.id} data-burger-item="true" role="menuitem" onClick={() => { onNavigate(child.view); setMobileOpen(false); }} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, background: activeItemId === child.id ? '#1f2937' : 'rgba(255,255,255,0.04)', color: 'white', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 120ms ease' }}>
                      <span>🛡️</span>
                      <span>{child.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          nav .mobile-panel { display: block; }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateY(-4px) } to { transform: translateY(0) } }
      `}</style>
    </nav>
  );
}
