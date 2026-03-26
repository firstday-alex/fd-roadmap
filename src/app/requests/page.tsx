'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface Request {
  id: string;
  name: string;
  pillar: string;
  month: string;
  priority: string;
  submittedBy: string;
  notes: string;
  submittedAt: string;
}

const PILLAR_DESC: Record<string, string> = { CVR: 'Conversion Rate', AOV: 'Avg Order Value', LTV: 'Subscriber Lifetime Value' };

function pillarClass(p: string) { return p === 'CVR' ? 'cvr' : p === 'AOV' ? 'aov' : 'ltv'; }
function priorityClass(p: string) { return p === 'High' ? 'high' : p === 'Medium' ? 'med' : 'low'; }

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RequestsPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchRequests = useCallback(async (pw: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/requests', {
        headers: { 'x-approver-password': pw },
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setError('Invalid password. Please try again.');
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load');
      }
      const data = await res.json();
      setRequests(data);
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    await fetchRequests(password);
  };

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve');
      }
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this request? It will be permanently removed.')) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/requests/${id}/approve`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject');
      }
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  // --- Password gate ---
  if (!authenticated) {
    return (
      <div className="request-page">
        <div className="request-card" style={{ maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <Link href="/" className="btn btn-ghost btn-sm">← Roadmap</Link>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 0 4px' }}>Review Requests</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            Enter the approver password to view and manage pending requests.
          </p>

          {error && (
            <div className="error-banner" style={{ marginBottom: 16 }}>
              <span>&#9888;</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Approver Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Verifying…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Authenticated view ---
  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <h1>Pending Requests</h1>
          <p>{requests.length} request{requests.length !== 1 ? 's' : ''} awaiting review</p>
        </div>
        <div className="header-right">
          <Link href="/" className="btn btn-ghost btn-sm">← Roadmap</Link>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchRequests(password)}>Refresh</button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>&#9888;</span> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>&#9745;</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 4 }}>All clear</p>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>No pending requests to review.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(req => (
            <div key={req.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>{req.name}</div>
                  <div className="card-meta" style={{ marginBottom: 8 }}>
                    <span className={`pill pill-${pillarClass(req.pillar)}`}>{req.pillar}</span>
                    <span className={`pill pill-${priorityClass(req.priority)}`}>{req.priority}</span>
                    <span className="pill pill-planned">{req.month}</span>
                  </div>
                  {req.notes && (
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 8 }}>{req.notes}</p>
                  )}
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    Submitted by <strong style={{ color: '#6b7280' }}>{req.submittedBy}</strong> · {timeAgo(req.submittedAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={actionId === req.id}
                    onClick={() => handleApprove(req.id)}
                    style={{ minWidth: 80, justifyContent: 'center' }}
                  >
                    {actionId === req.id ? '…' : 'Approve'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={actionId === req.id}
                    onClick={() => handleReject(req.id)}
                    style={{ minWidth: 80, justifyContent: 'center' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
