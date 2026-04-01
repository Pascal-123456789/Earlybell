import React, { useState, useEffect } from 'react';
import './NewsIntelligence.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Config maps ────────────────────────────────────────────────────────────
const CONFLUENCE_TYPE = {
  CONFIRMED:        { label: 'CONFIRMED',        cls: 'conf-confirmed' },
  DIVERGENCE:       { label: 'DIVERGENCE',        cls: 'conf-divergence' },
  CATALYST_RISK:    { label: 'CATALYST RISK',     cls: 'conf-catalyst' },
  INSIDER_CATALYST: { label: 'INSIDER CATALYST',  cls: 'conf-insider' },
};

const FLAG_TYPE = {
  EARNINGS_RISK:    { cls: 'flag-amber' },
  UNUSUAL_ACTIVITY: { cls: 'flag-blue' },
  CONTRARIAN:       { cls: 'flag-red' },
  BREAKOUT_SETUP:   { cls: 'flag-green' },
  INSIDER_ALERT:    { cls: 'flag-purple' },
};

const FLOW_ARROW = { INTO: '▲', OUT_OF: '▼', NEUTRAL: '→' };
const FLOW_CLS   = { INTO: 'flow-into', OUT_OF: 'flow-out', NEUTRAL: 'flow-neutral' };
const DIR_ARROW  = { BULLISH: '▲', BEARISH: '▼', NEUTRAL: '→' };
const DIR_CLS    = { BULLISH: 'dir-bull', BEARISH: 'dir-bear', NEUTRAL: 'dir-neutral' };

const SENTIMENT_CLS = {
  BULLISH: 'sent-bull', BEARISH: 'sent-bear',
  MIXED: 'sent-mixed', NEUTRAL: 'sent-neutral',
};

