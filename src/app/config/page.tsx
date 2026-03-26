'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ConfigStatus {
  success: boolean;
  message: string;
  sheetTitle?: string;
  sheetId: string | null;
  sheetName: string;
  hasServiceKey: boolean;
  hasApproverPassword: boolean;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const fetchConfig = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      setConfig({ success: false, message: err.message, sheetId: null, sheetName: 'Roadmap', hasServiceKey: false, hasApproverPassword: false });
    } finally {
      setLoading(false);
      setTesting(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  return (
    <div className="config-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Link href="/" className="btn btn-ghost btn-sm">← Back</Link>
        <h1>Configuration</h1>
      </div>
      <p className="subtitle">Google Sheets connection and environment settings</p>

      {/* Connection Status */}
      <div className="config-section">
        <h2>Connection Status</h2>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            <span style={{ fontSize: 13, color: '#6b7280' }}>Testing connection…</span>
          </div>
        ) : config ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className={`status-dot ${config.success ? 'green' : 'red'}`} />
              <span style={{ fontSize: 14, fontWeight: 600, color: config.success ? '#10b981' : '#ef4444' }}>
                {config.success ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{config.message}</p>
            <button className="btn btn-ghost btn-sm" onClick={fetchConfig} disabled={testing}>
              {testing ? 'Testing…' : 'Re-test Connection'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Environment Variables */}
      <div className="config-section">
        <h2>Environment Variables</h2>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Set these in your Vercel project settings or local <code>.env.local</code> file.</p>
        <div className="config-row">
          <span className="config-key">GOOGLE_SHEET_ID</span>
          <span className="config-val">
            {config?.sheetId || <span style={{ color: '#ef4444' }}>Not set</span>}
          </span>
        </div>
        <div className="config-row">
          <span className="config-key">GOOGLE_SHEET_NAME</span>
          <span className="config-val">{config?.sheetName || 'Roadmap'}</span>
        </div>
        <div className="config-row">
          <span className="config-key">GOOGLE_SERVICE_ACCOUNT_KEY</span>
          <span className="config-val">
            {config?.hasServiceKey
              ? <span style={{ color: '#10b981' }}>Set (JSON)</span>
              : <span style={{ color: '#ef4444' }}>Not set</span>}
          </span>
        </div>
        <div className="config-row">
          <span className="config-key">APPROVER_PASSWORD</span>
          <span className="config-val">
            {config?.hasApproverPassword
              ? <span style={{ color: '#10b981' }}>Set</span>
              : <span style={{ color: '#f59e0b' }}>Not set (requests approval disabled)</span>}
          </span>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="config-section">
        <h2>Setup Guide</h2>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>1. Create a Google Cloud Service Account</p>
          <p style={{ color: '#6b7280', marginBottom: 12 }}>
            Go to <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener" style={{ color: 'var(--cvr)' }}>Google Cloud Console → IAM → Service Accounts</a>. Create a service account and download the JSON key file.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 8 }}>2. Enable the Google Sheets API</p>
          <p style={{ color: '#6b7280', marginBottom: 12 }}>
            Go to <a href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noopener" style={{ color: 'var(--cvr)' }}>APIs & Services → Library</a> and enable the Google Sheets API.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 8 }}>3. Create & Share a Google Sheet</p>
          <p style={{ color: '#6b7280', marginBottom: 12 }}>
            Create a new Google Sheet with a tab named <strong>Roadmap</strong> (or your chosen name). Share it with the service account email (the <code>client_email</code> from the JSON key) with <strong>Editor</strong> access. The app will auto-create headers on first load.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 8 }}>4. Set Environment Variables</p>
          <p style={{ color: '#6b7280', marginBottom: 12 }}>
            Copy the Sheet ID from the URL (<code>docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit</code>) and set:
          </p>
          <pre style={{ background: '#f3f4f6', padding: 16, borderRadius: 8, fontSize: 12, fontFamily: "'SF Mono', 'Fira Code', monospace", overflow: 'auto', marginBottom: 12 }}>
{`GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_SHEET_NAME=Roadmap
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
APPROVER_PASSWORD=your_secret_password`}
          </pre>
          <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 16 }}>
            For Vercel: paste the entire JSON key as a single line in the <code>GOOGLE_SERVICE_ACCOUNT_KEY</code> env var.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 8 }}>5. Request Approval Flow</p>
          <p style={{ color: '#6b7280', marginBottom: 12 }}>
            Set <code>APPROVER_PASSWORD</code> to enable the request/approval workflow. Anyone can submit requests at <code>/request</code>. Approvers enter the password at <code>/requests</code> to review, approve (adds to roadmap), or reject pending requests. Requests are stored in a separate <strong>Requests</strong> tab in the same spreadsheet.
          </p>
        </div>
      </div>

      {/* Sheet Schema */}
      <div className="config-section">
        <h2>Expected Sheet Schema</h2>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>The app expects these columns in row 1. They are auto-created on first connection.</p>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '6px 0', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Column</th>
              <th style={{ padding: '6px 0', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Header</th>
              <th style={{ padding: '6px 0', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Values</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['A', 'ID', 'Auto-generated timestamp'],
              ['B', 'Name', 'Initiative name'],
              ['C', 'Pillar', 'CVR / AOV / LTV'],
              ['D', 'Month', 'April / May / June'],
              ['E', 'Status', 'Planned / In Progress / Done'],
              ['F', 'Priority', 'High / Medium / Low'],
              ['G', 'Owner', 'Free text'],
              ['H', 'Notes', 'Free text'],
            ].map(([col, header, values]) => (
              <tr key={col} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '6px 0', fontFamily: "'SF Mono', monospace", color: '#6b7280' }}>{col}</td>
                <td style={{ padding: '6px 0', fontWeight: 500 }}>{header}</td>
                <td style={{ padding: '6px 0', color: '#6b7280' }}>{values}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
