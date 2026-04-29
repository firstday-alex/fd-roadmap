'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';

interface Accomplishment {
  id: string;
  Feature: string;
  Theme: string;
  OKR: string;
  'Impact Size': string;
  'Impact Notes': string;
  'Completed Date': string;
  [k: string]: string;
}

const IMPACT_ORDER = ['XL', 'L', 'M', 'S', 'XS', '0'];
const IMPACT_RANK: Record<string, number> = { XL: 5, L: 4, M: 3, S: 2, XS: 1, '0': 0 };
const GROUP_OPTIONS = ['Theme', 'Impact Size', 'OKR', 'None'] as const;
type Group = typeof GROUP_OPTIONS[number];

function impactClass(s: string) {
  const v = (s || '').trim().toUpperCase();
  if (v === 'XL') return 'imp-xl';
  if (v === 'L') return 'imp-l';
  if (v === 'M') return 'imp-m';
  if (v === 'S') return 'imp-s';
  if (v === 'XS') return 'imp-xs';
  return 'imp-none';
}

function impactLabel(s: string) {
  const v = (s || '').trim();
  if (!v || v === '0') return '—';
  return v.toUpperCase();
}

function parseDate(s: string): number {
  if (!s) return 0;
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return 0;
  const month = parseInt(m[1], 10) - 1;
  const day = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  return new Date(year, month, day).getTime();
}

