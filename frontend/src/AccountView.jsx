import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX } from 'react-icons/fi';
import { useAuth } from './AuthContext';
import { useWatchlist } from './useWatchlist';

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY

const searchTickers = async (query) => {
  if (query.length < 1) return []
  const res = await fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`
  )
  const data = await res.json()
  return (data.result || [])
    .filter(r => r.type === 'Common Stock' && !r.symbol.includes('.'))
    .slice(0, 6)
}
import { supabase } from './supabaseClient';
import './AccountView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const LEVEL_COLOR = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#6366f1',
  LOW:      '#334155',
};

const scoreToLevel = (score) => {
  if (score >= 7) return 'CRITICAL';
  if (score >= 5) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  return 'LOW';
};

export default function AccountView() {
  const { user, signOut } = useAuth();
  const { watchlist, addTicker, removeTicker, maxTickers } = useWatchlist();

  const [scanData, setScanData]         = useState({});
  const [scanLoading, setScanLoading]   = useState(true);
  const [threshold, setThreshold]       = useState(5);
  const [alertEmail, setAlertEmail]     = useState('');
  const [saveStatus, setSaveStatus]     = useState(null); // null | 'saving' | 'saved' | 'error'

  // Ticker search state
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [limitMsg, setLimitMsg]     = useState(null);
  const debounceRef  = useRef(null);
  const searchBoxRef = useRef(null);

  // Load scan data for watched tickers
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/alerts/cached`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const map = {};
          data.forEach(d => { map[d.ticker] = d; });
          setScanData(map);
        }
      } catch { /* silent */ }
      setScanLoading(false);
    };
    load();
  }, []);

  // Load alert preferences from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('alert_threshold, alert_email')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setThreshold(data.alert_threshold ?? 5);
          setAlertEmail(data.alert_email || user.email || '');
        } else {
          setAlertEmail(user.email || '');
        }
      });
  }, [user]);

  // Debounced Finnhub search
  const handleQueryChange = useCallback((e) => {
    const q = e.target.value;
    setQuery(q);
    setDropdownOpen(true);
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const hits = await searchTickers(q.trim());
        setResults(hits);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handlePickTicker = async (symbol) => {
    const result = await addTicker(symbol);
    if (result?.error) {
      setLimitMsg(result.error);
      setTimeout(() => setLimitMsg(null), 3000);
    }
    setQuery('');
    setResults([]);
    setDropdownOpen(false);
  };

  const saveAlertPrefs = async () => {
    if (!user) return;
    setSaveStatus('saving');
    const { error } = await supabase
      .from('profiles')
      .update({
        alert_threshold: threshold,
        alert_email:     alertEmail,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', user.id);
    setSaveStatus(error ? 'error' : 'saved');
    if (!error) setTimeout(() => setSaveStatus(null), 3000);
  };

  if (!user) return null;

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const THRESHOLDS = [
    { value: 3, label: 'Score 3+' },
    { value: 5, label: 'Score 5+' },
    { value: 7, label: 'Score 7+' },
    { value: 0, label: 'Off' },
  ];

  return (
    <div className="acct-page">

      {/* ── Section 1: Account info ── */}
      <div className="acct-section-label">ACCOUNT</div>
      <div className="acct-card">
        <div className="acct-info-row">
          <span className="acct-email">{user.email}</span>
          <span className="acct-plan-badge">FREE PLAN</span>
        </div>
        {memberSince && (
          <div className="acct-since">Member since {memberSince}</div>
        )}
        <button className="acct-signout-btn" onClick={signOut}>Sign Out</button>
      </div>

      {/* ── Section 2: Watched tickers ── */}
      <div className="acct-section-label">
        WATCHED TICKERS ({watchlist.length}/{maxTickers})
      </div>
      <div className="acct-card acct-card--flush">
        {watchlist.length === 0 ? (
          <div className="acct-empty">
            No tickers watched. Search below to add up to {maxTickers}.
          </div>
        ) : (
          watchlist.map(ticker => {
            const d     = scanData[ticker];
            const score = d ? (d.alert_score || d.early_warning_score || 0) : null;
            const level = score != null ? scoreToLevel(score) : null;
            const pct   = d?.price_change_pct ?? null;

            return (
              <div key={ticker} className="acct-ticker-row">
                <span className="acct-ticker-sym">{ticker}</span>
                <span className="acct-ticker-price">
                  {d?.current_price ? `$${d.current_price.toFixed(2)}` : '—'}
                </span>
                {pct != null && (
                  <span className={`acct-ticker-pct acct-pct-${pct > 0 ? 'up' : pct < 0 ? 'dn' : 'flat'}`}>
                    {pct > 0 ? '↑' : pct < 0 ? '↓' : ''}{Math.abs(pct).toFixed(2)}%
                  </span>
                )}
                {score != null && (
                  <span className="acct-ticker-score" style={{ color: LEVEL_COLOR[level] }}>
                    {score.toFixed(1)}
                  </span>
                )}
                {scanLoading && !d && (
                  <span className="acct-ticker-loading">—</span>
                )}
                <button
                  className="acct-ticker-remove"
                  onClick={() => removeTicker(ticker)}
                  title={`Remove ${ticker}`}
                >
                  <FiX size={13} />
                </button>
              </div>
            );
          })
        )}
        {watchlist.length < maxTickers && (
          <div className="acct-search-wrap" ref={searchBoxRef}>
            <input
              className="acct-input acct-search-input"
              type="text"
              value={query}
              onChange={handleQueryChange}
              onFocus={() => query.trim() && setDropdownOpen(true)}
              placeholder="Search any ticker e.g. AAPL, TSLA..."
              autoComplete="off"
            />
            {dropdownOpen && query.trim() && (
              <div className="acct-dropdown">
                {searching ? (
                  <div className="acct-dropdown-msg">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="acct-dropdown-msg">No results for "{query}"</div>
                ) : (
                  results.map(r => (
                    <button
                      key={r.symbol}
                      className="acct-dropdown-row"
                      onClick={() => handlePickTicker(r.symbol)}
                    >
                      <span className="acct-dropdown-sym">{r.symbol}</span>
                      <span className="acct-dropdown-desc">{r.description}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {limitMsg && <p className="acct-limit-msg">{limitMsg}</p>}
          </div>
        )}
      </div>

      {/* ── Section 3: Email alerts ── */}
      <div className="acct-section-label">EMAIL ALERTS</div>
      <div className="acct-card">
        <p className="acct-alert-desc">
          Get notified when your watched tickers show unusual activity.
          Alerts send when a ticker's signal score rises above your threshold.
        </p>

        <div className="acct-field">
          <label className="acct-label">THRESHOLD</label>
          <div className="acct-threshold-pills">
            {THRESHOLDS.map(({ value, label }) => (
              <button
                key={value}
                className={`acct-threshold-pill${threshold === value ? ' acct-threshold-pill--active' : ''}`}
                onClick={() => setThreshold(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="acct-field">
          <label className="acct-label">ALERT EMAIL</label>
          <input
            className="acct-input"
            type="email"
            value={alertEmail}
            onChange={e => { setAlertEmail(e.target.value); setSaveStatus(null); }}
            placeholder="you@example.com"
          />
        </div>

        <button
          className="acct-save-btn"
          onClick={saveAlertPrefs}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving…' : 'Save Preferences'}
        </button>

        {saveStatus === 'saved' && (
          <p className="acct-save-success">Preferences saved.</p>
        )}
        {saveStatus === 'error' && (
          <p className="acct-save-error">Failed to save. Please try again.</p>
        )}
      </div>

    </div>
  );
}
