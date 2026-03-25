import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import TICKER_DATA from './tickerData';
import './AlertHistoryView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const LEVEL_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#ff9900',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

const AlertHistoryView = () => {
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/history/all`);
        const data = await response.json();
        if (data.error) {
          setError(data.error);
        } else {
          setHistory(data);
        }
      } catch (err) {
        console.error('Error fetching alert history:', err);
        setError('Failed to load alert history.');
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="loading-state">Loading alert history...</div>;
  if (error) return <div className="error-state">{error}</div>;

  const tickers = Object.entries(history).map(([ticker, records]) => {
    const latest = records[records.length - 1];
    return {
      ticker,
      records,
      latestScore: latest.early_warning_score,
      latestLevel: latest.alert_level,
    };
  }).sort((a, b) => b.latestScore - a.latestScore);

  if (tickers.length === 0) {
    return <div className="empty-state">No alert history available yet. Data is recorded hourly.</div>;
  }

  return (
    <div className="alert-history-view">
      <h2 className="view-title">Alert History (7 Days)</h2>
      <div className="history-grid">
        {tickers.map(({ ticker, records, latestScore, latestLevel }) => {
          const meta = TICKER_DATA[ticker] || {};
          const lineColor = LEVEL_COLORS[latestLevel] || '#22c55e';
          return (
            <div key={ticker} className="history-card">
              <div className="history-card-header">
                <div className="history-ticker-info">
                  <span className="history-ticker">{ticker}</span>
                  {meta.name && <span className="history-name">{meta.name}</span>}
                </div>
                <div className="history-score-badge" style={{ backgroundColor: lineColor }}>
                  {latestScore.toFixed(1)}
                </div>
              </div>
              <div className="history-sparkline">
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={records}>
                    <Line
                      type="monotone"
                      dataKey="early_warning_score"
                      stroke={lineColor}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px' }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: lineColor }}
                      formatter={(value) => [value.toFixed(1), 'Score']}
                      labelFormatter={(_, payload) => {
                        if (payload && payload[0]) {
                          const d = new Date(payload[0].payload.recorded_at);
                          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        }
                        return '';
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="history-card-footer">
                <span className={`history-level-badge level-${latestLevel?.toLowerCase()}`}>{latestLevel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertHistoryView;