function formatDate(s: string): string {
  const t = parseDate(s);
  if (!t) return s || '—';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function fetchAccomplishments(): Promise<Accomplishment[]> {
  const res = await fetch('/api/accomplishments', { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to load');
  }
  return res.json();
}

function exportCSV(items: Accomplishment[]) {
  const headers = ['Feature', 'Theme', 'OKR', 'Impact Size', 'Impact Notes', 'Completed Date'];
  const rows = items.map(i => headers.map(h => `"${(i[h] || '').replace(/"/g, '""')}"`));
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'firstday_accomplishments.csv';
  a.click();
}

function ImpactPill({ size }: { size: string }) {
  return <span className={`pill impact ${impactClass(size)}`}>{impactLabel(size)}</span>;
}

function AccomplishmentRow({ item }: { item: Accomplishment }) {
  const cls = impactClass(item['Impact Size']);
  return (
    <div className={`accomp-card ${cls}`}>
      <div className="accomp-card-head">
        <ImpactPill size={item['Impact Size']} />
        <span className="accomp-feature">{item.Feature || '—'}</span>
        <span className="accomp-date">{formatDate(item['Completed Date'])}</span>
      </div>
      <div className="accomp-card-meta">
        {item.Theme && <span className="pill pill-soft">{item.Theme}</span>}
        {item.OKR && <span className={`pill pill-${(item.OKR || '').toLowerCase() === 'cvr' ? 'cvr' : (item.OKR || '').toLowerCase() === 'aov' ? 'aov' : 'ltv'}`}>{item.OKR}</span>}
      </div>
      {item['Impact Notes'] && (
        <div className="accomp-notes">{item['Impact Notes']}</div>
      )}
    </div>
  );
}

export default function AccomplishmentsPage() {
  const [items, setItems] = useState<Accomplishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [filterOKR, setFilterOKR] = useState('');
  const [filterImpact, setFilterImpact] = useState('');
  const [groupBy, setGroupBy] = useState<Group>('Theme');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAccomplishments();
      setItems(data);
      setError('');
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const themes = useMemo(() => Array.from(new Set(items.map(i => i.Theme).filter(Boolean))).sort(), [items]);
  const okrs = useMemo(() => Array.from(new Set(items.map(i => i.OKR).filter(Boolean))).sort(), [items]);
  const impacts = useMemo(() => {
    const present = new Set(items.map(i => (i['Impact Size'] || '').trim().toUpperCase()).filter(Boolean));
    return IMPACT_ORDER.filter(v => present.has(v));
  }, [items]);

  const filtered = useMemo(() => items.filter(i => {
    if (filterTheme && i.Theme !== filterTheme) return false;
    if (filterOKR && i.OKR !== filterOKR) return false;
    if (filterImpact && (i['Impact Size'] || '').trim().toUpperCase() !== filterImpact) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [i.Feature, i.Theme, i.OKR, i['Impact Notes']].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [items, filterTheme, filterOKR, filterImpact, search]);

  const groups = useMemo(() => {
    if (groupBy === 'None') return [{ key: 'All', items: filtered }];
    const map = new Map<string, Accomplishment[]>();
    for (const it of filtered) {
      const raw = groupBy === 'Theme' ? it.Theme : groupBy === 'OKR' ? it.OKR : it['Impact Size'];
      const key = (raw || '').trim() || (groupBy === 'Impact Size' ? '—' : 'Uncategorized');
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    }
    const entries = Array.from(map.entries());
    if (groupBy === 'Impact Size') {
      entries.sort((a, b) => (IMPACT_RANK[b[0].toUpperCase()] ?? -1) - (IMPACT_RANK[a[0].toUpperCase()] ?? -1));
    } else {
      entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    }
    for (const [, arr] of entries) {
      arr.sort((a, b) => parseDate(b['Completed Date']) - parseDate(a['Completed Date']));
    }
    return entries.map(([key, items]) => ({ key, items }));
  }, [filtered, groupBy]);

  const toggleGroup = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  const totalImpact = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of filtered) {
      const v = (it['Impact Size'] || '').trim().toUpperCase() || '0';
      counts[v] = (counts[v] || 0) + 1;
    }
    return counts;
  }, [filtered]);

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <h1>Accomplishments</h1>
          <p>Shipped features by Theme &nbsp;·&nbsp; impact-sized retrospective</p>
        </div>
        <div className="header-right">
          <Link href="/" className="btn btn-ghost btn-sm">← Roadmap</Link>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>↻ Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered)}>↓ Export CSV</button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠</span> {error}
          <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Retry</button>
        </div>
      )}

      <div className="stats-bar">
        <div className="stat"><span className="stat-val">{filtered.length}</span><span className="stat-label">Shown</span></div>
        <div className="stat-divider" />
        {IMPACT_ORDER.filter(v => v !== '0').map(v => (
          <div key={v} className="stat">
            <span className={`impact-dot ${impactClass(v)}`} />
            <span className="stat-val" style={{ fontSize: 16 }}>{totalImpact[v] || 0}</span>
            <span className="stat-label">{v}</span>
          </div>
        ))}
      </div>

      <div className="filters">
        <input className="filter-input" placeholder="Search features, notes…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={filterTheme} onChange={e => setFilterTheme(e.target.value)}>
          <option value="">All Themes</option>
          {themes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={filterOKR} onChange={e => setFilterOKR(e.target.value)}>
          <option value="">All OKRs</option>
          {okrs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="filter-select" value={filterImpact} onChange={e => setFilterImpact(e.target.value)}>
          <option value="">All Impact Sizes</option>
          {impacts.map(v => <option key={v} value={v}>{impactLabel(v)}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>Group by</span>
          <select className="filter-select" value={groupBy} onChange={e => setGroupBy(e.target.value as Group)}>
            {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 240 }}>
          <div className="spinner" />
          <span style={{ fontSize: 13, color: '#6b7280' }}>Loading accomplishments…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No accomplishments match your filters.</div>
      ) : (
        <div className="accomp-groups">
          {groups.map(({ key, items: gItems }) => {
            const isCollapsed = !!collapsed[key];
            const groupHeadCls = groupBy === 'Impact Size' ? `accomp-group-head ${impactClass(key)}` : 'accomp-group-head';
            return (
              <div key={key} className="accomp-group">
                <button className={groupHeadCls} onClick={() => toggleGroup(key)}>
                  <span className="accomp-group-caret">{isCollapsed ? '▸' : '▾'}</span>
                  <span className="accomp-group-name">{groupBy === 'Impact Size' ? impactLabel(key) : key}</span>
                  <span className="accomp-group-count">{gItems.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="accomp-group-body">
                    {gItems.map(item => <AccomplishmentRow key={item.id} item={item} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
