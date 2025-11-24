import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from './API';

function Chat({ rideId, conversationId }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    const s = io(api.baseURL.replace('/api',''), { transports: ['websocket'], auth: token ? { token } : undefined });
    setSocket(s);
    s.on('connect', () => {
      s.emit('joinConversationRoom', conversationId);
    });
    s.on('messageReceived', (payload) => {
      if (payload.conversationId === conversationId) {
        setMessages(prev => [...prev, payload.message]);
      }
    });
    s.on('userTyping', (data) => setTyping(!!data.isTyping));
    return () => { s.emit('leaveConversationRoom', conversationId); s.disconnect(); };
  }, [conversationId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      const res = await api.makeRequest('/messaging/send', { method: 'POST', body: JSON.stringify({ rideId, message: text }) });
      if (res && res.success) setMessages(prev => [...prev, res.message]);
    } catch {}
  };

  const quickReplies = ['On my way', 'Running late', 'Here'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 'bold' }}>Ride Chat</div>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#28a745' }}></div>
      </div>
      <div style={{ flex: 1, padding: 12, overflow: 'auto' }}>
        {messages.map(m => (
          <div key={m._id} style={{ background: '#f1f5f9', padding: 8, borderRadius: 8, marginBottom: 8 }}>{m.message}</div>
        ))}
        {typing && <div style={{ color: '#6b7280' }}>Typing…</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: 12 }}>
        {quickReplies.map(q => (
          <button key={q} onClick={() => setInput(q)} style={{ padding: '6px 10px', background: '#eee', borderRadius: 16, border: 'none' }}>{q}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12 }}>
        <input aria-label="Message input" value={input} onChange={(e) => { setInput(e.target.value); socket && socket.emit('typingStart', { conversationId }); }} placeholder="Type a message" style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 20, padding: '8px 12px' }} />
        <button onClick={sendMessage} style={{ padding: '8px 12px', background: '#111827', color: '#fff', borderRadius: 20 }}>Send</button>
      </div>
    </div>
  );
}

export default Chat;