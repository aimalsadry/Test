import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogIn, LogOut, ScanLine, CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronDown, UserCheck } from 'lucide-react';

interface DoorEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  venue: string;
}

interface TicketInfo {
  id: number;
  ticket_token: string;
  is_checked_in: boolean;
  checked_in_at: string | null;
  buyer_name: string;
  package_name: string;
  event_title: string;
  admits: number;
  scan_status: 'pending' | 'already_used' | 'checked_in' | 'invalid';
  error?: string;
}

interface Stats {
  total: number;
  checked_in: number;
}

interface ScannerInstance {
  stop: () => Promise<void>;
  clear: () => void;
}

type Screen = 'pin' | 'select' | 'scan';

function extractToken(raw: string): string | null {
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/');
    const idx = parts.indexOf('ticket');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    if (raw.length > 10 && !raw.includes(' ') && !raw.includes('/')) return raw;
  }
  return null;
}

const DoorPage: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const [events, setEvents] = useState<DoorEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DoorEvent | null>(null);

  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({ total: 0, checked_in: 0 });
  const [scanning, setScanning] = useState(false);

  const scannerRef = useRef<ScannerInstance | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/door/status')
      .then(r => r.json())
      .then((d: { authenticated: boolean }) => { if (d.authenticated) loadEventsAndProceed(); })
      .catch(() => {});
  }, []);

  const loadEventsAndProceed = async () => {
    try {
      const res = await fetch('/api/door/events');
      if (!res.ok) return;
      const data: DoorEvent[] = await res.json();
      setEvents(data);
      setScreen('select');
    } catch {}
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setPinLoading(true);
    setPinError('');
    try {
      const res = await fetch('/api/door/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data: { success?: boolean; error?: string } = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'Incorrect PIN');
        setPinLoading(false);
        return;
      }
      await loadEventsAndProceed();
    } catch {
      setPinError('Connection error. Please try again.');
    }
    setPinLoading(false);
  };

  const handleLogout = async () => {
    await stopScanner();
    await fetch('/api/door/logout', { method: 'POST' });
    setScreen('pin');
    setPin('');
    setSelectedEvent(null);
    clearResult();
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
  };

  const loadStats = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const res = await fetch(`/api/door/stats/${selectedEvent.id}`);
      if (res.ok) {
        const data: Stats = await res.json();
        setStats(data);
      }
    } catch {}
  }, [selectedEvent]);

  useEffect(() => {
    if (screen === 'scan' && selectedEvent) {
      loadStats();
      statsIntervalRef.current = setInterval(loadStats, 5000);
    }
    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [screen, selectedEvent, loadStats]);

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner as ScannerInstance;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10 },
        (decodedText: string) => {
          if (processingRef.current) return;
          const token = extractToken(decodedText);
          if (!token) return;
          processingRef.current = true;
          verifyTicket(token);
        },
        () => {}
      );
    } catch {
      setScanning(false);
    }
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (screen === 'scan') {
      const timer = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [screen]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const clearResult = (resumeScanning = false) => {
    setTicketInfo(null);
    if (resumeScanning) processingRef.current = false;
  };

  const scheduleAutoClear = (ms: number) => {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      clearResult(true);
    }, ms);
  };

  const verifyTicket = async (token: string) => {
    try {
      const eventParam = selectedEvent ? `?eventId=${selectedEvent.id}` : '';
      const res = await fetch(`/api/door/verify/${token}${eventParam}`);
      const data: TicketInfo & { error?: string } = await res.json();

      if (!res.ok) {
        setTicketInfo({ ...data, ticket_token: token, scan_status: 'invalid' });
        scheduleAutoClear(3500);
        return;
      }

      setTicketInfo(data);

      if (data.scan_status === 'already_used') {
        scheduleAutoClear(4000);
      }
    } catch {
      setTicketInfo({
        id: 0, ticket_token: token, is_checked_in: false, checked_in_at: null,
        buyer_name: '', package_name: '', event_title: '', admits: 1,
        scan_status: 'invalid', error: 'Connection error',
      });
      scheduleAutoClear(3000);
    }
  };

  const confirmCheckIn = async () => {
    if (!ticketInfo || ticketInfo.scan_status !== 'pending') return;
    setConfirmLoading(true);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    try {
      const res = await fetch(`/api/door/checkin/${ticketInfo.ticket_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent?.id }),
      });
      const data: TicketInfo & { error?: string } = await res.json();
      if (!res.ok) {
        setTicketInfo({ ...data, admits: 1, scan_status: 'invalid' });
      } else {
        setTicketInfo(data);
        loadStats();
      }
      scheduleAutoClear(2500);
    } catch {
      scheduleAutoClear(2500);
    }
    setConfirmLoading(false);
  };

  if (screen === 'pin') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ScanLine size={32} className="text-amber-400" />
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Door Scanner</h1>
            <p className="text-stone-400 text-sm mt-1">Enter your door PIN to continue</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(''); }}
              placeholder="Enter PIN"
              autoFocus
              data-testid="input-door-pin"
              className="w-full px-4 py-4 bg-stone-900 border border-stone-700 rounded-xl text-white text-center text-2xl tracking-[0.4em] placeholder:text-stone-600 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-amber-500 transition-colors"
            />
            {pinError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <XCircle size={16} />
                <span>{pinError}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={pinLoading || !pin.trim()}
              data-testid="button-door-enter"
              className="w-full py-4 bg-amber-500 text-stone-900 font-bold rounded-xl text-sm uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {pinLoading ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
              {pinLoading ? 'Verifying...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (screen === 'select') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ScanLine size={32} className="text-amber-400" />
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Select Event</h1>
            <p className="text-stone-400 text-sm mt-1">Choose the event you are scanning for</p>
          </div>

          {events.length === 0 ? (
            <div className="text-stone-500 text-center py-8">No published events found.</div>
          ) : (
            <div className="space-y-3">
              {events.map(ev => (
                <button
                  key={ev.id}
                  data-testid={`button-event-${ev.id}`}
                  onClick={() => { setSelectedEvent(ev); setStats({ total: 0, checked_in: 0 }); setScreen('scan'); }}
                  className="w-full p-4 rounded-xl border border-stone-700 bg-stone-900 hover:border-amber-500/50 text-left transition-all"
                >
                  <p className="text-white font-semibold">{ev.title}</p>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {ev.date ? new Date(ev.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }) : ''}
                    {ev.time ? ` · ${ev.time}` : ''}
                    {ev.venue ? ` · ${ev.venue}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleLogout}
            data-testid="button-door-logout"
            className="mt-6 w-full py-3 border border-stone-700 text-stone-400 rounded-xl text-xs uppercase tracking-widest hover:bg-stone-900 flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col select-none">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div>
          <p className="text-white font-semibold text-sm truncate max-w-[180px]">{selectedEvent?.title ?? 'Event'}</p>
          <p className="text-stone-400 text-xs">
            {stats.checked_in} / {stats.total} checked in
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { clearResult(true); setScreen('select'); }}
            data-testid="button-switch-event"
            className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 text-stone-300 rounded-lg text-xs hover:bg-stone-700 transition-colors"
          >
            <ChevronDown size={12} /> Switch
          </button>
          <button
            onClick={handleLogout}
            data-testid="button-scanner-logout"
            className="p-2 text-stone-400 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center px-4 pb-6">
        <div className="w-full max-w-sm">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
            <div id="qr-reader" className="w-full h-full" />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
                <RefreshCw size={24} className="text-stone-600 animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
              <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />
            </div>
          </div>
          <p className="text-stone-500 text-xs text-center mt-3">Point camera at a ticket QR code</p>
        </div>

        {ticketInfo && (
          <div
            className="absolute inset-0 flex items-center justify-center p-6 z-20"
            style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.6)' }}
          >
            <div
              className={`w-full max-w-xs rounded-2xl p-8 text-center shadow-2xl ${
                ticketInfo.scan_status === 'checked_in'
                  ? 'bg-green-950 border-2 border-green-500'
                  : ticketInfo.scan_status === 'pending'
                  ? 'bg-stone-900 border-2 border-amber-500'
                  : ticketInfo.scan_status === 'already_used'
                  ? 'bg-orange-950 border-2 border-orange-500'
                  : 'bg-red-950 border-2 border-red-500'
              }`}
            >
              {ticketInfo.scan_status === 'pending' && (
                <>
                  <CheckCircle size={52} className="text-amber-400 mx-auto mb-3" />
                  <p className="text-amber-300 font-black text-lg uppercase tracking-wide">Valid Ticket</p>
                  <p className="text-white font-bold text-xl mt-2">{ticketInfo.buyer_name}</p>
                  {ticketInfo.admits > 1 && (
                    <p className="text-amber-400 font-black text-base mt-1">Admits {ticketInfo.admits}</p>
                  )}
                  {ticketInfo.package_name && (
                    <p className="text-stone-400 text-sm mt-1">{ticketInfo.package_name}</p>
                  )}
                  <button
                    data-testid="button-confirm-checkin"
                    onClick={confirmCheckIn}
                    disabled={confirmLoading}
                    className="mt-6 w-full py-3 bg-green-500 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-green-400 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                  >
                    {confirmLoading ? <RefreshCw size={16} className="animate-spin" /> : <UserCheck size={16} />}
                    {confirmLoading ? 'Checking in...' : 'Check In'}
                  </button>
                  <button
                    data-testid="button-cancel-checkin"
                    onClick={() => clearResult(true)}
                    className="mt-2 w-full py-2 text-stone-500 text-xs hover:text-stone-300 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}

              {ticketInfo.scan_status === 'checked_in' && (
                <>
                  <CheckCircle size={56} className="text-green-400 mx-auto mb-4" />
                  <p className="text-green-300 font-black text-xl uppercase tracking-wide">Checked In!</p>
                  <p className="text-white font-bold text-lg mt-2">{ticketInfo.buyer_name}</p>
                  {ticketInfo.admits > 1 && (
                    <p className="text-green-400 font-black text-base mt-1">Admits {ticketInfo.admits}</p>
                  )}
                  {ticketInfo.package_name && (
                    <p className="text-green-400/70 text-sm mt-1">{ticketInfo.package_name}</p>
                  )}
                  <p className="text-green-500 text-xs mt-3 uppercase tracking-widest font-bold">Welcome ✓</p>
                </>
              )}

              {ticketInfo.scan_status === 'already_used' && (
                <>
                  <AlertTriangle size={56} className="text-orange-400 mx-auto mb-4" />
                  <p className="text-orange-300 font-black text-xl uppercase tracking-wide">Already Used</p>
                  {ticketInfo.buyer_name && (
                    <p className="text-white font-bold text-lg mt-2">{ticketInfo.buyer_name}</p>
                  )}
                  {ticketInfo.admits > 1 && (
                    <p className="text-orange-300 font-black text-base mt-1">Admits {ticketInfo.admits}</p>
                  )}
                  {ticketInfo.checked_in_at && (
                    <p className="text-orange-400/70 text-sm mt-2">
                      Checked in at {new Date(ticketInfo.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  <button
                    data-testid="button-dismiss-result"
                    onClick={() => clearResult(true)}
                    className="mt-4 text-stone-500 text-xs hover:text-stone-300 transition-colors"
                  >
                    Dismiss
                  </button>
                </>
              )}

              {ticketInfo.scan_status === 'invalid' && (
                <>
                  <XCircle size={56} className="text-red-400 mx-auto mb-4" />
                  <p className="text-red-300 font-black text-xl uppercase tracking-wide">Invalid Ticket</p>
                  <p className="text-red-400/70 text-sm mt-2">{ticketInfo.error || 'This ticket is not valid for this event'}</p>
                  <button
                    data-testid="button-dismiss-invalid"
                    onClick={() => clearResult(true)}
                    className="mt-4 text-stone-500 text-xs hover:text-stone-300 transition-colors"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoorPage;
