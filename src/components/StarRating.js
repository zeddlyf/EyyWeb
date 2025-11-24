import React from 'react';

export default function StarRating({ value = 0, onChange, readOnly = false, ariaLabel = 'Rating' }) {
  const handleClick = (idx, half) => {
    if (readOnly) return;
    const newVal = Math.max(1, Math.min(5, idx + (half ? 0.5 : 1)));
    onChange && onChange(newVal);
  };

  const renderStar = (i) => {
    const full = value >= i + 1;
    const half = !full && value >= i + 0.5;
    return (
      <div key={i} style={{ position: 'relative', width: 24, height: 24, cursor: readOnly ? 'default' : 'pointer' }}>
        <span aria-hidden style={{ color: full ? '#fbbf24' : '#d1d5db', fontSize: 22 }}>★</span>
        {half && (
          <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden', color: '#fbbf24', fontSize: 22 }}>★</span>
        )}
        {!readOnly && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            <div role="button" aria-label={`Rate ${i + 0.5} stars`} tabIndex={0} style={{ flex: 1 }} onClick={() => handleClick(i, true)} onKeyDown={(e) => e.key === 'Enter' && handleClick(i, true)} />
            <div role="button" aria-label={`Rate ${i + 1} stars`} tabIndex={0} style={{ flex: 1 }} onClick={() => handleClick(i, false)} onKeyDown={(e) => e.key === 'Enter' && handleClick(i, false)} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div aria-label={ariaLabel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[0,1,2,3,4].map(renderStar)}
      {!readOnly && (
        <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>{value ? value.toFixed(1) : ''}</span>
      )}
    </div>
  );
}