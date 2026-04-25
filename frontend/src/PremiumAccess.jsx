import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './PremiumAccess.css';

/*
 * Migration — create the waitlist table if it doesn't exist:
 *
 *   CREATE TABLE IF NOT EXISTS premium_waitlist (
 *     email      text PRIMARY KEY,
 *     created_at timestamptz DEFAULT now()
 *   );
 */

const WAITLIST_KEY = 'earlybell_waitlist_submitted';

const FEATURES = [
    {
        label: 'BACKTESTING',
        name: 'Walk-Forward Backtesting',
        desc: 'Test strategies against historical signal data with rolling windows to validate edge before risking capital.',
        icon: (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="3"  y="18" width="4" height="7"  rx="1" fill="#3b82f6" opacity="0.5" />
                <rect x="9"  y="12" width="4" height="13" rx="1" fill="#3b82f6" opacity="0.7" />
                <rect x="15" y="7"  width="4" height="18" rx="1" fill="#3b82f6" />
                <rect x="21" y="10" width="4" height="15" rx="1" fill="#3b82f6" opacity="0.8" />
                <polyline points="3,18 9,12 15,7 21,10" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        label: 'ALERTS',
        name: 'Real-Time Alert Push',
        desc: 'Instant push and email notifications when watched tickers hit your score threshold — never miss a breakout.',
        icon: (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 4 C9 4 6 8 6 13 L6 18 L4 20 L24 20 L22 18 L22 13 C22 8 19 4 14 4Z" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                <path d="M11 20 C11 21.7 12.3 23 14 23 C15.7 23 17 21.7 17 20" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <circle cx="20" cy="8" r="3" fill="#ef4444" />
            </svg>
        ),
    },
    {
        label: 'AI SIGNALS',
        name: 'AI Trade Signals',
        desc: 'ML-powered entry and exit signals with confidence scores based on multi-factor analysis.',
        icon: (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="3" fill="#3b82f6" />
                <circle cx="6"  cy="8"  r="2" stroke="#3b82f6" strokeWidth="1.2" fill="none" />
                <circle cx="22" cy="8"  r="2" stroke="#3b82f6" strokeWidth="1.2" fill="none" />
                <circle cx="6"  cy="20" r="2" stroke="#3b82f6" strokeWidth="1.2" fill="none" />
                <circle cx="22" cy="20" r="2" stroke="#3b82f6" strokeWidth="1.2" fill="none" />
                <line x1="8"  y1="9"  x2="12" y2="13" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
                <line x1="20" y1="9"  x2="16" y2="13" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
                <line x1="8"  y1="19" x2="12" y2="15" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
                <line x1="20" y1="19" x2="16" y2="15" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
            </svg>
        ),
    },
];

export default function PremiumAccess() {
    const [email, setEmail]   = useState('');
    const [status, setStatus] = useState(
        localStorage.getItem(WAITLIST_KEY) ? 'already' : null
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || status === 'already') return;
        setStatus('loading');
        const { error } = await supabase
            .from('premium_waitlist')
            .upsert({ email, created_at: new Date().toISOString() });
        if (error) {
            setStatus('error');
        } else {
            localStorage.setItem(WAITLIST_KEY, '1');
            setStatus('success');
        }
    };

    return (
        <div className="pa-page">
            {/* Page header */}
            <div className="pa-page-hd">
                <span className="pa-page-title">PREMIUM ACCESS</span>
                <span className="pa-coming-soon">COMING SOON</span>
            </div>

            <p className="pa-subheading">Advanced tools for serious traders.</p>

            {/* Feature cards */}
            <div className="pa-feature-grid">
                {FEATURES.map(f => (
                    <div key={f.label} className="pa-feature-card">
                        <div className="pa-feature-label">{f.label}</div>
                        <div className="pa-feature-icon">{f.icon}</div>
                        <div className="pa-feature-name">{f.name}</div>
                        <div className="pa-feature-desc">{f.desc}</div>
                    </div>
                ))}
            </div>

            {/* Waitlist card */}
            <div className="pa-waitlist-card">
                <div className="pa-waitlist-label">GET EARLY ACCESS</div>
                <p className="pa-waitlist-text">
                    Join the waitlist. Be the first to know when premium features launch.
                </p>
                <p className="pa-waitlist-proof">Join 50+ traders already on the waitlist.</p>

                {status === 'success' || status === 'already' ? (
                    <p className="pa-status pa-status--ok">
                        {status === 'success'
                            ? '> YOU\'RE ON THE LIST'
                            : '> ALREADY REGISTERED'}
                    </p>
                ) : (
                    <form className="pa-waitlist-form" onSubmit={handleSubmit}>
                        <input
                            className="pa-input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus(null); }}
                            required
                        />
                        <button
                            className="pa-join-btn"
                            type="submit"
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? 'JOINING...' : 'JOIN WAITLIST →'}
                        </button>
                    </form>
                )}

                {status === 'error' && (
                    <p className="pa-status pa-status--err">&gt; Something went wrong — try again</p>
                )}
            </div>
        </div>
    );
}
