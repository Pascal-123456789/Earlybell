import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { useAuth } from './AuthContext';
import { useWatchlist } from './useWatchlist';
import TICKER_DATA from './tickerData';
import './WatchlistDashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const FINNHUB_KEY  = import.meta.env.VITE_FINNHUB_API_KEY;

const LEVEL_COLOR = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#6366f1',
  LOW:      '#334155',
};

const scoreToLevel = (s) => {
  if (s >= 7) return 'CRITICAL';
  if (s >= 5) return 'HIGH';
  if (s >= 3) return 'MEDIUM';
  return 'LOW';
};

function getDirection(d) {
  if (!d) return 'NEUTRAL';
  let score = 0;
  const cpRatio  = d.options_signal?.call_put_ratio || 0;
  const callVol  = d.options_signal?.total_call_volume || 0;
  const putVol   = d.options_signal?.total_put_volume  || 0;
  const pricePct = d.price_change_pct || 0;
  const sentiment = d.sentiment_score || 0;
  const social    = d.social_signal?.score || 0;

  if (cpRatio > 2.0)   score += 2; else if (cpRatio > 0 && cpRatio < 0.7) score -= 2;
  if (callVol > putVol * 1.5) score += 1; else if (putVol > callVol * 1.5) score -= 1;
  if (pricePct > 1.5)  score += 1; else if (pricePct < -1.5) score -= 1;
  if (sentiment > 0.3) score += 0.5; else if (sentiment < -0.3) score -= 0.5;
  if (social >= 5) { if (pricePct > 0) score += 0.5; else if (pricePct < 0) score -= 0.5; }

  return score > 1.5 ? 'BULLISH' : score < -1.5 ? 'BEARISH' : 'NEUTRAL';
}

function formatTimeAgo(unix) {
  if (!unix) return null;
  const ms   = typeof unix === 'number' ? unix * 1000 : new Date(unix).getTime();
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const fetchFinnhubQuote = async (symbol) => {
  if (!FINNHUB_KEY) return null;
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.c) return null;
    return { price: data.c, pct: data.dp };
  } catch { return null; }
};

const searchFinnhub = async (query) => {
  if (!FINNHUB_KEY || query.length < 1) return [];
  try {
    const res  = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.result || [])
      .filter(r => r.type === 'Common Stock' && !r.symbol.includes('.'))
      .slice(0, 6);
  } catch { return []; }
};

// ── Signal block ────────────────────────────────────────────────────────────
function SignalBlock({ label, score, detail }) {
  const s     = Math.max(0, Math.min(score || 0, 10));
  const level = scoreToLevel(s);
  const color = level === 'LOW' ? '#1a2740' : LEVEL_COLOR[level];
  return (
    <div className="wl-sig">
      <span className="wl-sig-label">{label}</span>
      <div className="wl-sig-bar-row">
        <div className="wl-sig-track">
          <div className="wl-sig-fill" style={{ width: `${(s / 10) * 100}%`, background: color }} />
        </div>
        <span className="wl-sig-score">{s.toFixed(0)}/10</span>
      </div>
      {detail ? <span className="wl-sig-detail">{detail}</span> : <span className="wl-sig-detail wl-sig-detail--empty">—</span>}
    </div>
  );
}

