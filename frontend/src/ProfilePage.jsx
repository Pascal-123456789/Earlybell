import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import './ProfilePage.css';

/*
 * Migration — run against your Supabase project if these columns don't exist:
 *
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username        text;
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_alerts    boolean DEFAULT true;
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inapp_alerts    boolean DEFAULT true;
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alert_threshold float   DEFAULT 6.0;
 */

function Toggle({ checked, onChange }) {
    return (
        <label className="pf-toggle">
            <input type="checkbox" checked={checked} onChange={onChange} />
            <span className="pf-toggle-track">
                <span className="pf-toggle-thumb" />
            </span>
        </label>
    );
}

export default function ProfilePage({ onOpenAuth }) {
    const { user, signOut } = useAuth();

    // Profile
    const [username, setUsername]             = useState('');
    const [originalUsername, setOriginalUsername] = useState('');
    const [profileStatus, setProfileStatus]   = useState(null);

    // Notifications
    const [emailAlerts, setEmailAlerts]       = useState(true);
    const [inappAlerts, setInappAlerts]       = useState(true);
    const [alertThreshold, setAlertThreshold] = useState(6.0);
    const [notifStatus, setNotifStatus]       = useState(null);

    // Security
    const [resetStatus, setResetStatus]       = useState(null);

    // Danger zone
    const [deleteStep, setDeleteStep]         = useState(false);
    const [deleteInput, setDeleteInput]       = useState('');
    const [deleteStatus, setDeleteStatus]     = useState(null);

    const usernameDirty = username !== originalUsername;
    const fillPct = `${((alertThreshold - 1) / 9) * 100}%`;

    useEffect(() => {
        if (!user) return;
        supabase
            .from('profiles')
            .select('username, email_alerts, inapp_alerts, alert_threshold')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (!data) return;
                const u = data.username || '';
                setUsername(u);
                setOriginalUsername(u);
                setEmailAlerts(data.email_alerts ?? true);
                setInappAlerts(data.inapp_alerts ?? true);
                setAlertThreshold(data.alert_threshold ?? 6.0);
            });
    }, [user]);

    const saveProfile = async () => {
        if (!user || !usernameDirty) return;
        setProfileStatus('saving');
        const { error } = await supabase
            .from('profiles')
            .update({ username, updated_at: new Date().toISOString() })
            .eq('id', user.id);
        if (error) {
            setProfileStatus('error');
        } else {
            setOriginalUsername(username);
            setProfileStatus('saved');
            setTimeout(() => setProfileStatus(null), 3000);
        }
    };

    const saveNotifications = async () => {
        if (!user) return;
        setNotifStatus('saving');
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email_alerts: emailAlerts,
                inapp_alerts: inappAlerts,
                alert_threshold: alertThreshold,
                updated_at: new Date().toISOString(),
            });
        setNotifStatus(error ? 'error' : 'saved');
        if (!error) setTimeout(() => setNotifStatus(null), 3000);
    };

    const handlePasswordReset = async () => {
        setResetStatus('sending');
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: window.location.origin,
        });
        setResetStatus(error ? 'error' : 'sent');
    };

    const handleDeleteConfirm = async () => {
        if (deleteInput !== 'DELETE') return;
        setDeleteStatus('deleting');
        await supabase.from('profiles').delete().eq('id', user.id);
        // supabase.auth.admin.deleteUser() requires service role — not available client-side
        setDeleteStatus('contact_support');
    };

    if (!user) {
        return (
            <div className="pf-gate">
                <div className="pf-gate-heading">PROFILE</div>
                <h2 className="pf-gate-title">Sign in to manage your account</h2>
                <p className="pf-gate-sub">
                    View and update your profile, notification preferences, and security settings.
                </p>
                <button className="pf-signin-btn" onClick={onOpenAuth}>Sign In</button>
            </div>
        );
    }

    const emailVerified = user.email_confirmed_at || user.confirmed_at;
    const memberSince   = user.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
        : null;

    return (
        <div className="pf-page">

            {/* ── Page header ── */}
            <div className="pf-page-hd">
                <span className="pf-page-title">ACCOUNT SETTINGS</span>
                <span className="pf-page-email">{user.email}</span>
            </div>

            {/* ── Section 1: Profile ── */}
            <div className="pf-card">
                <div className="pf-section-label">PROFILE</div>

                <div className="pf-field">
                    <label className="pf-label">EMAIL</label>
                    <div className="pf-input-row">
                        <input className="pf-input pf-input--readonly" type="email" value={user.email} readOnly />
                        {emailVerified && <span className="pf-verified">VERIFIED</span>}
                    </div>
                </div>

                <div className="pf-field">
                    <label className="pf-label">USERNAME</label>
                    <input
                        className="pf-input"
                        type="text"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setProfileStatus(null); }}
                        placeholder="Choose a username"
                        maxLength={32}
                    />
                </div>

                {memberSince && <div className="pf-meta">Member since {memberSince}</div>}

                <div className="pf-action-row">
                    <button
                        className="pf-save-btn"
                        onClick={saveProfile}
                        disabled={!usernameDirty || profileStatus === 'saving'}
                    >
                        {profileStatus === 'saving' ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                    {profileStatus === 'saved' && <span className="pf-status pf-status--ok">&gt; SAVED</span>}
                    {profileStatus === 'error'  && <span className="pf-status pf-status--err">&gt; ERROR — try again</span>}
                </div>
            </div>

            {/* ── Section 2: Notifications ── */}
            <div className="pf-card">
                <div className="pf-section-label">NOTIFICATIONS</div>

                <div className="pf-toggle-row">
                    <div className="pf-toggle-info">
                        <span className="pf-toggle-name">EMAIL ALERTS</span>
                        <span className="pf-toggle-desc">Receive an email when a watched ticker crosses your threshold</span>
                    </div>
                    <Toggle checked={emailAlerts} onChange={e => { setEmailAlerts(e.target.checked); setNotifStatus(null); }} />
                </div>

                <div className="pf-toggle-row">
                    <div className="pf-toggle-info">
                        <span className="pf-toggle-name">IN-APP ALERTS</span>
                        <span className="pf-toggle-desc">See a badge and banner when a watched ticker crosses your threshold</span>
                    </div>
                    <Toggle checked={inappAlerts} onChange={e => { setInappAlerts(e.target.checked); setNotifStatus(null); }} />
                </div>

                <div className="pf-slider-block">
                    <div className="pf-slider-hd">
                        <span className="pf-label">ALERT THRESHOLD</span>
                        <span className="pf-slider-val">&gt; {alertThreshold.toFixed(1)}</span>
                    </div>
                    <input
                        className="pf-slider"
                        type="range"
                        min={1} max={10} step={0.5}
                        value={alertThreshold}
                        style={{ '--fill': fillPct }}
                        onChange={e => { setAlertThreshold(parseFloat(e.target.value)); setNotifStatus(null); }}
                    />
                    <span className="pf-slider-hint">
                        You will be notified when any watched ticker's score exceeds this value
                    </span>
                </div>

                <div className="pf-action-row">
                    <button
                        className="pf-save-btn"
                        onClick={saveNotifications}
                        disabled={notifStatus === 'saving'}
                    >
                        {notifStatus === 'saving' ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                    {notifStatus === 'saved' && <span className="pf-status pf-status--ok">&gt; SAVED</span>}
                    {notifStatus === 'error'  && <span className="pf-status pf-status--err">&gt; ERROR — try again</span>}
                </div>
            </div>

            {/* ── Section 3: Security ── */}
            <div className="pf-card">
                <div className="pf-section-label">SECURITY</div>

                <div className="pf-security-row">
                    <div className="pf-toggle-info">
                        <span className="pf-toggle-name">CHANGE PASSWORD</span>
                        <span className="pf-toggle-desc">We'll email you a secure link to reset your password</span>
                    </div>
                    <button
                        className="pf-save-btn"
                        onClick={handlePasswordReset}
                        disabled={resetStatus === 'sending' || resetStatus === 'sent'}
                    >
                        {resetStatus === 'sending' ? 'SENDING...' : 'RESET PASSWORD'}
                    </button>
                </div>

                {resetStatus === 'sent' && (
                    <div className="pf-status pf-status--ok">
                        &gt; Password reset email sent to {user.email}
                    </div>
                )}
                {resetStatus === 'error' && (
                    <div className="pf-status pf-status--err">&gt; Failed to send — try again</div>
                )}

                <div className="pf-divider" />

                <button className="pf-signout-btn" onClick={signOut}>SIGN OUT</button>
            </div>

            {/* ── Section 4: Danger Zone ── */}
            <div className="pf-card pf-card--danger">
                <div className="pf-section-label pf-section-label--danger">DANGER ZONE</div>

                {deleteStatus === 'contact_support' ? (
                    <p className="pf-status pf-status--ok">
                        &gt; Contact{' '}
                        <a href="mailto:dipbedford@gmail.com?subject=Account%20Deletion" className="pf-link">
                            support
                        </a>
                        {' '}to delete your account
                    </p>
                ) : !deleteStep ? (
                    <button className="pf-delete-btn" onClick={() => setDeleteStep(true)}>
                        DELETE ACCOUNT
                    </button>
                ) : (
                    <div className="pf-delete-confirm">
                        <span className="pf-toggle-desc">Type <strong>DELETE</strong> to confirm account deletion</span>
                        <div className="pf-delete-row">
                            <input
                                className="pf-input pf-input--danger"
                                type="text"
                                value={deleteInput}
                                onChange={e => setDeleteInput(e.target.value)}
                                placeholder="DELETE"
                                autoFocus
                            />
                            <button
                                className="pf-delete-btn"
                                onClick={handleDeleteConfirm}
                                disabled={deleteInput !== 'DELETE' || deleteStatus === 'deleting'}
                            >
                                {deleteStatus === 'deleting' ? 'DELETING...' : 'CONFIRM'}
                            </button>
                            <button
                                className="pf-save-btn"
                                onClick={() => { setDeleteStep(false); setDeleteInput(''); }}
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
