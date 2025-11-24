import React from 'react';

export default function AddressForm({ value, onChange }) {
  const v = value || { street: '', barangay: '', city: '', province: '', postalCode: '' };
  const handle = (field, val) => onChange({ ...v, [field]: val });
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>House/Unit, Block & Street *</label>
        <input
          aria-label="House/Unit, Block & Street"
          type="text"
          value={v.street}
          onChange={(e) => handle('street', e.target.value)}
          placeholder="Unit 3-B, Block 9, Panganiban Drive"
          required
          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Barangay *</label>
        <input
          aria-label="Barangay"
          type="text"
          value={v.barangay}
          onChange={(e) => handle('barangay', e.target.value)}
          required
          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>City / Municipality *</label>
        <input
          aria-label="City / Municipality"
          type="text"
          value={v.city}
          onChange={(e) => handle('city', e.target.value)}
          required
          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Province *</label>
        <input
          aria-label="Province"
          type="text"
          value={v.province}
          onChange={(e) => handle('province', e.target.value)}
          required
          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>ZIP Code (optional)</label>
        <input
          aria-label="ZIP Code"
          type="text"
          value={v.postalCode}
          onChange={(e) => handle('postalCode', e.target.value)}
          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
        />
      </div>
    </>
  );
}