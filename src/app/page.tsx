'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';

interface Initiative {
  id: string;
  name: string;
  pillar: string;
  month: string;
  status: string;
  priority: string;
  owner: string;
  notes: string;
  bigSwing: string;
}

const PILLARS = ['CVR', 'AOV', 'LTV'];
const ALL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUSES = ['Planned', 'In Progress', 'Done'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const PILLAR_DESC: Record<string, string> = { CVR: 'Conversion Rate', AOV: 'Avg Order Value', LTV: 'Subscriber Lifetime Value' };
const WINDOW_SIZE = 3;
const ROADMAP_YEAR = 2026;

function pillarClass(p: string) { return p === 'CVR' ? 'cvr' : p === 'AOV' ? 'aov' : 'ltv'; }
function statusClass(s: string) { return s === 'In Progress' ? 'inprog' : s === 'Done' ? 'done' : 'planned'; }
function priorityClass(p: string) { return p === 'High' ? 'high' : p === 'Medium' ? 'med' : 'low'; }
function nextIn(arr: string[], val: string) { const i = arr.indexOf(val); return arr[(i + 1) % arr.length]; }
function currentMonthIdx() {
  const now = new Date();
  return now.getFullYear() === ROADMAP_YEAR ? now.getMonth() : 0;
}
function clampStart(idx: number) {
  return Math.max(0, Math.min(ALL_MONTHS.length - WINDOW_SIZE, idx));
}

function exportCSV(items: Initiative[]) {
  const headers = ['Name', 'Pillar', 'Month', 'Status', 'Priority', 'Owner', 'Notes', 'Big Swing'];
  const rows = items.map(i => [i.name, i.pillar, i.month, i.status, i.priority, i.owner, i.notes, i.bigSwing === 'Yes' ? 'Yes' : 'No'].map(v => `"${(v || '').replace(/"/g, '""')}"`));
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'firstday_roadmap.csv'; a.click();
}

// --- API helpers ---
async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// --- Components ---

function AddModal({ onAdd, onClose, saving, defaultMonth }: { onAdd: (item: Omit<Initiative, 'id'>) => void; onClose: () => void; saving: boolean; defaultMonth: string }) {
  const [form, setForm] = useState({ name: '', pillar: 'CVR', month: defaultMonth, status: 'Planned', priority: 'High', owner: '', notes: '', bigSwing: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Add Initiative</h2>
        <div className="form-group">
          <label className="form-label">Initiative Name *</label>
          <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Checkout A/B test" autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Pillar</label>
            <select className="form-select" value={form.pillar} onChange={e => set('pillar', e.target.value)}>
              {PILLARS.map(p => <option key={p} value={p}>{p} — {PILLAR_DESC[p]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={form.month} onChange={e => set('month', e.target.value)}>
              {ALL_MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Owner</label>
          <input className="form-input" value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Name or team" />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.bigSwing === 'Yes'} onChange={e => set('bigSwing', e.target.checked ? 'Yes' : '')} style={{ width: 16, height: 16, accentColor: '#f59e0b' }} />
            Big Swing
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">Notes / Hypothesis</label>
          <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What's the expected impact?" />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => { if (form.name.trim()) onAdd(form); }}>
            {saving ? 'Saving…' : 'Add Initiative'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ item, onUpdate, onDelete, draggable = false, onDragStart, onDragEnd, isDragging }: { item: Initiative; onUpdate: (id: string, key: string, val: string) => void; onDelete: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragEnd?: () => void; isDragging?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const isDone = item.status === 'Done';
  const isEditing = editingName || editingOwner || editingNotes;
  return (
    <div
      className={`card ${expanded ? '' : 'card-collapsed'} ${isDone ? 'card-done' : ''} ${isDragging ? 'card-dragging' : ''} ${draggable && !isEditing ? 'card-draggable' : ''}`}
      draggable={draggable && !isEditing}
      onDragStart={e => {
        if (!draggable || isEditing) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(item.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <input
          type="checkbox"
          className="card-check"
          checked={isDone}
          onChange={e => onUpdate(item.id, 'status', e.target.checked ? 'Done' : 'Planned')}
          title={isDone ? 'Mark as not deployed' : 'Mark as deployed / complete'}
        />
        <button
          className="card-toggle"
          onClick={() => setExpanded(e => !e)}
          title={expanded ? 'Collapse' : 'Expand'}
        >{expanded ? '▾' : '▸'}</button>
        <div
          className="card-name"
          style={{ flex: 1 }}
          onClick={() => (expanded ? setEditingName(true) : setExpanded(true))}
        >
          {editingName
            ? <input autoFocus defaultValue={item.name} onBlur={e => { onUpdate(item.id, 'name', e.target.value); setEditingName(false); }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            : item.name}
        </div>
        <button className="delete-btn" onClick={() => onDelete(item.id)} title="Delete">×</button>
      </div>
      {expanded && (<>
      <div className="card-meta">
        <span className={`pill pill-${statusClass(item.status)}`} onClick={() => onUpdate(item.id, 'status', nextIn(STATUSES, item.status))} title="Click to change status">{item.status}</span>
        <span className={`pill pill-${priorityClass(item.priority)}`} onClick={() => onUpdate(item.id, 'priority', nextIn(PRIORITIES, item.priority))} title="Click to change priority">{item.priority}</span>
        <span className={`pill ${item.bigSwing === 'Yes' ? 'pill-bigswing' : 'pill-bigswing-off'}`} onClick={() => onUpdate(item.id, 'bigSwing', item.bigSwing === 'Yes' ? '' : 'Yes')} title="Toggle Big Swing">{item.bigSwing === 'Yes' ? 'Big Swing' : 'Swing?'}</span>
        <select
          className="card-month-select"
          value={item.month}
          onChange={e => onUpdate(item.id, 'month', e.target.value)}
          title="Move to month"
          onClick={e => e.stopPropagation()}
        >
          {ALL_MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="card-owner" onClick={() => setEditingOwner(true)}>
        {editingOwner
          ? <input autoFocus defaultValue={item.owner} placeholder="Add owner..." onBlur={e => { onUpdate(item.id, 'owner', e.target.value); setEditingOwner(false); }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
          : item.owner || <span style={{ color: '#d1d5db' }}>Add owner…</span>}
      </div>
      {(item.notes || editingNotes) && (
        <div className="card-notes" onClick={() => setEditingNotes(true)}>
          {editingNotes
            ? <textarea autoFocus rows={2} defaultValue={item.notes} placeholder="Add notes…" onBlur={e => { onUpdate(item.id, 'notes', e.target.value); setEditingNotes(false); }} />
            : item.notes}
        </div>
      )}
      {!item.notes && !editingNotes && (
        <div style={{ marginTop: 4 }}>
          <button style={{ background: 'none', border: 'none', fontSize: 11, color: '#d1d5db', cursor: 'pointer', padding: 0 }} onClick={() => setEditingNotes(true)}>+ Add notes</button>
        </div>
      )}
      </>)}
    </div>
  );
}

function BoardView({ items, months, onUpdate, onDelete }: { items: Initiative[]; months: string[]; onUpdate: (id: string, key: string, val: string) => void; onDelete: (id: string) => void }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const handleDrop = (pillar: string, month: string) => {
    if (!draggingId) return;
    const dragged = items.find(i => i.id === draggingId);
    setDragOverKey(null);
    setDraggingId(null);
    if (!dragged) return;
    if (dragged.month !== month) onUpdate(draggingId, 'month', month);
    if (dragged.pillar !== pillar) onUpdate(draggingId, 'pillar', pillar);
  };

  return (
    <div className="scroll-x">
      <div className="calendar-board">
        {/* Month column headers */}
        <div className="calendar-corner" />
        {months.map(month => (
          <div key={month} className="calendar-month-header">
            <span>{month}</span>
            <span className="count">{items.filter(i => i.month === month).length}</span>
          </div>
        ))}

        {/* Pillar swimlane rows */}
        {PILLARS.map(pillar => {
          const rowItems = items.filter(i => i.pillar === pillar);
          return (
            <>
              <div key={pillar + '-label'} className={`calendar-pillar-label ${pillarClass(pillar)}`}>
                <span style={{ fontWeight: 700 }}>{pillar}</span>
                <span style={{ fontWeight: 400, opacity: 0.8, fontSize: 11 }}>{PILLAR_DESC[pillar]}</span>
                <span className="count">{rowItems.length}</span>
              </div>
              {months.map(month => {
                const cellItems = rowItems.filter(i => i.month === month);
                const cellKey = pillar + '-' + month;
                const isDragOver = dragOverKey === cellKey && draggingId !== null;
                return (
                  <div
                    key={cellKey}
                    className={`calendar-cell ${isDragOver ? 'calendar-cell-dragover' : ''}`}
                    onDragOver={e => {
                      if (!draggingId) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverKey !== cellKey) setDragOverKey(cellKey);
                    }}
                    onDragLeave={e => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverKey === cellKey) setDragOverKey(null);
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      handleDrop(pillar, month);
                    }}
                  >
                    {cellItems.length === 0
                      ? <div className="calendar-empty"><span>{isDragOver ? 'Drop here' : 'No items'}</span></div>
                      : cellItems.map(item => (
                          <Card
                            key={item.id}
                            item={item}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            draggable
                            isDragging={draggingId === item.id}
                            onDragStart={id => setDraggingId(id)}
                            onDragEnd={() => { setDraggingId(null); setDragOverKey(null); }}
                          />
                        ))
                    }
                  </div>
                );
              })}
            </>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ items, onUpdate, onDelete }: { items: Initiative[]; onUpdate: (id: string, key: string, val: string) => void; onDelete: (id: string) => void }) {
  if (!items.length) return <div className="empty-state">No initiatives match your filters.</div>;
  return (
    <div className="scroll-x">
      <table className="list-table">
        <thead>
          <tr>
            <th></th>
            <th>Initiative</th>
            <th>Pillar</th>
            <th>Month</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Big Swing</th>
            <th>Owner</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const isDone = item.status === 'Done';
            return (
              <tr key={item.id} className={isDone ? 'row-done' : ''}>
                <td style={{ width: 28 }}>
                  <input
                    type="checkbox"
                    className="card-check"
                    checked={isDone}
                    onChange={e => onUpdate(item.id, 'status', e.target.checked ? 'Done' : 'Planned')}
                    title={isDone ? 'Mark as not deployed' : 'Mark as deployed / complete'}
                  />
                </td>
                <td className="name">
                  <input defaultValue={item.name} onBlur={e => onUpdate(item.id, 'name', e.target.value)} />
                </td>
                <td><span className={`pill pill-${pillarClass(item.pillar)}`}>{item.pillar}</span></td>
                <td>
                  <select className="filter-select" value={item.month} onChange={e => onUpdate(item.id, 'month', e.target.value)} style={{ height: 28, fontSize: 12 }}>
                    {ALL_MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </td>
                <td>
                  <span className={`pill pill-${statusClass(item.status)}`} style={{ cursor: 'pointer' }} onClick={() => onUpdate(item.id, 'status', nextIn(STATUSES, item.status))}>{item.status}</span>
                </td>
                <td>
                  <span className={`pill pill-${priorityClass(item.priority)}`} style={{ cursor: 'pointer' }} onClick={() => onUpdate(item.id, 'priority', nextIn(PRIORITIES, item.priority))}>{item.priority}</span>
                </td>
                <td>
                  <span className={`pill ${item.bigSwing === 'Yes' ? 'pill-bigswing' : 'pill-bigswing-off'}`} style={{ cursor: 'pointer' }} onClick={() => onUpdate(item.id, 'bigSwing', item.bigSwing === 'Yes' ? '' : 'Yes')}>{item.bigSwing === 'Yes' ? 'Big Swing' : '—'}</span>
                </td>
                <td style={{ color: '#6b7280', minWidth: 100 }}>
                  <input defaultValue={item.owner} placeholder="—" onBlur={e => onUpdate(item.id, 'owner', e.target.value)} />
                </td>
                <td style={{ color: '#6b7280', minWidth: 200 }}>
                  <input defaultValue={item.notes} placeholder="—" onBlur={e => onUpdate(item.id, 'notes', e.target.value)} />
                </td>
                <td><button className="delete-btn" onClick={() => onDelete(item.id)}>×</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function RoadmapPage() {
  const [items, setItems] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPillar, setFilterPillar] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterBigSwing, setFilterBigSwing] = useState('');
  const [startMonthIdx, setStartMonthIdx] = useState<number>(() => clampStart(currentMonthIdx()));

  const visibleMonths = useMemo(
    () => ALL_MONTHS.slice(startMonthIdx, startMonthIdx + WINDOW_SIZE),
    [startMonthIdx]
  );

  // Debounce timer for updates
  const updateTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const data = await api<Initiative[]>('/api/initiatives');
      setItems(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = useCallback(async (item: Omit<Initiative, 'id'>) => {
    setSaving(true);
    try {
      const created = await api<Initiative>('/api/initiatives', { method: 'POST', body: JSON.stringify(item) });
      setItems(prev => [...prev, created]);
      setShowAdd(false);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateItem = useCallback((id: string, key: string, val: string) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i));

    // Debounced API call
    if (updateTimer.current) clearTimeout(updateTimer.current);
    updateTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api(`/api/initiatives/${id}`, { method: 'PUT', body: JSON.stringify({ [key]: val }) });
        setError('');
      } catch (err: any) {
        setError(err.message);
        fetchItems(); // Re-fetch on error
      } finally {
        setSaving(false);
      }
    }, 400);
  }, [fetchItems]);

  const deleteItem = useCallback(async (id: string) => {
    if (!confirm('Remove this initiative?')) return;
    setSaving(true);
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await api(`/api/initiatives/${id}`, { method: 'DELETE' });
      setError('');
    } catch (err: any) {
      setError(err.message);
      fetchItems();
    } finally {
      setSaving(false);
    }
  }, [fetchItems]);

  const filtered = items.filter(i => {
    if (filterPillar && i.pillar !== filterPillar) return false;
    if (filterMonth && i.month !== filterMonth) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    if (filterBigSwing === 'Yes' && i.bigSwing !== 'Yes') return false;
    if (filterBigSwing === 'No' && i.bigSwing === 'Yes') return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !(i.notes || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visibleSet = new Set(visibleMonths);
  const boardItems = view === 'board' ? filtered.filter(i => visibleSet.has(i.month)) : filtered;

  const done = items.filter(i => i.status === 'Done').length;
  const pct = items.length ? Math.round(done / items.length * 100) : 0;
  const lastStart = ALL_MONTHS.length - WINDOW_SIZE;
  const windowLabel = `${visibleMonths[0]} – ${visibleMonths[visibleMonths.length - 1]} ${ROADMAP_YEAR}`;

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span style={{ fontSize: 13, color: '#6b7280' }}>Loading roadmap from Google Sheets…</span>
      </div>
    );
  }

  return (
    <div className="app">
      {saving && <div className="saving-indicator">Saving…</div>}

      {!controlsCollapsed && (
      <div className="header">
        <div className="header-left">
          <h1>firstday.com — {ROADMAP_YEAR} Roadmap</h1>
          <p>{windowLabel} &nbsp;·&nbsp; CVR · AOV · LTV</p>
        </div>
        <div className="header-right">
          <Link href="/config" className="btn btn-ghost btn-sm">⚙ Config</Link>
          <Link href="/accomplishments" className="btn btn-ghost btn-sm">Accomplishments</Link>
          <Link href="/requests" className="btn btn-ghost btn-sm">Requests</Link>
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered)}>↓ Export CSV</button>
          <Link href="/request" className="btn btn-ghost btn-sm">Submit Request</Link>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Initiative</button>
        </div>
      </div>
      )}

      {error && (
        <div className="error-banner">
          <span>⚠</span> {error}
          <button onClick={fetchItems} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Retry</button>
        </div>
      )}

      {!controlsCollapsed && (
      <div className="stats-bar">
        <div className="stat"><span className="stat-val">{items.length}</span><span className="stat-label">Total</span></div>
        <div className="stat-divider" />
        {PILLARS.map(p => (
          <div key={p} className="stat">
            <span className="stat-val" style={{ color: p === 'CVR' ? 'var(--cvr)' : p === 'AOV' ? 'var(--aov)' : 'var(--ltv)' }}>{items.filter(i => i.pillar === p).length}</span>
            <span className="stat-label">{p}</span>
          </div>
        ))}
        <div className="stat-divider" />
        <div className="stat"><span className="stat-val" style={{ color: 'var(--inprog)' }}>{items.filter(i => i.status === 'In Progress').length}</span><span className="stat-label">In Progress</span></div>
        <div className="stat"><span className="stat-val" style={{ color: 'var(--done)' }}>{done}</span><span className="stat-label">Done</span></div>
        <div className="stat-divider" />
        <div className="stat"><span className="stat-val" style={{ color: '#f59e0b' }}>{items.filter(i => i.bigSwing === 'Yes').length}</span><span className="stat-label">Big Swings</span></div>
        <div className="stat-divider" />
        <div className="progress-wrap">
          <div className="progress-label">Completion · {pct}%</div>
          <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: pct + '%' }} /></div>
        </div>
      </div>
      )}

      <div className="month-window">
        <div className="month-window-left">
          <button
            className="month-collapse-btn"
            onClick={() => setControlsCollapsed(c => !c)}
            title={controlsCollapsed ? 'Show stats & filters' : 'Hide stats & filters'}
          >{controlsCollapsed ? '▸' : '▾'}</button>
          <span className="month-window-label">View</span>
          <button
            className="month-nav-btn"
            disabled={startMonthIdx === 0}
            onClick={() => setStartMonthIdx(i => clampStart(i - 1))}
            title="Previous month"
          >‹</button>
          <select
            className="filter-select"
            value={startMonthIdx}
            onChange={e => setStartMonthIdx(clampStart(parseInt(e.target.value, 10)))}
            style={{ minWidth: 130 }}
          >
            {ALL_MONTHS.slice(0, lastStart + 1).map((m, i) => (
              <option key={m} value={i}>Start: {m}</option>
            ))}
          </select>
          <button
            className="month-nav-btn"
            disabled={startMonthIdx >= lastStart}
            onClick={() => setStartMonthIdx(i => clampStart(i + 1))}
            title="Next month"
          >›</button>
          <span className="month-window-range">{windowLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="view-toggle" style={{ marginLeft: 0 }}>
            <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>Board</button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setStartMonthIdx(clampStart(currentMonthIdx()))}
            disabled={startMonthIdx === clampStart(currentMonthIdx())}
          >Today</button>
        </div>
      </div>

      {!controlsCollapsed && (
      <div className="filters">
        <input className="filter-input" placeholder="Search initiatives…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={filterPillar} onChange={e => setFilterPillar(e.target.value)}>
          <option value="">All Pillars</option>
          {PILLARS.map(p => <option key={p} value={p}>{p} — {PILLAR_DESC[p]}</option>)}
        </select>
        <select className="filter-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">All Months</option>
          {ALL_MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="filter-select" value={filterBigSwing} onChange={e => setFilterBigSwing(e.target.value)}>
          <option value="">All Initiatives</option>
          <option value="Yes">Big Swings Only</option>
          <option value="No">Non-Big Swings</option>
        </select>
      </div>
      )}

      {view === 'board'
        ? <BoardView items={boardItems} months={visibleMonths} onUpdate={updateItem} onDelete={deleteItem} />
        : <ListView items={filtered} onUpdate={updateItem} onDelete={deleteItem} />
      }

      {showAdd && <AddModal onAdd={addItem} onClose={() => setShowAdd(false)} saving={saving} defaultMonth={visibleMonths[0]} />}
    </div>
  );
}
