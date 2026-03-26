'use client';

import { useState } from 'react';
import Link from 'next/link';

const PILLARS = ['CVR', 'AOV', 'LTV'];
const MONTHS = ['April', 'May', 'June'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const PILLAR_DESC: Record<string, string> = { CVR: 'Conversion Rate', AOV: 'Avg Order Value', LTV: 'Subscriber Lifetime Value' };

export default function RequestPage() {
  const [form, setForm] = useState({
    name: '', pillar: 'CVR', month: 'April', priority: 'Medium', submittedBy: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.submittedBy.trim()) {
      setError('Please fill in the initiative name and your name.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="request-page">
        <div className="request-card">
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Request Submitted</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
              Your initiative request has been submitted for review. An approver will review it and add it to the roadmap if approved.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => { setSubmitted(false); setForm({ name: '', pillar: 'CVR', month: 'April', priority: 'Medium', submittedBy: form.submittedBy, notes: '' }); }}>Submit Another</button>
              <Link href="/" className="btn btn-primary">View Roadmap</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="request-page">
      <div className="request-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Link href="/" className="btn btn-ghost btn-sm">← Roadmap</Link>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 0 4px' }}>Request an Initiative</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
          Submit a new initiative idea for the Q2 roadmap. An approver will review your request before it gets added.
        </p>

        {error && (
          <div className="error-banner" style={{ marginBottom: 16 }}>
            <span>&#9888;</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Initiative Name *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Add size guide to PDP" autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Your Name *</label>
            <input className="form-input" value={form.submittedBy} onChange={e => set('submittedBy', e.target.value)} placeholder="e.g. Alex T." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pillar</label>
              <select className="form-select" value={form.pillar} onChange={e => set('pillar', e.target.value)}>
                {PILLARS.map(p => <option key={p} value={p}>{p} — {PILLAR_DESC[p]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Suggested Month</label>
              <select className="form-select" value={form.month} onChange={e => set('month', e.target.value)}>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Priority Suggestion</label>
            <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Rationale</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Why should this be on the roadmap? What's the expected impact?" />
          </div>

          <div className="modal-footer" style={{ marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
