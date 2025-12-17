import React, { useEffect, useState, useCallback } from 'react';
import api from './API';
import { io } from 'socket.io-client';

function groupByDate(items) {
  const map = {};
  for (const it of items) {
    const d = new Date(it.createdAt).toDateString();
    if (!map[d]) map[d] = [];
    map[d].push(it);
  }
  return map;
}

function iconForType(t) {
  if (t === 'system') return '🛠️';
  if (t === 'message') return '💬';
  if (t === 'admin') return '📣';
  if (t === 'ride') return '🚗';
  if (t === 'payment') return '💳';
  return '🔔';
}

export default function NotificationCenter({ user, onLogout, onNavigateToDashboard }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [unreadOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getNotifications({ unread: unreadOnly });

      // Accept multiple response shapes (array, { items }, { data })
      const nextItems = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setItems(nextItems);
      setError('');
    } catch (err) {
      setItems([]);
      setError('Failed to load notifications: ' + err.message);
    }
  }, [unreadOnly]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const token = api.getToken();
    const socket = io(api.baseURL.replace('/api',''), { transports: ['websocket'], auth: token ? { token } : undefined });
    socket.on('notification', (note) => {
      setItems(prev => [note, ...prev]);
    });
    return () => socket.disconnect();
  }, []);

  const markRead = async (id) => {
    try { await api.markNotificationRead(id); setItems(prev => prev.map(i => i._id === id ? { ...i, read: true } : i)); } catch {}
  };

  const grouped = groupByDate(items);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 6, border: '1px solid #fecaca', marginBottom: 12 }}>{error}</div>}
        {Object.keys(grouped).length === 0 && !error && (
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            No notifications yet.
          </div>
        )}
        {Object.entries(grouped).map(([date, list]) => (
          <div key={date} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, color: '#374151', fontWeight: '600' }}>{date}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {list.map(item => (
                <div key={item._id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, opacity: item.read ? 0.8 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 20 }}>{iconForType(item.type)}</div>
                    <div style={{ fontWeight: '600' }}>{item.title}</div>
                  </div>
                  <div style={{ marginTop: 6, color: '#374151' }}>{item.body}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {!item.read && <button onClick={() => markRead(item._id)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', borderRadius: 6 }}>Mark read</button>}
                    {item.type === 'message' && <button onClick={() => alert('Open conversation: ' + (item.data?.conversationId || ''))} style={{ padding: '6px 12px', background: '#0ea5e9', color: 'white', borderRadius: 6 }}>Reply</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
