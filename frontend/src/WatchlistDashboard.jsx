import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { useAuth } from './AuthContext';
import { useWatchlist } from './useWatchlist';
import TICKER_DATA from './tickerData';
import './WatchlistDashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const FINNHUB_KEY  = import.meta.env.VITE_FINNHUB_API_KEY;

const scoreToLevel = (s) => {
  if (s >= 7) return 'CRITICAL';
  if (s >= 5) return 'HIGH';
  if (s >= 3) return 'MEDIUM';
  return 'LOW';
};

const LEVEL_SHORT = { CRITICAL: 'CRIT', HIGH: 'HIGH', MEDIUM: 'MED', LOW: 'LOW' };

function getDirection(d) {
  if (!d) return 'NEUTRAL';
  let score = 0;
  const cpRatio   = d.options_signal?.call_put_ratio || 0;
  const callVol   = d.options_signal?.total_call_volume || 0;
  const putVol    = d.options_signal?.total_put_volume  || 0;
  const pricePct  = d.price_change_pct || 0;
  const sentiment = d.sentiment_score || 0;
  const social    = d.social_signal?.score || 0;
  if (cpRatio > 2.0)          score += 2; else if (cpRatio > 0 && cpRatio < 0.7) score -= 2;
  if (callVol > putVol * 1.5) score += 1; else if (putVol > callVol * 1.5)       score -= 1;
  if (pricePct > 1.5)         score += 1; else if (pricePct < -1.5)              score -= 1;
  if (sentiment > 0.3)        score += 0.5; else if (sentiment < -0.3)           score -= 0.5;
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
    const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`);
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

// ── Signal tile (bordered box) ───────────────────────────────────────────────
function SignalBox({ label, score, sub }) {
  const s = Math.max(0, Math.min(score || 0, 10));
  return (
    <div className="wl-sig-box">
      <span className="wl-sig-lbl">{label}</span>
      <span className="wl-sig-val">{s.toFixed(0)}/10</span>
      <span className="wl-sig-sub">{sub || '—'}</span>
    </div>
  );
}

// ── Score bar row ────────────────────────────────────────────────────────────
function ScoreRow({ score, short }) {
  const level = scoreToLevel(score);
  return (
    <div className="wl-score-row">
      <span className="wl-score-lbl">{short ? 'SCORE' : 'EARLY WARNING SCORE'}</span>
      <div className="wl-score-track">
        <div className="wl-score-fill" style={{ width: `${Math.min((score / 10) * 100, 100)}%` }} />
      </div>
      <span className="wl-score-val">
        {score.toFixed(1)}&nbsp;·&nbsp;{short ? LEVEL_SHORT[level] : level}
      </span>
    </div>
  );
}

// ── Direction line ───────────────────────────────────────────────────────────
function DirLine({ data }) {
  const dir = getDirection(data);
  const arrow = dir === 'BULLISH' ? '↑' : dir === 'BEARISH' ? '↓' : '→';
  return (
    <div className={`wl-dir wl-dir--${dir.toLowerCase()}`}>
      <span className="wl-dir-arrow">{arrow}</span>
      <span className="wl-dir-txt">{dir}</span>
    </div>
  );
}

// ── Single news row ──────────────────────────────────────────────────────────
function NewsRow({ art }) {
  const dotColor = art.sentiment === 'positive' ? '#22c55e'
    : art.sentiment === 'negative' ? '#ef4444' : '#334155';
  return (
    <a href={art.url} target="_blank" rel="noopener noreferrer" className="wl-news-row">
      <div className="wl-news-hline">{art.headline}</div>
      <div className="wl-news-meta">
        <span className="wl-news-src">{art.source}</span>
        <span className="wl-news-sep">·</span>
        <span className="wl-news-time">{formatTimeAgo(art.published_at)}</span>
        <span className="wl-news-dot" style={{ background: dotColor }} />
      </div>
    </a>
  );
}

// ── Card header (shared) ─────────────────────────────────────────────────────
function CardHeader({ data, liveQuote, featured, onRemove }) {
  const name  = TICKER_DATA[data.ticker]?.name || '';
  const price = data.current_price || liveQuote?.price || null;
  const pct   = data.price_change_pct ?? liveQuote?.pct ?? null;
  const pctClass = pct > 0 ? 'up' : pct < 0 ? 'dn' : 'flat';

  return (
    <div className="wl-card-hd">
      <div className="wl-hd-row1">
        <div className="wl-hd-sym-wrap">
          <span className={`wl-sym${featured ? '' : ' wl-sym--sm'}`}>{data.ticker}</span>
          {featured && <span className="wl-badge">★ TOP SIGNAL</span>}
        </div>
        <div className="wl-hd-price-wrap">
          {price != null && (
            <span className={`wl-price${featured ? '' : ' wl-price--sm'}`}>
              ${price.toFixed(2)}
            </span>
          )}
          <button
            className="wl-remove-btn"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title={`Remove ${data.ticker}`}
          >
            <FiX size={11} />
          </button>
        </div>
      </div>
      <div className="wl-hd-row2">
        <span className="wl-company">{name}</span>
        {pct != null && (
          <span className={`wl-pct wl-pct--${pctClass}`}>
            {pct > 0 ? '↑' : pct < 0 ? '↓' : ''}{Math.abs(pct).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Featured card ────────────────────────────────────────────────────────────
function FeaturedCard({ data, moversEntry, liveQuote, onRemove }) {
  const score         = data.early_warning_score || 0;
  const sentimentScore = data.sentiment_score != null ? ((data.sentiment_score + 1) / 2) * 10 : 0;
  const moverScore    = moversEntry?.mover_score || 0;
  const moverSub      = moverScore > 0 && moversEntry
    ? `${moversEntry.label}${moversEntry.momentum_pct != null
        ? ` ${moversEntry.momentum_pct > 0 ? '+' : ''}${moversEntry.momentum_pct.toFixed(1)}%` : ''}`
    : null;
  const articles = (data.recent_articles || []).slice(0, 3);

  return (
    <div className="wl-card wl-card--featured">
      <CardHeader data={data} liveQuote={liveQuote} featured onRemove={onRemove} />
      <ScoreRow score={score} short={false} />

      <div className="wl-sig-grid wl-sig-grid--3">
        <SignalBox
          label="OPTIONS FLOW"
          score={data.options_signal?.score || 0}
          sub={data.options_signal?.call_put_ratio > 0
            ? `${data.options_signal.call_put_ratio.toFixed(1)}× C/P` : null}
        />
        <SignalBox
          label="VOLUME SPIKE"
          score={data.volume_signal?.score || 0}
          sub={data.volume_signal?.volume_ratio_today > 0
            ? `${data.volume_signal.volume_ratio_today.toFixed(2)}× avg` : null}
        />
        <SignalBox
          label="SOCIAL BUZZ"
          score={data.social_signal?.score || 0}
          sub={data.social_signal?.mentions > 0
            ? `${data.social_signal.mentions} mentions` : null}
        />
        <SignalBox
          label="INSIDER BUY"
          score={data.insider_signal?.score || 0}
          sub={data.insider_signal?.purchases_30d > 0
            ? `${data.insider_signal.purchases_30d} purchases` : 'no filings'}
        />
        <SignalBox label="SENTIMENT"     score={sentimentScore} sub={data.news_count > 0 ? `${data.news_count} articles` : null} />
        <SignalBox label="PREDICTED MOVE" score={moverScore}    sub={moverSub} />
      </div>

      <DirLine data={data} />

      <div className="wl-news-section">
        <div className="wl-news-hd">LATEST NEWS</div>
        {articles.length === 0
          ? <div className="wl-news-empty">&gt; NO RECENT COVERAGE FOUND</div>
          : articles.map((art, i) => <NewsRow key={i} art={art} />)}
      </div>
    </div>
  );
}

// ── Secondary card (clickable to promote to featured) ────────────────────────
function SecondaryCard({ data, liveQuote, onRemove, onSwap }) {
  const score          = data.early_warning_score || 0;
  const sentimentScore = data.sentiment_score != null ? ((data.sentiment_score + 1) / 2) * 10 : 0;
  const articles       = (data.recent_articles || []).slice(0, 2);

  return (
    <div className="wl-secondary-wrap" onClick={onSwap}>
      <div className="wl-card wl-card--secondary">
        <CardHeader data={data} liveQuote={liveQuote} featured={false} onRemove={onRemove} />
        <ScoreRow score={score} short />

        <div className="wl-sig-grid wl-sig-grid--2">
          <SignalBox
            label="OPTIONS FLOW"
            score={data.options_signal?.score || 0}
            sub={data.options_signal?.call_put_ratio > 0
              ? `${data.options_signal.call_put_ratio.toFixed(1)}× C/P` : null}
          />
          <SignalBox
            label="VOLUME SPIKE"
            score={data.volume_signal?.score || 0}
            sub={data.volume_signal?.volume_ratio_today > 0
              ? `${data.volume_signal.volume_ratio_today.toFixed(2)}× avg` : null}
          />
          <SignalBox
            label="SOCIAL BUZZ"
            score={data.social_signal?.score || 0}
            sub={data.social_signal?.mentions > 0
              ? `${data.social_signal.mentions} mentions` : null}
          />
          <SignalBox label="SENTIMENT" score={sentimentScore} sub={data.news_count > 0 ? `${data.news_count} articles` : null} />
        </div>

        <DirLine data={data} />

        <div className="wl-news-section">
          <div className="wl-news-hd">LATEST NEWS</div>
          {articles.length === 0
            ? <div className="wl-news-empty">&gt; NO RECENT COVERAGE FOUND</div>
            : articles.map((art, i) => <NewsRow key={i} art={art} />)}
        </div>
      </div>
      <div className="wl-swap-hint">CLICK TO FOCUS</div>
    </div>
  );
}

// ── Ticker search ────────────────────────────────────────────────────────────
function TickerSearch({ onPick, limitMsg, searchBoxRef }) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [open,      setOpen]      = useState(false);
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
        <div className="wl-search-dd">
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

  const [scanResults,    setScanResults]    = useState([]);
  const [moversMap,      setMoversMap]      = useState({});
  const [loading,        setLoading]        = useState(false);
  const [scanPhase,      setScanPhase]      = useState(0);
  const [lastRefreshed,  setLastRefreshed]  = useState(null);
  const [liveQuotes,     setLiveQuotes]     = useState({});
  const [featuredTicker, setFeaturedTicker] = useState(null);
  const [addOpen,        setAddOpen]        = useState(false);
  const [limitMsg,       setLimitMsg]       = useState(null);
  const searchBoxRef = useRef(null);

  // Scanning animation — cycles ticker name every 1.5s
  useEffect(() => {
    if (!loading || watchlist.length === 0) return;
    const id = setInterval(() => setScanPhase(p => (p + 1) % watchlist.length), 1500);
    return () => clearInterval(id);
  }, [loading, watchlist]);

  // Auto-select featured ticker when results arrive; preserve manual choice
  useEffect(() => {
    if (scanResults.length === 0) return;
    setFeaturedTicker(prev => {
      if (prev && scanResults.some(r => r.ticker === prev)) return prev;
      const top = [...scanResults].sort((a, b) =>
        (b.early_warning_score || 0) - (a.early_warning_score || 0))[0];
      return top?.ticker || null;
    });
  }, [scanResults]);

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

  const wlKey = watchlist.join(',');
  useEffect(() => {
    if (watchlist.length > 0) runScan();
  }, [wlKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close search dropdown on outside click
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
    if (mins < 1)   return 'just now';
    if (mins === 1) return '1m ago';
    return `${mins}m ago`;
  };

  // Derive featured / secondary from featuredTicker state
  const featuredData  = scanResults.find(r => r.ticker === featuredTicker)
    || [...scanResults].sort((a, b) => (b.early_warning_score || 0) - (a.early_warning_score || 0))[0]
    || null;
  const secondaryData = scanResults.filter(r => r.ticker !== featuredData?.ticker);

  // ── UNAUTHENTICATED / EMPTY ─────────────────────────────────────────────
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
      <div className="wl-loader-page">
        <div className="wl-loader-wrap">
          <svg width="160" height="80" viewBox="0 0 160 80" aria-hidden="true">
            <rect className="wl-bar wl-bar--1" x="19"  y="40" width="18" height="40" rx="3" />
            <rect className="wl-bar wl-bar--2" x="45"  y="15" width="18" height="65" rx="3" />
            <rect className="wl-bar wl-bar--3" x="71"  y="0"  width="18" height="80" rx="3" />
            <rect className="wl-bar wl-bar--4" x="97"  y="25" width="18" height="55" rx="3" />
            <rect className="wl-bar wl-bar--5" x="123" y="45" width="18" height="35" rx="3" />
          </svg>
          <div className="wl-loader-text">
            <div>&gt; INITIALIZING SIGNAL SCAN</div>
            <div>&gt; SCANNING {watchlist[scanPhase] || '...'}...</div>
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
        <span className="wl-page-title">
          MY WATCHLIST · {watchlist.length} TICKER{watchlist.length !== 1 ? 'S' : ''}
        </span>
        <div className="wl-page-hd-right">
          {lastRefreshed && !loading && (
            <span className="wl-refreshed-ts">REFRESHED {formatRefreshed()}</span>
          )}
          {loading ? (
            <span className="wl-scanning-lbl">&gt; SCANNING {watchlist[scanPhase]}...</span>
          ) : (
            <button className="wl-refresh-btn" onClick={runScan}>
              <FiRefreshCw size={11} /> REFRESH
            </button>
          )}
        </div>
      </div>

      {/* Featured card */}
      {featuredData && (
        <FeaturedCard
          data={featuredData}
          moversEntry={moversMap[featuredData.ticker]}
          liveQuote={liveQuotes[featuredData.ticker]}
          onRemove={() => removeTicker(featuredData.ticker)}
        />
      )}

      {/* Secondary cards grid */}
      {secondaryData.length > 0 && (
        <div className="wl-secondary-grid">
          {secondaryData.map(d => (
            <SecondaryCard
              key={d.ticker}
              data={d}
              liveQuote={liveQuotes[d.ticker]}
              onRemove={() => removeTicker(d.ticker)}
              onSwap={() => setFeaturedTicker(d.ticker)}
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
