import React, { useState, useEffect } from 'react';
import './App.css';
import { FiActivity, FiRadio, FiInfo, FiLock, FiMail, FiMenu, FiUser, FiSettings } from 'react-icons/fi';
import Scanner from './Scanner';
import WatchlistDashboard from './WatchlistDashboard';
import AlertHistoryView from './AlertHistoryView';
import NewsIntelligence from './NewsIntelligence';
import PremiumAccess from './PremiumAccess';
import AuthModal from './AuthModal';
import ProfilePage from './ProfilePage';
import HowItWorksPage from './HowItWorksPage';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// --- COMPONENT: WelcomeModal ---
const WelcomeModal = ({ onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="welcome-modal" onClick={e => e.stopPropagation()}>
            <div className="welcome-modal-hd">
                <span className="sb-wordmark">
                    <span className="sb-wordmark-early">Early</span><span className="sb-wordmark-bell">Bell</span>
                </span>
                <span className="welcome-modal-sub">MARKET INTELLIGENCE</span>
            </div>
            <p className="welcome-modal-body">
                Real-time signal scanning across options flow, volume spikes, social sentiment, insider activity and news — updated hourly.
            </p>
            <ul className="welcome-modal-bullets">
                <li>&gt; 100+ US stocks scanned every hour</li>
                <li>&gt; News Radar aggregates and ranks market-moving headlines</li>
                <li>&gt; Custom watchlist with full signal breakdown for signed-in users</li>
            </ul>
            <hr className="welcome-modal-divider" />
            <p className="welcome-modal-sources">Data via Finnhub, yfinance, ApeWisdom &amp; EDGAR</p>
            <button className="welcome-modal-cta" onClick={onClose}>ENTER SCANNER →</button>
        </div>
    </div>
);

// --- COMPONENT: TickerDetailModal ---
const TickerDetailModal = ({ modalData, modalLoading, modalError, setModalData, setModalError, polymarketEvents }) => {
    if (!modalData && !modalLoading && !modalError) return null;

    return (
        <div className="modal-overlay" onClick={() => { setModalData(null); setModalError(null); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={() => { setModalData(null); setModalError(null); }}>×</button>
                {modalLoading && <h3>Loading ticker details...</h3>}
                {modalError && <p className="error-message">Error: {modalError}</p>}
                {modalData && (
                    <>
                        <h2>{modalData.ticker}</h2>
                        <div className="modal-stats-grid">
                            <div className="stat-item"><span className="stat-label">Price:</span> <span className="stat-value">${modalData.price || 'N/A'}</span></div>
                            <div className="stat-item"><span className="stat-label">Market Cap:</span> <span className="stat-value">${(modalData.marketCap / 1e9).toFixed(2)}B</span></div>
                            <div className="stat-item"><span className="stat-label">Sector:</span> <span className="stat-value">{modalData.sector || 'N/A'}</span></div>
                        </div>
                        <p className="modal-summary-title">Business Summary:</p>
                        <p className="modal-summary-text">{modalData.summary || 'No summary available.'}</p>

                        {(() => {
                            const events = (polymarketEvents || []).filter(
                                e => e.affected_tickers && e.affected_tickers.includes(modalData.ticker)
                            );
                            if (events.length === 0) return null;
                            return (
                                <div className="polymarket-modal-section">
                                    <h3>Prediction Markets</h3>
                                    {events.map((evt, i) => (
                                        <div key={i} className="polymarket-modal-event">
                                            <p className="polymarket-modal-question">{evt.question}</p>
                                            <div className="polymarket-modal-bar-wrapper">
                                                <div className="polymarket-modal-bar">
                                                    <div
                                                        className="polymarket-modal-bar-fill"
                                                        style={{ width: `${Math.round(evt.probability * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="polymarket-modal-pct">
                                                    {Math.round(evt.probability * 100)}%
                                                </span>
                                            </div>
                                            <div className="polymarket-modal-meta">
                                                <span>24h Vol: ${evt.volume_24h ? evt.volume_24h.toLocaleString() : '0'}</span>
                                                {evt.end_date && (
                                                    <span>Ends: {new Date(evt.end_date).toLocaleDateString()}</span>
                                                )}
                                                {evt.slug && (
                                                    <a
                                                        href={`https://polymarket.com/event/${evt.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="polymarket-modal-link"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        View on Polymarket
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
export default function App() {
    const { user, signOut } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [currentView, setCurrentView] = useState('scanner');
    const [modalData, setModalData] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState(null);
    const [polymarketEvents, setPolymarketEvents] = useState([]);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // First-visit welcome modal
    useEffect(() => {
        if (!localStorage.getItem('earlybell_visited')) setShowWelcome(true);
    }, []);

    // Auto-close sidebar on resize to mobile
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) setIsSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch Polymarket events
    useEffect(() => {
        fetch(`${API_BASE_URL}/polymarket/events`)
            .then(res => res.json())
            .then(events => { if (Array.isArray(events)) setPolymarketEvents(events); })
            .catch(err => console.error('Polymarket fetch error:', err));
    }, []);

    const fetchTickerDetails = async (ticker) => {
        setModalLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/stock/${ticker}`);
            const result = await res.json();
            setModalData(result);
        } catch (e) { setModalError(e.message); }
        finally { setModalLoading(false); }
    };

    const closeWelcome = () => {
        localStorage.setItem('earlybell_visited', 'true');
        setShowWelcome(false);
    };

    const renderContent = () => {
        switch (currentView) {
            case 'scanner':
                return <Scanner polymarketEvents={polymarketEvents} onTickerClick={fetchTickerDetails} onOpenAuth={() => setShowAuthModal(true)} />;
            case 'news':
                return <NewsIntelligence />;
            case 'history':
                return <AlertHistoryView />;
            case 'watchlist':
                return <WatchlistDashboard onOpenAuth={() => setShowAuthModal(true)} />;
            case 'account':
                return <ProfilePage onOpenAuth={() => setShowAuthModal(true)} />;
            case 'premium':
                return <PremiumAccess />;
            case 'how-it-works':
                return <HowItWorksPage />;
            default:
                return null;
        }
    };

    return (
        <div className="App">
            <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                {/* Logo area */}
                <div className="logo-container">
                    <span className="sb-logo-collapsed">EB</span>
                    <div className="sb-wordmark-wrap">
                        <span className="sb-wordmark">
                            <span className="sb-wordmark-early">Early</span><span className="sb-wordmark-bell">Bell</span>
                        </span>
                        <span className="sb-tagline">Market Intelligence</span>
                    </div>
                    <button className="toggle-btn" onClick={() => setIsSidebarOpen(v => !v)} title="Toggle sidebar">
                        <FiMenu />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="nav-menu">
                    <div className="nav-group">
                        <div className={`nav-item ${currentView === 'scanner' ? 'active' : ''}`}
                             onClick={() => setCurrentView('scanner')}>
                            <FiActivity /><span>Scanner</span>
                        </div>
                        <div className={`nav-item ${currentView === 'news' ? 'active' : ''}`}
                             onClick={() => setCurrentView('news')}>
                            <FiRadio /><span>News Radar</span>
                        </div>
                        <div className={`nav-item ${currentView === 'watchlist' ? 'active' : ''}`}
                             onClick={() => setCurrentView('watchlist')}>
                            <FiUser /><span>My Watchlist</span>
                        </div>
                        <div className={`nav-item ${currentView === 'premium' ? 'active' : ''}`}
                             onClick={() => setCurrentView('premium')}>
                            <FiLock /><span>Premium Access</span>
                        </div>
                    </div>

                    <hr className="nav-group-divider" />

                    <div className="nav-group">
                        <div className={`nav-item ${currentView === 'how-it-works' ? 'active' : ''}`}
                             onClick={() => setCurrentView('how-it-works')}>
                            <FiInfo /><span>How It Works</span>
                        </div>
                        <div className={`nav-item ${currentView === 'account' ? 'active' : ''}`}
                             onClick={() => setCurrentView('account')}>
                            <FiSettings /><span>Profile</span>
                        </div>
                        <div className="nav-item"
                             onClick={() => window.location.href = 'mailto:dipbedford@gmail.com?subject=EarlyBell%20Feedback'}>
                            <FiMail /><span>Feedback</span>
                        </div>
                    </div>
                </nav>

                {/* Ad slot */}
                <div className="sb-ad">
                    <span className="sb-ad-label">SPONSORED</span>
                    <div className="sb-ad-frame">
                        <ins
                            className="adsbygoogle"
                            style={{ display: 'block', width: '160px', height: '200px' }}
                            data-ad-client="ca-pub-2538269255745987"
                            data-ad-slot="YOUR_AD_SLOT_ID"
                            data-ad-format="fixed"
                            data-ad-color-scheme="dark"
                        />
                    </div>
                </div>

                {/* Auth section */}
                <div className="sb-auth">
                    {user ? (
                        <>
                            <span className="sb-auth-email">
                                {user.email.length > 20 ? user.email.slice(0, 20) + '…' : user.email}
                            </span>
                            <button className="sb-auth-signout" onClick={signOut}>
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <button className="sb-auth-signin" onClick={() => setShowAuthModal(true)}>
                            Sign In
                        </button>
                    )}
                </div>

                {/* Status bar */}
                <div className="sb-status">
                    <span className="sb-status-dot" />
                    <span className="sb-status-label">Online</span>
                </div>
            </div>

            {isMobile && isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}

            <div className={`main-content ${isSidebarOpen ? 'shifted' : 'collapsed'}`}>
                {!isSidebarOpen && (
                    <button className="toggle-btn-top" onClick={() => setIsSidebarOpen(true)}>
                        <FiMenu />
                    </button>
                )}
                {renderContent()}
            </div>

            <TickerDetailModal
                modalData={modalData}
                modalLoading={modalLoading}
                modalError={modalError}
                setModalData={setModalData}
                setModalError={setModalError}
                polymarketEvents={polymarketEvents}
            />

            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
            {showWelcome && <WelcomeModal onClose={closeWelcome} />}

            <div className="disclaimer-footer">
                Not financial advice. Use as one data point among many. Always do your own research.
            </div>
        </div>
    );
}
