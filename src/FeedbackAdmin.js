import React, { useEffect, useState, useCallback } from 'react';
import api from './API';

export default function FeedbackAdmin({ user, onLogout, onNavigateToDashboard }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selectedDriverId] = useState('');

  const normalizedStatus = status === 'all' ? '' : status;

  const load = useCallback(async () => {
    try {
      const res = await api.listFeedback(selectedDriverId || undefined, { status: normalizedStatus, sort, page: 1, limit: 50 });

      // Handle various backend response shapes (array or { items })
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
      setError('Failed to load feedback: ' + err.message);
    }
  }, [normalizedStatus, sort, selectedDriverId]);

  useEffect(() => { load(); }, [load]);

  const approve = async (rideId) => {
    try {
      await api.adminApproveFeedback(rideId);
      setMessage('Feedback approved');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };
  const reject = async (rideId) => {
    try {
      await api.adminRejectFeedback(rideId);
      setMessage('Feedback rejected');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const exportCsv = () => {
    const headers = ['RideID','Driver','Passenger','Rating','Status','CreatedAt','Feedback'];
    const rows = items.map(it => [
      it._id,
      `${it.driver?.firstName || ''} ${it.driver?.lastName || ''}`.trim(),
      `${it.passenger?.firstName || ''} ${it.passenger?.lastName || ''}`.trim(),
      it.rating?.toFixed(1) || '',
      it.feedbackStatus || '',
      new Date(it.createdAt).toISOString(),
      (it.feedback || '').replace(/\n/g,' ')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <div style={{ flex: 1, padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)} style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}>
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)} style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest</option>
            <option value="lowest">Lowest</option>
          </select>
          <button onClick={exportCsv} style={{ padding: '6px 12px', background: '#0ea5e9', color: 'white', borderRadius: 6 }}>Export CSV</button>
        </div>
        {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 6, border: '1px solid #fecaca', marginBottom: 12 }}>{error}</div>}
        {message && <div style={{ background: '#ecfdf5', color: '#065f46', padding: 10, borderRadius: 6, border: '1px solid #a7f3d0', marginBottom: 12 }}>{message}</div>}
        {items.length === 0 && !error && (
          <div style={{ background: '#eef2ff', color: '#4338ca', padding: 12, borderRadius: 8, border: '1px solid #c7d2fe' }}>
            No feedback to moderate for this filter.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {items.map((it) => (
            <div key={it._id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div style={{ marginBottom: 8 }}>⭐ {it.rating?.toFixed(1)} · {new Date(it.createdAt).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Driver: {it.driver?.firstName} {it.driver?.lastName}</div>
              <div style={{ color: '#374151', marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: it.feedback }} />
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Passenger: {it.passenger?.firstName} {it.passenger?.lastName}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => approve(it._id)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', borderRadius: 6 }}>Approve</button>
                <button onClick={() => reject(it._id)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', borderRadius: 6 }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
