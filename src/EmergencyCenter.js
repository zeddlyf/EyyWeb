import React, { useEffect, useState } from 'react';
import api from './API';

export default function EmergencyCenter({ user, onLogout, onNavigateToDashboard }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', priority: 1 });
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState('');

  const load = async () => {
    try { const res = await api.getEmergencyContacts(); setItems(res.items || []); setError(''); } catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    try { await api.addEmergencyContact(form); setForm({ name: '', phone: '', priority: 1 }); load(); } catch (err) { setError(err.message); }
  };
  const update = async (id, patch) => { try { await api.updateEmergencyContact(id, patch); load(); } catch (err) { setError(err.message); } };
  const del = async (id) => { try { await api.deleteEmergencyContact(id); load(); } catch (err) { setError(err.message); } };
  const requestOtp = async () => { try { await api.requestEmergencyOtp(); setOtpRequested(true); } catch {} };
  const sendAlert = async () => { try { await api.sendEmergencyAlert({ type: 'manual', messageTemplate: 'Need assistance', require2fa: true, otp }); alert('Alert sent'); } catch (err) { setError(err.message); } };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1f2937', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>Emergency Contacts</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>Manage contacts and send alerts</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onNavigateToDashboard} style={{ padding: '6px 12px', background: '#3B82F6', color: 'white', borderRadius: 6 }}>🗺️ Map</button>
          <button onClick={onLogout} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', borderRadius: 6 }}>Logout</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: 24 }}>
        {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 6, border: '1px solid #fecaca', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0 }}>Add Contact</h3>
            <input placeholder='Name' value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', marginBottom: 8, padding: 8 }} />
            <input placeholder='Phone' value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', marginBottom: 8, padding: 8 }} />
            <input placeholder='Priority (1-5)' type='number' value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} style={{ width: '100%', marginBottom: 8, padding: 8 }} />
            <button onClick={add} style={{ padding: '8px 12px', background: '#111827', color: 'white', borderRadius: 6 }}>Add</button>
            <hr />
            <button onClick={requestOtp} style={{ padding: '8px 12px', background: '#0ea5e9', color: 'white', borderRadius: 6 }}>Request 2FA Code</button>
            {otpRequested && (
              <div style={{ marginTop: 8 }}>
                <input placeholder='Enter 2FA code' value={otp} onChange={e => setOtp(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: 8 }} />
                <button onClick={sendAlert} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', borderRadius: 6 }}>Send Emergency Alert</button>
              </div>
            )}
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0 }}>Contacts</h3>
            {items.length === 0 && <div>No contacts</div>}
            {items.map(c => (
              <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{c.phoneMasked} • Priority {c.priority} • {c.enabled ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => update(c._id, { enabled: !c.enabled })} style={{ padding: '6px 10px', background: '#10b981', color: 'white', borderRadius: 6 }}>{c.enabled ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => del(c._id)} style={{ padding: '6px 10px', background: '#ef4444', color: 'white', borderRadius: 6 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}