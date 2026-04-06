import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Home, MapPin, Clock, Star, User, Phone } from 'lucide-react';

interface TicketData {
  id: number;
  ticket_token: string;
  is_checked_in: boolean;
  checked_in_at: string | null;
  buyer_name: string;
  buyer_phone: string;
  package_name: string;
  purchased_at: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_venue: string;
}

interface Props {
  token: string;
  onNavigateHome: () => void;
}

const TicketVerifyPage: React.FC<Props> = ({ token, onNavigateHome }) => {
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/ticket/${token}`);
      if (!res.ok) { setError('Ticket not found or invalid'); setLoading(false); return; }
      setTicket(await res.json());
    } catch {
      setError('Failed to verify ticket');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.title = ticket ? `Ticket — ${ticket.event_title}` : 'Ticket Verify';
    return () => { document.title = 'Aimal.fi Advisory'; };
  }, [ticket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Verifying ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <AlertCircle size={36} className="text-red-400" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-3xl text-white mb-2">Invalid Ticket</h1>
          <p className="text-stone-400 text-sm">{error || 'This QR code is not valid or has expired.'}</p>
        </div>
        <button onClick={onNavigateHome}
          className="flex items-center gap-2 text-stone-500 text-sm hover:text-white transition-colors">
          <Home size={14} /> Back to Home
        </button>
      </div>
    );
  }

  const isCheckedIn = ticket.is_checked_in;

  const purchaseDate = new Date(ticket.purchased_at);
  const formattedPurchase = purchaseDate.toLocaleDateString('en-GB', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const checkedInTime = ticket.checked_in_at
    ? new Date(ticket.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-12 transition-colors ${isCheckedIn ? 'bg-orange-950' : 'bg-stone-950'}`}>
      <div className="w-full max-w-sm">

        <div className={`rounded-2xl overflow-hidden border-2 mb-6 ${isCheckedIn ? 'border-orange-500/40 bg-orange-900/30' : 'border-green-500/40 bg-green-900/20'}`}>
          <div className={`px-6 py-8 text-center ${isCheckedIn ? 'bg-orange-500/10' : 'bg-green-500/10'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isCheckedIn ? 'bg-orange-500/20 border-2 border-orange-500/40' : 'bg-green-500/20 border-2 border-green-500/40'}`}>
              {isCheckedIn
                ? <AlertCircle size={36} className="text-orange-400" />
                : <CheckCircle2 size={36} className="text-green-400" />
              }
            </div>
            <h1 className={`font-serif text-3xl font-bold mb-1 ${isCheckedIn ? 'text-orange-300' : 'text-green-300'}`}>
              {isCheckedIn ? 'Already Used' : 'Valid Ticket'}
            </h1>
            {isCheckedIn && checkedInTime && (
              <p className="text-orange-400/70 text-sm">Checked in at {checkedInTime}</p>
            )}
            {!isCheckedIn && (
              <p className="text-green-400/70 text-sm">This ticket has not been used</p>
            )}
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User size={16} className="text-stone-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-0.5">Ticket Holder</p>
                  <p className="text-white font-bold text-lg">{ticket.buyer_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone size={16} className="text-stone-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-0.5">Phone</p>
                  <p className="text-white text-sm">{ticket.buyer_phone}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <Star size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-0.5">Event</p>
                  <p className="text-white font-medium">{ticket.event_title}</p>
                </div>
              </div>

              {ticket.event_date && (
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-stone-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-0.5">Date & Time</p>
                    <p className="text-white text-sm">{ticket.event_date}{ticket.event_time && ` · ${ticket.event_time}`}</p>
                  </div>
                </div>
              )}

              {ticket.event_venue && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-stone-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-0.5">Venue</p>
                    <p className="text-white text-sm">{ticket.event_venue}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${isCheckedIn ? 'bg-orange-500/20 text-orange-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {ticket.package_name}
              </div>
              <p className="text-stone-500 text-[10px] mt-2">Purchased {formattedPurchase}</p>
            </div>
          </div>
        </div>

        <button onClick={onNavigateHome}
          className="w-full flex items-center justify-center gap-2 py-3 text-stone-500 text-sm hover:text-white transition-colors">
          <Home size={14} /> Back to Site
        </button>
      </div>
    </div>
  );
};

export default TicketVerifyPage;
