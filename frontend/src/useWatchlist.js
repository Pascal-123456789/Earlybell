import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const LOCAL_KEY = 'foega_watchlist'
const MAX_TICKERS = 3

export const useWatchlist = () => {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(false)
  const prevUserRef = useRef(null)

  useEffect(() => {
    const prevUser = prevUserRef.current
    prevUserRef.current = user

    if (user) {
      loadFromSupabase()
    } else {
      // On logout: revert to localStorage (don't clear it)
      if (prevUser) {
        const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
        setWatchlist(local)
      } else {
        // Initial mount without user
        const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
        setWatchlist(local)
      }
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadFromSupabase = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('watchlist_tickers')
        .eq('id', user.id)
        .single()

      if (data) {
        // Merge with any existing localStorage tickers (union, capped at MAX_TICKERS)
        const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
        const merged = [...new Set([...(data.watchlist_tickers || []), ...local])].slice(0, MAX_TICKERS)
        setWatchlist(merged)
        await saveToSupabase(merged)
      }
    } catch (e) {
      console.error('Watchlist load error:', e)
    }
    setLoading(false)
  }

  const saveToSupabase = async (tickers) => {
    await supabase
      .from('profiles')
      .update({ watchlist_tickers: tickers, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  const addTicker = async (ticker) => {
    if (watchlist.includes(ticker)) return null
    if (watchlist.length >= MAX_TICKERS && user) {
      return { error: `Free plan: ${MAX_TICKERS} ticker limit` }
    }
    const updated = [...watchlist, ticker]
    setWatchlist(updated)
    if (user) {
      await saveToSupabase(updated)
    } else {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    }
    return null
  }

  const removeTicker = async (ticker) => {
    const updated = watchlist.filter(t => t !== ticker)
    setWatchlist(updated)
    if (user) {
      await saveToSupabase(updated)
    } else {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    }
  }

  const isWatched = (ticker) => watchlist.includes(ticker)

  return { watchlist, loading, addTicker, removeTicker, isWatched, maxTickers: MAX_TICKERS }
}