function formatAge(ts) {
  if (!ts) return '';
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// ── Skeleton ───────────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="ni-page">
    <div className="ni-header">
      <span className="ni-title">NEWS RADAR</span>
    </div>
    <div className="ni-narrative-block">
      <div className="ni-skel" style={{ height: 14, width: '90%', marginBottom: 8 }} />
      <div className="ni-skel" style={{ height: 14, width: '75%', marginBottom: 8 }} />
      <div className="ni-skel" style={{ height: 14, width: '60%' }} />
    </div>
    <div className="ni-section">
      <div className="ni-section-label">SIGNAL x CATALYST CONFLUENCES</div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="ni-skel-row" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────
const NewsIntelligence = () => {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [headlinesOpen, setHeadlinesOpen] = useState(false);
  const [expandedRow, setExpandedRow]     = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/news/intelligence`)
      .then(res => res.json())
      .then(json => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError('Failed to load news intelligence.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="ni-page">
        <div className="ni-header">
          <span className="ni-title">NEWS RADAR</span>
        </div>
        <div className="ni-empty-state">
          <p>Analysis unavailable — will retry next hourly scan</p>
          {error && <p className="ni-empty-hint">{error}</p>}
        </div>
      </div>
    );
  }

  const sentimentCls = SENTIMENT_CLS[data.overall_sentiment] || 'sent-neutral';
  const confluences  = data.confluences   || [];
  const rotation     = data.sector_rotation || [];
  const flags        = data.watchlist_flags || [];
  const headlines    = data.headlines      || [];
  const themes       = data.macro_themes   || [];

  return (
    <div className="ni-page">

      {/* ── Header ── */}
      <div className="ni-header">
        <span className="ni-title">NEWS RADAR</span>
        <div className="ni-header-right">
          <span className={`ni-sentiment-pill ${sentimentCls}`}>
            {data.overall_sentiment || 'NEUTRAL'}
          </span>
          <span className="ni-meta-ts">
            Updated {formatAge(data.recorded_at)} · {data.headline_count || 0} headlines analyzed
          </span>
        </div>
      </div>

      {/* ── Macro narrative ── */}
      {data.macro_summary && (
        <div className="ni-narrative-block">
          <p className="ni-macro-text">{data.macro_summary}</p>
          {themes.length > 0 && (
            <div className="ni-themes">
              {themes.map((t, i) => <span key={i} className="ni-theme-pill">{t}</span>)}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          SIGNAL × CATALYST CONFLUENCES
      ════════════════════════════════════════ */}
      <div className="ni-section">
        <div className="ni-section-label">SIGNAL x CATALYST CONFLUENCES</div>

        {confluences.length === 0 ? (
          <div className="ni-no-confluences">
            No confluences detected this hour — signals and news are not overlapping
          </div>
        ) : (
          <div className="ni-conf-list">
            {confluences.map((c, i) => {
              const typeCfg = CONFLUENCE_TYPE[c.type] || CONFLUENCE_TYPE.CONFIRMED;
              const dirCls  = DIR_CLS[c.direction]  || 'dir-neutral';
              const dirArr  = DIR_ARROW[c.direction] || '→';
              const isOpen  = expandedRow === i;

              return (
                <div
                  key={i}
                  className={`ni-conf-row${isOpen ? ' ni-conf-row--open' : ''}`}
                  onClick={() => setExpandedRow(isOpen ? null : i)}
                >
                  {/* Left meta */}
                  <div className="ni-conf-left">
                    <span className={`ni-type-badge ${typeCfg.cls}`}>{typeCfg.label}</span>
                    <span className="ni-conf-ticker">{c.ticker}</span>
                    <span className={`ni-conf-dir ${dirCls}`}>{dirArr}</span>
                  </div>

                  {/* Body */}
                  <div className="ni-conf-body">
                    <span className="ni-conf-headline">{c.headline}</span>
                    {c.insight && (
                      <span className="ni-conf-insight"> · {c.insight}</span>
                    )}
                    {isOpen && c.signal_context && (
                      <div className="ni-conf-context">{c.signal_context}</div>
                    )}
                  </div>

                  {/* Right meta */}
                  <div className="ni-conf-right">
                    <span className="ni-conf-score">{(c.signal_score || 0).toFixed(1)}</span>
                    <span className="ni-conf-confidence">{c.confidence}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          SECTOR ROTATION
      ════════════════════════════════════════ */}
      {rotation.length > 0 && (
        <div className="ni-section">
          <div className="ni-section-label">SECTOR ROTATION</div>
          <div className="ni-rotation-pills">
            {rotation.map((s, i) => {
              const arrow   = FLOW_ARROW[s.flow] || '→';
              const flowCls = FLOW_CLS[s.flow]   || 'flow-neutral';
              return (
                <span key={i} className="ni-sector-pill" title={s.reason}>
                  <span className={`ni-flow-arrow ${flowCls}`}>{arrow}</span>
                  {' '}{s.sector}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          FLAGS TO WATCH
      ════════════════════════════════════════ */}
      {flags.length > 0 && (
        <div className="ni-section">
          <div className="ni-section-label">FLAGS TO WATCH</div>
          <div className="ni-flag-list">
            {flags.map((f, i) => {
              const flagCfg = FLAG_TYPE[f.flag] || { cls: 'flag-amber' };
              return (
                <div key={i} className="ni-flag-row">
                  <span className={`ni-flag-badge ${flagCfg.cls}`}>
                    {(f.flag || '').replace(/_/g, ' ')}
                  </span>
                  <span className="ni-flag-ticker">{f.ticker}</span>
                  <span className="ni-flag-reason">{f.reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          HEADLINES ANALYZED (collapsible)
      ════════════════════════════════════════ */}
      <div className="ni-section">
        <button
          className="ni-headlines-toggle"
          onClick={() => setHeadlinesOpen(o => !o)}
        >
          <span className="ni-toggle-arrow">{headlinesOpen ? '▾' : '▸'}</span>
          Headlines Analyzed ({headlines.length})
        </button>
        {headlinesOpen && (
          <div className="ni-headlines-list">
            {headlines.map((h, i) => (
              <div key={i} className="ni-headline-row">
                <span className="ni-hl-ticker">{h.ticker}</span>
                <span className="ni-hl-text">{h.headline}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default NewsIntelligence;
