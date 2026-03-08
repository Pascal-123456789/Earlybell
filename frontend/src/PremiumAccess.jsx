import React, { useState } from 'react';
import { FaChartLine, FaBell, FaRobot } from 'react-icons/fa';
import './PremiumAccess.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const features = [
  {
    icon: <FaChartLine size={32} />,
    title: 'Walk-Forward Backtesting',
    description: 'Test strategies against historical data with rolling windows to validate edge before risking capital.',
  },
  {
    icon: <FaBell size={32} />,
    title: 'Real-Time Alert Push',
    description: 'Instant push notifications when tickers hit CRITICAL level — never miss a breakout signal.',
  },
  {
    icon: <FaRobot size={32} />,
    title: 'AI Trade Signals',
    description: 'ML-powered entry/exit signals with confidence scores based on multi-factor analysis.',
  },
];

const PremiumAccess = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE_URL}/waitlist/premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus('error');
      } else {
        setStatus('success');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="content-area premium-access-page">
      <div className="premium-header">
        <h2>Premium Access</h2>
        <p className="premium-tagline">Powerful tools for serious traders — coming soon.</p>
      </div>

      <div className="premium-features-grid">
        {features.map((f) => (
          <div key={f.title} className="premium-feature-card">
            <div className="premium-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </div>
        ))}
      </div>

      <div className="premium-waitlist-section">
        <h3>Get Early Access</h3>
        <p>Join the waitlist and be the first to know when premium features launch.</p>
        <form className="premium-waitlist-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="subscribe-input"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="subscribe-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
          </button>
        </form>
        {status === 'success' && (
          <p className="subscribe-msg success">You're on the list! We'll notify you when premium launches.</p>
        )}
        {status === 'error' && (
          <p className="subscribe-msg error">Something went wrong. Please try again.</p>
        )}
      </div>
    </div>
  );
};

export default PremiumAccess;
