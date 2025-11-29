import React, { useEffect, useState } from 'react';
import api from './API';
import { io } from 'socket.io-client';

export default function EmergencyCenter({ user, onLogout, onNavigateToDashboard }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', priority: 1 });
  const [details, setDetails] = useState(null);
  const [template, setTemplate] = useState('ACCIDENT: Immediate assistance required');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [delivery, setDelivery] = useState([]);
  const [accidentBanner, setAccidentBanner] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const load = async (driverId) => {
    try {
      const res = await api.listContactsV1({ page: 1, limit: 50 });
      setItems((res.items || []).map(c => ({ _id: c.id, name: c.name, phoneMasked: c.phone, priority: c.metadata?.priority || 1, enabled: c.metadata?.enabled !== false })));
      if (driverId) {
        const d = await api.getEmergencyDriverDetails(driverId);
        setDetails(d);
      } else {
        setDetails(null);
      }
      setError('');
    } catch (err) { setError(err.message); }
  };
  useEffect(() => {
    (async () => {
      try {
        const ds = await api.getUsersByRole('driver');
        setDrivers(ds);
      } catch {}
    })();
  }, []);
  useEffect(() => { load(selectedDriverId); }, [selectedDriverId]);

  useEffect(() => {
    const token = api.getToken();
    const socketUrl = (process.env.REACT_APP_SOCKET_URL || (api.baseURL || '').replace(/\/?api$/, '')) || window.location.origin;
    const s = io(socketUrl, { auth: { token } });
    s.emit('joinUserRoom', user._id);
    const handler = (payload) => { setAccidentBanner({ ts: new Date(), payload }); };
    s.on('accidentDetected', handler);
    return () => { s.off('accidentDetected', handler); s.disconnect(); };
  }, [user._id]);

  const add = async () => {
    try { await api.createContactV1({ userType: 'driver', name: form.name, phone: form.phone, metadata: { priority: form.priority, enabled: true } }); setForm({ name: '', phone: '', priority: 1 }); load(); } catch (err) { setError(err.message); }
  };
  const update = async (id, patch) => { try { await api.updateContactV1(id, { metadata: patch }); load(); } catch (err) { setError(err.message); } };
  const del = async (id) => { try { await api.deleteContactV1(id); load(); } catch (err) { setError(err.message); } };
  const sendAlert = async () => {
    try {
      setSending(true); setDelivery([]);
      const msg = customMessage.trim() || template;
      const res = await api.sendEmergencyAlert({ type: accidentBanner ? 'auto' : 'manual', messageTemplate: msg, bypass2fa: true, driverId: selectedDriverId });
      setDelivery(res.recipients || []);
      alert('Alert sent');
      setAccidentBanner(null);
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: 24 }}>
        {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 6, border: '1px solid #fecaca', marginBottom: 12 }}>{error}</div>}
        {accidentBanner && (
          <div role="alert" aria-live="assertive" style={{ background: '#ffedd5', color: '#9a3412', padding: 12, borderRadius: 8, border: '1px solid #fed7aa', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Accident detected</strong> • {new Date(accidentBanner.ts).toLocaleString()}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAccidentBanner(null)} style={{ padding: '10px 14px', background: '#374151', color: 'white', borderRadius: 8 }}>Dismiss</button>
              <button onClick={sendAlert} style={{ padding: '10px 14px', background: '#ef4444', color: 'white', borderRadius: 8 }}>Send Emergency Now</button>
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 2fr', gap: 16 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0 }}>Add Contact</h3>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Select Driver</label>
              <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} style={{ width: '100%', padding: 8 }}>
                <option value=''>— Select driver —</option>
                {drivers.map(d => (
                  <option key={d._id || d.id} value={d._id || d.id}>{d.fullName || d.name || d.email}</option>
                ))}
              </select>
            </div>
            <input placeholder='Name' value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', marginBottom: 8, padding: 8 }} />
            <input placeholder='Phone' value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', marginBottom: 8, padding: 8 }} />
            <input placeholder='Priority (1-5)' type='number' value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} style={{ width: '100%', marginBottom: 8, padding: 8 }} />
            <button onClick={add} style={{ padding: '8px 12px', background: '#111827', color: 'white', borderRadius: 6 }}>Add</button>
            <hr />
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <select value={template} onChange={e => setTemplate(e.target.value)} style={{ padding: 8 }} aria-label='Template'>
                  <option>ACCIDENT: Immediate assistance required</option>
                  <option>MEDICAL: Driver needs urgent help</option>
                  <option>BREAKDOWN: Vehicle disabled</option>
                </select>
                <textarea placeholder='Custom message (optional)' value={customMessage} onChange={e => setCustomMessage(e.target.value)} style={{ width: '100%', minHeight: 80, padding: 8 }} />
                <button onClick={sendAlert} disabled={sending || !selectedDriverId} style={{ padding: '12px 16px', background: '#ef4444', color: 'white', borderRadius: 10, fontSize: 18 }}>Send Emergency Alert</button>
              </div>
            </div>
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0 }}>Contacts</h3>
            {details && (
              <div style={{ marginBottom: 12, padding: 8, border: '1px dashed #e5e7eb', borderRadius: 8 }}>
                <div><strong>Driver:</strong> {details.driverName}</div>
                <div><strong>Primary:</strong> {details.primaryContact}</div>
                <div><strong>Secondary:</strong> {details.secondaryContact || '—'}</div>
                <div><strong>Last updated:</strong> {new Date(details.lastUpdated).toLocaleString()}</div>
              </div>
            )}
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
            {delivery.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ margin: 0 }}>Delivery</h4>
                {delivery.map((r, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: '#374151', paddingTop: 4 }}>{r.name}: {r.phoneMasked} • {r.status}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
