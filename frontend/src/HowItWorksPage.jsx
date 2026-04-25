import React from 'react';
import './HowItWorksPage.css';

const SIGNALS = [
    { name: 'OPTIONS FLOW',   weight: '40%', desc: 'Unusual call vs put buying. Smart money positioning often shows up here first.' },
    { name: 'VOLUME SPIKE',   weight: '35%', desc: "Today's volume vs 30-day average. A sudden spike means significantly elevated trading activity." },
    { name: 'SOCIAL BUZZ',    weight: '25%', desc: 'Reddit and WallStreetBets mention spikes. When retail piles in, it shows up here.' },
    { name: 'INSIDER ACTIVITY', weight: null, desc: 'SEC EDGAR filings. Cluster buying by insiders is one of the strongest signals available.' },
    { name: 'SENTIMENT',      weight: null, desc: 'News article sentiment scored via NLP across the past 7 days.' },
    { name: 'PREDICTED MOVE', weight: null, desc: 'Momentum-based mover score combining price action and signal strength.' },
];

const LEVELS = [
    { label: 'CRITICAL', color: '#ef4444', bg: '#1a0808', border: '#3a1515', desc: 'Score 7+. Multiple signals firing hard — something significant may be forming.' },
    { label: 'HIGH',     color: '#f59e0b', bg: '#1a1208', border: '#3a2a10', desc: 'Score 5–7. Strong unusual activity detected across signals.' },
    { label: 'MEDIUM',   color: '#3b82f6', bg: '#0f1f3d', border: '#1a3a6b', desc: 'Score 3–5. Some unusual activity worth monitoring.' },
    { label: 'LOW',      color: '#22c55e', bg: '#052e16', border: '#166534', desc: 'Score 0–3. Normal market behaviour, nothing unusual.' },
];

const MOVERS = [
    { label: 'BREAKOUT', color: '#22c55e', desc: 'Mover score 4.0+. High probability of significant price movement.' },
    { label: 'WATCH',    color: '#f59e0b', desc: 'Mover score 2.0–4.0. Building momentum, worth monitoring.' },
    { label: 'NEUTRAL',  color: '#475569', desc: 'Below 2.0. No strong directional signals.' },
];

export default function HowItWorksPage() {
    return (
        <div className="hiw-page">
            <div className="hiw-page-hd">
                <span className="hiw-page-title">HOW EARLYBELL WORKS</span>
            </div>

            {/* Card 1 — Overview */}
            <div className="hiw-card">
                <div className="hiw-section-label">OVERVIEW</div>
                <p className="hiw-body">
                    EarlyBell scans 100+ US stocks every hour for unusual activity that may signal a
                    significant price move. Options flow, volume, social sentiment, insider activity, and
                    news are combined into a single score so you can spot opportunities fast.
                </p>
            </div>

            {/* Card 2 — Alert Levels */}
            <div className="hiw-card">
                <div className="hiw-section-label">ALERT LEVELS</div>
                <div className="hiw-level-list">
                    {LEVELS.map(lvl => (
                        <div key={lvl.label} className="hiw-level-row">
                            <span
                                className="hiw-badge"
                                style={{ color: lvl.color, background: lvl.bg, borderColor: lvl.border }}
                            >
                                {lvl.label}
                            </span>
                            <span className="hiw-level-desc">{lvl.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Card 3 — The Six Signals */}
            <div className="hiw-card">
                <div className="hiw-section-label">THE SIX SIGNALS</div>
                <div className="hiw-signal-list">
                    {SIGNALS.map(sig => (
                        <div key={sig.name} className="hiw-signal-row">
                            <div className="hiw-signal-left">
                                <span className="hiw-signal-name">{sig.name}</span>
                                {sig.weight && <span className="hiw-signal-weight">{sig.weight}</span>}
                            </div>
                            <span className="hiw-signal-desc">{sig.desc}</span>
                        </div>
                    ))}
                </div>
                <p className="hiw-note">
                    The combined alert score is a weighted average: 40% options + 35% volume + 25% social.
                    Insider, sentiment and predicted move are displayed as supplementary signals.
                </p>
            </div>

            {/* Card 4 — Predicted Movers */}
            <div className="hiw-card">
                <div className="hiw-section-label">PREDICTED MOVERS</div>
                <div className="hiw-level-list">
                    {MOVERS.map(m => (
                        <div key={m.label} className="hiw-level-row">
                            <span
                                className="hiw-badge"
                                style={{ color: m.color, background: '#0d1526', borderColor: '#1a2740' }}
                            >
                                {m.label}
                            </span>
                            <span className="hiw-level-desc">{m.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Card 5 — News Radar */}
            <div className="hiw-card">
                <div className="hiw-section-label">NEWS RADAR</div>
                <p className="hiw-body">
                    News Radar aggregates up to 30 market-moving headlines per hour and cross-references
                    them with signal activity. Signal × Catalyst confluences highlight tickers where both
                    unusual market activity and a news catalyst are present simultaneously — the strongest
                    setup on the platform.
                </p>
            </div>

            {/* Card 6 — My Watchlist */}
            <div className="hiw-card">
                <div className="hiw-section-label">MY WATCHLIST</div>
                <p className="hiw-body">
                    Signed-in users can track up to 3 custom tickers. Each watched ticker receives its own
                    full signal scan — options, volume, social, insider, sentiment — plus a live news feed.
                    The highest-scoring ticker is featured at the top of your dashboard.
                </p>
            </div>

            {/* Card 7 — Other Features */}
            <div className="hiw-card">
                <div className="hiw-section-label">OTHER FEATURES</div>
                <div className="hiw-signal-list">
                    <div className="hiw-signal-row">
                        <div className="hiw-signal-left">
                            <span className="hiw-signal-name">HEATMAP</span>
                        </div>
                        <span className="hiw-signal-desc">
                            Tile size reflects signal strength. Border colour indicates alert level (red = CRITICAL,
                            orange = HIGH). Price change shown as secondary info.
                        </span>
                    </div>
                    <div className="hiw-signal-row">
                        <div className="hiw-signal-left">
                            <span className="hiw-signal-name">POLYMARKET</span>
                        </div>
                        <span className="hiw-signal-desc">
                            Purple badges show prediction market odds for macro events that could impact the stock.
                        </span>
                    </div>
                </div>
            </div>

            <p className="hiw-footer">
                Not financial advice. Use this as one data point among many. Always do your own research before making any trades.
            </p>
        </div>
    );
}
