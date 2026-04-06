import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, Lock, Coffee, Inbox } from 'lucide-react';

interface BarRequest {
  id: number;
  table_number: string;
  message: string;
  status: string;
  created_at: string;
}

interface Props {
  slug: string;
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const BarHostPage: React.FC<Props> = ({ slug }) => {
  const [pin, setPin] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [requests, setRequests] = useState<BarRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [markingDone, setMarkingDone] = useState<Set<number>>(new Set());
  const [showDone, setShowDone] = useState(false);
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    fetch(`/api/events/by-slug/${slug}`)
      .then(r => r.json())
      .then(data => { if (data.title) setEventTitle(data.title); })
      .catch(() => {});

    const savedPin = sessionStorage.getItem('bar_host_pin_' + slug);
    if (savedPin) {
      setEnteredPin(savedPin);
      checkPin(savedPin);
    } else {
      setAuthLoading(false);
    }
  }, [slug]);

  const checkPin = useCallback(async (testPin: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`/api/events/by-slug/${slug}/bar-pin-check?pin=${encodeURIComponent(testPin)}`);
      const data = await res.json();
      if (data.valid) {
        setPin(testPin);
        setAuthenticated(true);
        sessionStorage.setItem('bar_host_pin_' + slug, testPin);
      } else {
        setAuthError('Incorrect PIN. Please try again.');
        sessionStorage.removeItem('bar_host_pin_' + slug);
      }
    } catch {
      setAuthError('Could not connect to server.');
    }
    setAuthLoading(false);
  }, [slug]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkPin(enteredPin);
  };

  const loadRequests = useCallback(async () => {
    if (!authenticated || !pin) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/by-slug/${slug}/bar-requests?pin=${encodeURIComponent(pin)}`);
      if (res.status === 403) {
        setAuthenticated(false);
        sessionStorage.removeItem('bar_host_pin_' + slug);
        return;
      }
      if (res.ok) {
        const data: BarRequest[] = await res.json();
        setRequests(data);
        setLastUpdate(new Date());
      }
    } catch {}
    setLoading(false);
  }, [authenticated, pin, slug]);

  useEffect(() => {
    if (!authenticated) return;
    loadRequests();
    const id = setInterval(loadRequests, 3000);
    return () => clearInterval(id);
  }, [authenticated, loadRequests]);

  const markDone = async (reqId: number) => {
    setMarkingDone(prev => new Set(prev).add(reqId));
    try {
      await fetch(`/api/events/by-slug/${slug}/bar-requests/${reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, status: 'done' }),
      });
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'done' } : r));
    } catch {}
    setMarkingDone(prev => { const s = new Set(prev); s.delete(reqId); return s; });
  };

  const pending = requests.filter(r => r.status === 'pending');
  const done = requests.filter(r => r.status === 'done');

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xs animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#b99755]/20 border border-[#b99755]/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={26} className="text-[#b99755]" />
            </div>
            <h1 className="font-serif text-3xl text-white mb-1">Host Access</h1>
            {eventTitle && <p className="text-[10px] text-stone-500 uppercase tracking-widest">{eventTitle}</p>}
          </div>

          <form onSubmit={handlePinSubmit} className="bg-stone-900 border border-stone-800 rounded-2xl p-8 space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-2">Host PIN</label>
              <input
                data-testid="input-host-pin"
                type="password"
                value={enteredPin}
                onChange={e => setEnteredPin(e.target.value)}
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white text-center text-xl font-bold tracking-[0.3em] focus:outline-none focus:border-[#b99755] transition-colors"
                placeholder="••••"
                autoFocus
              />
            </div>
            {authError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={14} /> {authError}
              </div>
            )}
            <button
              data-testid="button-host-login"
              type="submit"
              disabled={authLoading || !enteredPin}
              className="w-full py-3.5 bg-[#b99755] text-stone-900 rounded-xl font-bold uppercase tracking-[0.15em] text-xs hover:bg-[#a08545] transition-all disabled:opacity-40"
            >
              {authLoading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      <div className="bg-stone-900 border-b border-stone-800 px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-white text-lg">Bar Host</h1>
          {eventTitle && <p className="text-[10px] text-stone-500 uppercase tracking-widest">{eventTitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[10px] text-stone-600 uppercase tracking-wider hidden sm:block">
              Updated {timeAgo(lastUpdate.toISOString())}
            </span>
          )}
          <button
            data-testid="button-refresh"
            onClick={loadRequests}
            className={`p-2 rounded-lg border border-stone-700 text-stone-400 hover:text-white hover:border-stone-500 transition-all ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="flex border-b border-stone-800 bg-stone-900">
        <button
          data-testid="tab-pending"
          onClick={() => setShowDone(false)}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${!showDone ? 'text-[#b99755] border-b-2 border-[#b99755]' : 'text-stone-500 hover:text-stone-300'}`}
        >
          <Clock size={13} /> Pending
          {pending.length > 0 && (
            <span className="bg-[#b99755] text-stone-900 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
              {pending.length}
            </span>
          )}
        </button>
        <button
          data-testid="tab-done"
          onClick={() => setShowDone(true)}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${showDone ? 'text-green-400 border-b-2 border-green-400' : 'text-stone-500 hover:text-stone-300'}`}
        >
          <CheckCircle2 size={13} /> Done
          {done.length > 0 && (
            <span className="bg-stone-700 text-stone-300 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
              {done.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 max-w-2xl mx-auto w-full">
        {!showDone && pending.length === 0 && (
          <div className="text-center py-16 text-stone-600">
            <Inbox size={44} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No pending requests</p>
            <p className="text-[11px] mt-1 text-stone-700">New orders will appear here automatically</p>
          </div>
        )}
        {showDone && done.length === 0 && (
          <div className="text-center py-16 text-stone-600">
            <CheckCircle2 size={44} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No completed requests yet</p>
          </div>
        )}
        {(showDone ? done : pending).map(r => (
          <div
            key={r.id}
            data-testid={`card-bar-request-${r.id}`}
            className={`rounded-2xl border px-5 py-4 transition-all ${
              r.status === 'done'
                ? 'bg-stone-900 border-stone-800 opacity-70'
                : 'bg-stone-900 border-stone-700 shadow-lg shadow-stone-950/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#b99755]/15 border border-[#b99755]/30 flex flex-col items-center justify-center">
                <span className="text-[9px] text-[#b99755]/70 uppercase tracking-wider font-bold leading-none">TBL</span>
                <span className="text-[#b99755] font-bold text-lg leading-tight">{r.table_number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm leading-relaxed">{r.message}</p>
                <p className="text-[10px] text-stone-500 mt-1.5 flex items-center gap-1">
                  <Clock size={10} />
                  {formatTime(r.created_at)} · {timeAgo(r.created_at)}
                </p>
              </div>
            </div>
            {r.status === 'pending' && (
              <div className="mt-4 flex justify-end">
                <button
                  data-testid={`button-mark-done-${r.id}`}
                  onClick={() => markDone(r.id)}
                  disabled={markingDone.has(r.id)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  {markingDone.has(r.id) ? 'Marking…' : 'Mark Done'}
                </button>
              </div>
            )}
            {r.status === 'done' && (
              <div className="mt-3 flex items-center gap-1.5 text-green-500 text-[11px] font-bold uppercase tracking-wider">
                <CheckCircle2 size={12} /> Completed
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-stone-900 border-t border-stone-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-stone-600 uppercase tracking-wider">
          <Coffee size={12} /> Bar Service Active
        </div>
        <button
          data-testid="button-host-logout"
          onClick={() => { sessionStorage.removeItem('bar_host_pin_' + slug); setAuthenticated(false); setPin(''); setEnteredPin(''); }}
          className="text-[10px] text-stone-600 hover:text-stone-400 uppercase tracking-wider transition-colors"
        >
          Lock
        </button>
      </div>
    </div>
  );
};

export default BarHostPage;