// ── Ticker card ─────────────────────────────────────────────────────────────
function TickerCard({ data, moversEntry, featured, onRemove, liveQuote }) {
  const score    = data.early_warning_score || 0;
  const level    = scoreToLevel(score);
  const color    = LEVEL_COLOR[level];
  const name     = TICKER_DATA[data.ticker]?.name || '';
  const price    = data.current_price  || liveQuote?.price || null;
  const pct      = data.price_change_pct ?? liveQuote?.pct ?? null;
  const dir      = getDirection(data);
  const sentimentScore = data.sentiment_score != null
    ? ((data.sentiment_score + 1) / 2) * 10
    : 0;
  const moverScore  = moversEntry?.mover_score || 0;
  const moverLabel  = moversEntry?.label || '';
  const moverDetail = moverScore > 0
    ? `${moverLabel}${moversEntry?.momentum_pct != null ? ` · ${moversEntry.momentum_pct > 0 ? '+' : ''}${moversEntry.momentum_pct.toFixed(1)}%` : ''}`
    : null;

  const articles = data.recent_articles || [];

  return (
    <div className={`wl-card${featured ? ' wl-card--featured' : ''}`}>
      {featured && <span className="wl-badge-top">★ TOP SIGNAL</span>}

      {/* Header */}
      <div className="wl-card-header">
        <div className="wl-card-id">
          <span className="wl-card-sym">{data.ticker}</span>
          {name && <span className="wl-card-name">{name}</span>}
        </div>
        <div className="wl-card-prices">
          {price != null && <span className="wl-card-price">${price.toFixed(2)}</span>}
          {pct  != null && (
            <span className={`wl-card-pct wl-pct-${pct > 0 ? 'up' : pct < 0 ? 'dn' : 'flat'}`}>
              {pct > 0 ? '↑' : pct < 0 ? '↓' : ''}{Math.abs(pct).toFixed(2)}%
            </span>
          )}
        </div>
        <button className="wl-remove" onClick={onRemove} title={`Remove ${data.ticker}`}>
          <FiX size={11} />
        </button>
      </div>

      {/* Score bar */}
      <div className="wl-score-wrap">
        <div className="wl-score-top">
          <span className="wl-score-lbl">EARLY WARNING SCORE</span>
          <span className="wl-score-num" style={{ color }}>{score.toFixed(1)}</span>
          <span className="wl-score-lvl" style={{ color }}>{level}</span>
        </div>
        <div className="wl-score-track">
          <div className="wl-score-fill" style={{ width: `${(score / 10) * 100}%`, background: color }} />
        </div>
      </div>

      {/* Signal grid */}
      <div className="wl-sig-grid">
        <SignalBlock
          label="OPTIONS FLOW"
          score={data.options_signal?.score || 0}
          detail={data.options_signal?.call_put_ratio > 0 ? `${data.options_signal.call_put_ratio.toFixed(1)}x C/P` : null}
        />
        <SignalBlock
          label="VOLUME SPIKE"
          score={data.volume_signal?.score || 0}
          detail={data.volume_signal?.volume_ratio_today > 0 ? `${data.volume_signal.volume_ratio_today.toFixed(1)}x avg` : null}
        />
        <SignalBlock
          label="SOCIAL BUZZ"
          score={data.social_signal?.score || 0}
          detail={data.social_signal?.mentions > 0 ? `${data.social_signal.mentions} mentions` : null}
        />
        <SignalBlock
          label="INSIDER BUY"
          score={data.insider_signal?.score || 0}
          detail={data.insider_signal?.purchases_30d > 0 ? `${data.insider_signal.purchases_30d} purchases` : null}
        />
        <SignalBlock
          label="SENTIMENT"
          score={sentimentScore}
          detail={data.news_count > 0 ? `${data.news_count} articles` : null}
        />
        <SignalBlock
          label="PREDICTED MOVE"
          score={moverScore}
          detail={moverDetail}
        />
      </div>

      {/* Direction */}
      <div className={`wl-dir wl-dir--${dir.toLowerCase()}`}>
        <span className="wl-dir-arrow">{dir === 'BULLISH' ? '↑' : dir === 'BEARISH' ? '↓' : '→'}</span>
        <span className="wl-dir-text">{dir}</span>
      </div>

      {/* News */}
      <div className="wl-news">
        <div className="wl-news-hd">LATEST NEWS</div>
        {articles.length === 0 ? (
          <div className="wl-news-empty">&gt; NO RECENT COVERAGE FOUND</div>
        ) : (
          articles.map((art, i) => (
            <a key={i} href={art.url} target="_blank" rel="noopener noreferrer" className="wl-news-row">
              <div className="wl-news-headline">{art.headline}</div>
              <div className="wl-news-meta">
                <span className="wl-news-src">{art.source}</span>
                <span className="wl-news-time">{formatTimeAgo(art.published_at)}</span>
                <span className="wl-news-dot" style={{
                  background: art.sentiment === 'positive' ? '#22c55e'
                    : art.sentiment === 'negative' ? '#ef4444' : '#334155',
                }} />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

// ── Ticker search dropdown ───────────────────────────────────────────────────
function TickerSearch({ onPick, limitMsg, searchBoxRef }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [searching, setSearching] = useState(false);
  const [open,     setOpen]     = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const hits = await searchFinnhub(q.trim());
      setResults(hits);
      setSearching(false);
    }, 300);
  };

  const pick = (symbol) => {
    onPick(symbol);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="wl-search-wrap" ref={searchBoxRef}>
      <input
        className="wl-search-input"
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="Search ticker e.g. PLUG, SNOW..."
        autoFocus
        autoComplete="off"
      />
      {open && query.trim() && (
        <div className="wl-search-dropdown">
          {searching ? (
            <div className="wl-dd-msg">Searching…</div>
          ) : results.length === 0 ? (
            <div className="wl-dd-msg">No results for "{query}"</div>
          ) : (
            results.map(r => (
              <button key={r.symbol} className="wl-dd-row" onClick={() => pick(r.symbol)}>
                <span className="wl-dd-sym">{r.symbol}</span>
                <span className="wl-dd-desc">{r.description}</span>
              </button>
            ))
          )}
        </div>
      )}
      {limitMsg && <p className="wl-limit-msg">{limitMsg}</p>}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function WatchlistDashboard({ onOpenAuth }) {
  const { user }   = useAuth();
  const { watchlist, addTicker, removeTicker, maxTickers } = useWatchlist();

  const [scanResults,   setScanResults]   = useState([]);
  const [moversMap,     setMoversMap]     = useState({});
  const [loading,       setLoading]       = useState(false);
  const [scanPhase,     setScanPhase]     = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [liveQuotes,    setLiveQuotes]    = useState({});
  const [addOpen,       setAddOpen]       = useState(false);
  const [limitMsg,      setLimitMsg]      = useState(null);
  const searchBoxRef = useRef(null);

  // Animate scan phase
  useEffect(() => {
    if (!loading || watchlist.length === 0) return;
    const id = setInterval(() => setScanPhase(p => (p + 1) % watchlist.length), 700);
    return () => clearInterval(id);
  }, [loading, watchlist]);

  const runScan = useCallback(async () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    try {
      const param = watchlist.join(',');
      const [scanRes, moversRes] = await Promise.all([
        fetch(`${API_BASE_URL}/watchlist-scan?tickers=${param}`).then(r => r.json()),
        fetch(`${API_BASE_URL}/movers/cached`).then(r => r.json()),
      ]);
      if (Array.isArray(scanRes))   setScanResults(scanRes);
      if (Array.isArray(moversRes)) {
        const map = {};
        moversRes.forEach(m => { map[m.ticker] = m; });
        setMoversMap(map);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Watchlist scan error:', err);
    }
    setLoading(false);
  }, [watchlist]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run on mount and whenever watchlist contents change
  const wlKey = watchlist.join(',');
  useEffect(() => {
    if (watchlist.length > 0) runScan();
  }, [wlKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setAddOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePickTicker = async (symbol) => {
    const result = await addTicker(symbol);
    if (result?.error) {
      setLimitMsg(result.error);
      setTimeout(() => setLimitMsg(null), 3000);
    } else {
      setAddOpen(false);
      fetchFinnhubQuote(symbol).then(q => {
        if (q) setLiveQuotes(prev => ({ ...prev, [symbol]: q }));
      });
    }
  };

  const formatRefreshed = () => {
    if (!lastRefreshed) return null;
    const mins = Math.round((Date.now() - lastRefreshed.getTime()) / 60000);
    if (mins < 1)  return 'just now';
    if (mins === 1) return '1m ago';
    return `${mins}m ago`;
  };

  // Sort by score desc; featured = highest
  const sorted   = [...scanResults].sort((a, b) => (b.early_warning_score || 0) - (a.early_warning_score || 0));
  const featured  = sorted[0] || null;
  const secondary = sorted.slice(1);

  // ── UNAUTHENTICATED OR EMPTY ────────────────────────────────────────────
  if (!user || watchlist.length === 0) {
    return (
      <div className="wl-empty-page">
        <div className="wl-terminal">
          <div className="wl-tl wl-tl--dim">&gt; EARLYBELL SIGNAL DASHBOARD v2.0</div>
          <div className="wl-tl wl-tl--dim">&gt; INITIALIZING...</div>
          <div className="wl-tl">
            {!user ? '> NOT AUTHENTICATED' : '> WATCHLIST EMPTY'}
          </div>
          <div className="wl-tl wl-tl--cursor">_</div>
        </div>
        <p className="wl-empty-msg">
          {!user
            ? 'Sign in and add up to 3 tickers to unlock your personal signal dashboard.'
            : 'Add up to 3 tickers to unlock your personal signal dashboard.'}
        </p>
        {!user && (
          <button className="wl-signin-btn" onClick={onOpenAuth}>Sign In</button>
        )}
        {user && watchlist.length === 0 && (
          <div className="wl-empty-search">
            <TickerSearch onPick={handlePickTicker} limitMsg={limitMsg} searchBoxRef={searchBoxRef} />
          </div>
        )}
      </div>
    );
  }

  // ── INITIAL LOADING ─────────────────────────────────────────────────────
  if (loading && scanResults.length === 0) {
    return (
      <div className="wl-page">
        <div className="wl-page-hd">
          <span className="wl-page-title">MY WATCHLIST</span>
        </div>
        <div className="wl-scanning-wrap">
          <div className="wl-scanning-term">
            <div className="wl-tl wl-tl--dim">&gt; INITIALIZING SIGNAL SCAN</div>
            <div className="wl-tl wl-tl--blue">&gt; SCANNING {watchlist[scanPhase]}...</div>
            <div className="wl-tl wl-tl--cursor wl-tl--blue">_</div>
          </div>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ───────────────────────────────────────────────────────────
  return (
    <div className="wl-page">
      {/* Page header */}
      <div className="wl-page-hd">
        <span className="wl-page-title">MY WATCHLIST</span>
        <div className="wl-page-hd-right">
          {lastRefreshed && !loading && (
            <span className="wl-refreshed-ts">REFRESHED {formatRefreshed()}</span>
          )}
          {loading ? (
            <span className="wl-scanning-label">&gt; SCANNING {watchlist[scanPhase]}...</span>
          ) : (
            <button className="wl-refresh-btn" onClick={runScan}>
              <FiRefreshCw size={11} /> REFRESH
            </button>
          )}
        </div>
      </div>

      {/* Featured card */}
      {featured && (
        <TickerCard
          data={featured}
          moversEntry={moversMap[featured.ticker]}
          featured
          onRemove={() => removeTicker(featured.ticker)}
          liveQuote={liveQuotes[featured.ticker]}
        />
      )}

      {/* Secondary cards */}
      {secondary.length > 0 && (
        <div className="wl-secondary-grid">
          {secondary.map(d => (
            <TickerCard
              key={d.ticker}
              data={d}
              moversEntry={moversMap[d.ticker]}
              featured={false}
              onRemove={() => removeTicker(d.ticker)}
              liveQuote={liveQuotes[d.ticker]}
            />
          ))}
        </div>
      )}

      {/* Add ticker */}
      {watchlist.length < maxTickers && (
        <div className="wl-add-row">
          {!addOpen ? (
            <button className="wl-add-btn" onClick={() => setAddOpen(true)}>
              <FiPlus size={11} /> ADD TICKER
            </button>
          ) : (
            <div className="wl-add-open">
              <TickerSearch onPick={handlePickTicker} limitMsg={limitMsg} searchBoxRef={searchBoxRef} />
              <button className="wl-add-cancel" onClick={() => setAddOpen(false)}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
