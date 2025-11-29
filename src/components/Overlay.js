import React, { useEffect, useRef } from 'react';

export default function Overlay({ open, onClose, title = 'Overlay', children, id = 'eyy-overlay' }) {
  const backdropRef = useRef(null);
  const closeBtnRef = useRef(null);
  const lastFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      lastFocusRef.current = document.activeElement;
      setTimeout(() => closeBtnRef.current && closeBtnRef.current.focus(), 0);
    } else {
      if (lastFocusRef.current && lastFocusRef.current.focus) {
        lastFocusRef.current.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusables = backdropRef.current?.querySelectorAll('[data-overlay-focus="true"]');
        if (!focusables || focusables.length === 0) return;
        const list = Array.from(focusables);
        const idx = list.indexOf(document.activeElement);
        if (e.shiftKey) {
          e.preventDefault();
          const prev = list[(idx - 1 + list.length) % list.length];
          prev && prev.focus();
        } else {
          e.preventDefault();
          const next = list[(idx + 1) % list.length];
          next && next.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id={id}
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
      aria-describedby="overlay-desc"
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(17,24,39,0.6)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'overlayFade 150ms ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0b1220',
          color: 'white',
          border: '1px solid #374151',
          borderRadius: 12,
          width: 'min(680px, 92vw)',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
          transform: 'translateY(-4px)',
          animation: 'overlaySlide 150ms ease-out forwards'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
          <h2 id="overlay-title" style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button
            ref={closeBtnRef}
            data-overlay-focus="true"
            aria-label="Close overlay"
            onClick={onClose}
            autoFocus
            style={{ padding: '6px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6 }}
          >
            ×
          </button>
        </div>
        <div id="overlay-desc" style={{ padding: 16 }}>
          {children || (
            <div>
              <p style={{ margin: 0 }}>Search or navigation help.</p>
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button data-overlay-focus="true" style={{ padding: '8px 12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6 }} onClick={onClose}>Close</button>
            <a data-overlay-focus="true" href="#" onClick={(e) => e.preventDefault()} style={{ padding: '8px 12px', background: '#10b981', color: 'white', borderRadius: 6, textDecoration: 'none' }}>Learn more</a>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes overlayFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes overlaySlide { from { transform: translateY(-6px) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
}