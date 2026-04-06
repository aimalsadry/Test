import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Home, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Ticket {
  id: number;
  ticket_token: string;
  is_checked_in: boolean;
}

interface Purchase {
  id: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  package_name: string;
  package_price: string;
  quantity: number;
  amount_paid: string;
  status: string;
  purchased_at: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_venue: string;
}

interface Props {
  purchaseId: string;
  onNavigateHome: () => void;
}

const EventReceiptPage: React.FC<Props> = ({ purchaseId, onNavigateHome }) => {
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const getHost = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://aimal.fi';
  };

  const load = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) { setError('Invalid receipt link'); setLoading(false); return; }

    try {
      const res = await fetch(`/api/events/purchases/${purchaseId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_token: token }),
      });

      if (res.status === 402) {
        setPending(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Receipt not found');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setPurchase(data.purchase);
      setTickets(data.tickets || []);
    } catch {
      setError('Failed to load receipt');
    }
    setLoading(false);
  }, [purchaseId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (purchase) document.title = `Tickets — ${purchase.event_title}`;
    return () => { document.title = 'Aimal.fi Advisory'; };
  }, [purchase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-white text-sm">Loading your tickets...</div>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <AlertCircle size={28} className="text-amber-400" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-3xl text-white mb-3">Payment Pending</h1>
          <p className="text-stone-400 max-w-sm">Your payment is being processed. Please wait a moment then try again.</p>
        </div>
        <button onClick={load} className="px-6 py-3 bg-amber-500 text-stone-900 font-bold rounded-full text-sm hover:bg-amber-400">Check Again</button>
        <button onClick={onNavigateHome} className="text-stone-500 text-sm hover:text-white">← Back to Home</button>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-400">{error || 'Receipt not found'}</p>
        <button onClick={onNavigateHome} className="px-6 py-3 bg-white text-stone-900 rounded-full font-bold text-sm">Back to Home</button>
      </div>
    );
  }

  const purchaseDate = new Date(purchase.purchased_at);
  const formattedDate = purchaseDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = purchaseDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-stone-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 print:hidden">
          <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-400" />
          </div>
          <h1 className="font-serif text-4xl text-white mb-2">You're In!</h1>
          <p className="text-stone-400">Payment confirmed. Your tickets are below — save or print them.</p>
        </div>

        <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden mb-6 print:bg-white print:border-stone-200 print:rounded-none">
          <div className="bg-stone-800 px-6 py-5 flex justify-between items-start print:bg-stone-50">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">Event</p>
              <h2 className="font-serif text-2xl text-white print:text-stone-900">{purchase.event_title}</h2>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-stone-400">
                {purchase.event_date && <span>{purchase.event_date}</span>}
                {purchase.event_time && <span>· {purchase.event_time}</span>}
                {purchase.event_venue && <span>· {purchase.event_venue}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">Order</p>
              <p className="font-mono text-white text-sm print:text-stone-900">#{String(purchase.id).padStart(6, '0')}</p>
            </div>
          </div>

          <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-stone-800 print:border-stone-200">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-1">Name</p>
              <p className="text-white text-sm print:text-stone-900">{purchase.buyer_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-1">Email</p>
              <p className="text-white text-sm break-all print:text-stone-900">{purchase.buyer_email}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-1">Package</p>
              <p className="text-amber-400 text-sm font-bold print:text-amber-700">{purchase.package_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-1">Total Paid</p>
              <p className="text-white text-sm font-bold print:text-stone-900">€{parseFloat(purchase.amount_paid).toFixed(2)}</p>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-4">
              {tickets.length === 1 ? 'Your Ticket' : `Your Tickets (${tickets.length})`}
            </p>

            {tickets.length === 1 && (
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-stone-800 rounded-xl p-6 border border-stone-700 print:bg-white print:border-stone-200 print:page-break-inside-avoid">
                <div className="shrink-0">
                  <div className="bg-white rounded-lg p-3 inline-block">
                    <QRCodeSVG
                      value={`${getHost()}/ticket/${tickets[0].ticket_token}`}
                      size={160}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-white text-lg font-bold print:text-stone-900">{purchase.buyer_name}</p>
                  {purchase.quantity > 1 && (
                    <p className="text-amber-400 font-black text-xl print:text-amber-700">
                      Admits {purchase.quantity}
                    </p>
                  )}
                  <p className="text-amber-400 text-sm font-bold print:text-amber-700">{purchase.package_name}</p>
                  {purchase.event_date && <p className="text-stone-400 text-sm">{purchase.event_date}{purchase.event_time ? ` · ${purchase.event_time}` : ''}</p>}
                  {purchase.event_venue && <p className="text-stone-500 text-xs">{purchase.event_venue}</p>}
                  <p className="text-stone-600 text-[10px] print:text-stone-400">Order #{String(purchase.id).padStart(6, '0')} · {formattedDate}</p>
                </div>
              </div>
            )}

            {tickets.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tickets.map((ticket, idx) => (
                  <div key={ticket.id} className="bg-stone-800 rounded-xl p-4 text-center border border-stone-700 print:bg-white print:border-stone-200 print:page-break-inside-avoid">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-3">Ticket #{idx + 1}</p>
                    <div className="bg-white rounded-lg p-3 inline-block mb-3">
                      <QRCodeSVG
                        value={`${getHost()}/ticket/${ticket.ticket_token}`}
                        size={140}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <p className="text-white text-sm font-medium print:text-stone-900">{purchase.buyer_name}</p>
                      <p className="text-amber-400 text-xs font-bold print:text-amber-700">{purchase.package_name}</p>
                      {purchase.event_date && <p className="text-stone-400 text-xs">{purchase.event_date}</p>}
                      <p className="text-stone-500 text-[10px]">{formattedDate} {formattedTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-stone-800 print:hidden">
            <p className="text-stone-500 text-xs text-center">
              {tickets.length === 1 && purchase.quantity > 1
                ? `Present this QR code at the entrance. It admits ${purchase.quantity} people.`
                : tickets.length > 1
                ? 'Scan the QR code at the entrance. Each QR code is valid for one person.'
                : 'Present this QR code at the entrance. Valid for one person.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <button onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-stone-800 text-white rounded-xl font-bold text-sm hover:bg-stone-700 border border-stone-700">
            <Printer size={16} /> Print Tickets
          </button>
          <button onClick={onNavigateHome}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-stone-700 text-stone-400 rounded-xl font-bold text-sm hover:bg-stone-900 hover:text-white">
            <Home size={16} /> Back to Home
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:text-stone-900 { color: #1c1917 !important; }
          .print\\:border-stone-200 { border-color: #e7e5e4 !important; }
          .print\\:text-amber-700 { color: #b45309 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default EventReceiptPage;
