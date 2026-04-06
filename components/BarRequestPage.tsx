import React, { useState, useEffect, useRef } from 'react';
import { Send, Coffee, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

interface SentRequest {
  id: string;
  message: string;
  sentAt: string;
}

interface Props {
  slug: string;
}

const SESSION_TABLE_KEY = 'bar_table_number';
const SESSION_REQUESTS_KEY = 'bar_sent_requests';

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const BarRequestPage: React.FC<Props> = ({ slug }) => {
  const [tableNumber, setTableNumber] = useState('');
  const [confirmedTable, setConfirmedTable] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<SentRequest[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_TABLE_KEY + '_' + slug);
    if (saved) {
      setConfirmedTable(saved);
      const savedReqs = sessionStorage.getItem(SESSION_REQUESTS_KEY + '_' + slug);
      if (savedReqs) {
        try { setRequests(JSON.parse(savedReqs)); } catch {}
      }
    }
    fetch(`/api/events/by-slug/${slug}`)
      .then(r => r.json())
      .then(data => { if (data.title) setEventTitle(data.title); })
      .catch(() => {});
  }, [slug]);

  const confirmTable = () => {
    const t = tableNumber.trim();
    if (!t) return;
    sessionStorage.setItem(SESSION_TABLE_KEY + '_' + slug, t);
    setConfirmedTable(t);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !confirmedTable) return;
    setSending(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch(`/api/events/by-slug/${slug}/bar-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: confirmedTable, message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send request');
      } else {
        const newReq: SentRequest = {
          id: Date.now().toString(),
          message: message.trim(),
          sentAt: new Date().toISOString(),
        };
        const updated = [newReq, ...requests];
        setRequests(updated);
        sessionStorage.setItem(SESSION_REQUESTS_KEY + '_' + slug, JSON.stringify(updated));
        setMessage('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSending(false);
  };

  if (!confirmedTable) {
    return (
      <div className="min-h-screen bg-[#F9F8F4] flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coffee size={28} className="text-[#b99755]" />
            </div>
            <h1 className="font-serif text-3xl text-stone-900 mb-2">Bar Service</h1>
            {eventTitle && <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{eventTitle}</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8">
            <p className="text-sm text-stone-600 mb-6 text-center">Enter your table number to start ordering</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1.5">Table Number</label>
                <input
                  data-testid="input-table-number"
                  type="text"
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmTable()}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-lg font-bold text-center focus:outline-none focus:border-stone-400 tracking-widest"
                  placeholder="e.g. 5"
                  autoFocus
                />
              </div>
              <button
                data-testid="button-confirm-table"
                onClick={confirmTable}
                disabled={!tableNumber.trim()}
                className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-[0.15em] text-xs hover:bg-stone-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                Continue <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F4] flex flex-col">
      <div className="bg-stone-900 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-serif text-white text-lg">Bar Service</span>
          {eventTitle && <p className="text-[10px] text-stone-400 uppercase tracking-widest">{eventTitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-[#b99755]/20 border border-[#b99755]/40 rounded-full">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#b99755]">Table {confirmedTable}</span>
          </div>
          <button
            data-testid="button-change-table"
            onClick={() => { sessionStorage.removeItem(SESSION_TABLE_KEY + '_' + slug); setConfirmedTable(null); setTableNumber(''); }}
            className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors uppercase tracking-wider"
          >
            Change
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 max-w-lg mx-auto w-full">
        {requests.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Coffee size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No requests yet. Send your first order below.</p>
          </div>
        ) : (
          requests.map(r => (
            <div
              key={r.id}
              data-testid={`card-request-${r.id}`}
              className="bg-white rounded-2xl border border-stone-200 px-5 py-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-stone-800 text-sm leading-relaxed flex-1">{r.message}</p>
                <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-green-50 text-green-600">
                  <CheckCircle2 size={10} /> Sent
                </span>
              </div>
              <p className="text-[10px] text-stone-400 mt-2 flex items-center gap-1">
                <Clock size={10} /> {formatTime(r.sentAt)}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="bg-white border-t border-stone-200 px-4 py-4 max-w-lg mx-auto w-full">
        {success && (
          <div className="mb-3 flex items-center gap-2 text-green-600 text-sm animate-fade-in">
            <CheckCircle2 size={16} /> Request sent! The barman will see it shortly.
          </div>
        )}
        {error && (
          <div className="mb-3 flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-3 items-end">
          <textarea
            data-testid="input-request-message"
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            placeholder="Type your order or request…"
            className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm resize-none focus:outline-none focus:border-stone-400"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
          />
          <button
            data-testid="button-send-request"
            type="submit"
            disabled={sending || !message.trim()}
            className="flex-shrink-0 w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center text-white hover:bg-stone-800 transition-all disabled:opacity-40 active:scale-95"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default BarRequestPage;
