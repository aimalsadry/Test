import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScanLine, Copy, Check, ExternalLink, RefreshCw, ChevronDown, ChevronUp, AlertCircle, UserCheck, Undo2 } from 'lucide-react';

const API = '/api';

const apiCall = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, { credentials: 'include', ...options });
  return res;
};

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  venue: string;
  is_published: boolean;
}

interface Ticket {
  id: number;
  ticket_token: string;
  is_checked_in: boolean;
  checked_in_at: string | null;
}

interface Attendee {
  id: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  package_name: string;
  quantity: number;
  amount_paid: string;
  status: string;
  purchased_at: string;
  tickets: Ticket[];
}

const AdminDoor: React.FC = () => {
  const [pin, setPin] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [togglingTicket, setTogglingTicket] = useState<number | null>(null);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      setPinLoading(true);
      try {
        const res = await apiCall(`${API}/settings/booking-settings`);
        if (res.ok) {
          const data: Record<string, string> = await res.json();
          setPin(data.door_pin || null);
        }
      } catch {}
      setPinLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setEventsLoading(true);
      try {
        const res = await apiCall(`${API}/events/admin/all`);
        if (res.ok) {
          const data: Event[] = await res.json();
          setEvents(data);
          if (data.length > 0) setSelectedEventId(data[0].id);
        }
      } catch {}
      setEventsLoading(false);
    })();
  }, []);

  const loadAttendees = useCallback(async () => {
    if (!selectedEventId) return;
    setAttendeesLoading(true);
    try {
      const res = await apiCall(`${API}/events/${selectedEventId}/attendees`);
      if (res.ok) setAttendees(await res.json());
    } catch {}
    setAttendeesLoading(false);
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    setExpanded(null);
    loadAttendees();
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(loadAttendees, 10000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [selectedEventId, loadAttendees]);

  const toggleCheckin = async (ticketId: number) => {
    setTogglingTicket(ticketId);
    try {
      await apiCall(`${API}/events/tickets/${ticketId}/checkin`, { method: 'POST' });
      await loadAttendees();
    } catch {}
    setTogglingTicket(null);
  };

  const copyPin = async () => {
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const paid = attendees.filter(a => a.status === 'paid');
  const totalTickets = paid.reduce((s, a) => s + a.quantity, 0);
  const checkedIn = paid.reduce((s, a) => s + (a.tickets || []).filter(t => t.is_checked_in).length, 0);
  const remaining = totalTickets - checkedIn;
  const pct = totalTickets > 0 ? Math.round((checkedIn / totalTickets) * 100) : 0;

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-stone-900">Door Management</h2>
        <p className="text-stone-400 text-sm mt-0.5">Manage door scanner access and monitor check-ins live.</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-3">Door Scanner PIN</p>

        {pinLoading ? (
          <div className="h-14 flex items-center gap-2 text-stone-400 text-sm">
            <RefreshCw size={14} className="animate-spin" /> Loading PIN...
          </div>
        ) : pin ? (
          <div className="flex items-center gap-3">
            <span
              data-testid="text-door-pin"
              className="font-mono text-4xl font-black tracking-[0.25em] text-stone-900 select-all"
            >
              {pin}
            </span>
            <button
              data-testid="button-copy-pin"
              onClick={copyPin}
              title="Copy PIN"
              className={`p-2 rounded-lg border transition-colors ${copied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'}`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
            <a
              href="/door"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-open-door"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 text-xs font-bold hover:bg-stone-100 transition-colors"
            >
              <ExternalLink size={14} /> Open /door
            </a>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="text-sm">
              No door PIN is configured. Go to <strong>Settings → Booking Rules</strong> and set a Door Scanner PIN so staff can access the scanner.
            </span>
          </div>
        )}

        <p className="text-xs text-stone-400 mt-3">Give this PIN to door staff. They enter it at <span className="font-mono text-stone-600">/door</span> to access the scanner without admin credentials.</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Check-in Dashboard</p>
          <button
            data-testid="button-refresh-checkins"
            onClick={loadAttendees}
            disabled={attendeesLoading}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={attendeesLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {eventsLoading ? (
          <div className="text-stone-400 text-sm">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-stone-400 text-sm py-4 text-center">No events found. Create an event in the Events tab.</div>
        ) : (
          <>
            <select
              data-testid="select-door-event"
              value={selectedEventId ?? ''}
              onChange={e => setSelectedEventId(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 mb-5 focus:outline-none focus:border-stone-400"
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}{ev.date ? ` — ${new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}{!ev.is_published ? ' (unpublished)' : ''}
                </option>
              ))}
            </select>

            {selectedEvent && (
              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-stone-50 rounded-lg border border-stone-200 px-3 py-3 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Sold</p>
                  <p className="font-serif text-2xl text-stone-900 mt-0.5">{totalTickets}</p>
                </div>
                <div className="bg-green-50 rounded-lg border border-green-200 px-3 py-3 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-green-500">In</p>
                  <p className="font-serif text-2xl text-green-700 mt-0.5">{checkedIn}</p>
                </div>
                <div className="bg-stone-50 rounded-lg border border-stone-200 px-3 py-3 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Left</p>
                  <p className="font-serif text-2xl text-stone-900 mt-0.5">{remaining}</p>
                </div>
                <div className="bg-blue-50 rounded-lg border border-blue-200 px-3 py-3 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-blue-400">%</p>
                  <p className="font-serif text-2xl text-blue-700 mt-0.5">{pct}%</p>
                </div>
              </div>
            )}

            {totalTickets > 0 && (
              <div className="w-full bg-stone-100 rounded-full h-1.5 mb-5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            {attendeesLoading && attendees.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-sm">Loading attendees...</div>
            ) : paid.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-sm">No paid attendees yet for this event.</div>
            ) : (
              <div className="space-y-2">
                {paid.map(a => {
                  const aCheckedIn = (a.tickets || []).filter(t => t.is_checked_in).length;
                  return (
                    <div key={a.id} className="rounded-lg border border-stone-200 bg-white overflow-hidden">
                      <button
                        data-testid={`button-attendee-${a.id}`}
                        className="w-full text-left p-3 flex items-center gap-3 hover:bg-stone-50 transition-colors"
                        onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-stone-900 text-sm">{a.buyer_name}</span>
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full">{a.package_name}</span>
                            <span className="text-stone-500 text-xs">× {a.quantity}</span>
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5">{a.buyer_email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {aCheckedIn > 0 ? (
                            <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                              <UserCheck size={10} /> {aCheckedIn}/{a.quantity}
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                              0/{a.quantity} in
                            </span>
                          )}
                          {expanded === a.id ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                        </div>
                      </button>

                      {expanded === a.id && (
                        <div className="border-t border-stone-100 p-3 space-y-2">
                          {(a.tickets || []).map((ticket, ti) => (
                            <div
                              key={ticket.id}
                              data-testid={`row-ticket-${ticket.id}`}
                              className={`flex items-center gap-3 p-2 rounded-lg ${ticket.is_checked_in ? 'bg-green-50 border border-green-200' : 'bg-stone-50 border border-stone-200'}`}
                            >
                              <span className="text-xs text-stone-500 font-mono shrink-0 w-16">Ticket #{ti + 1}</span>
                              {ticket.is_checked_in && ticket.checked_in_at ? (
                                <span className="text-[10px] text-green-600 flex-1">
                                  Checked in at {new Date(ticket.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400 flex-1">Not yet checked in</span>
                              )}
                              <button
                                data-testid={`button-toggle-ticket-${ticket.id}`}
                                onClick={() => toggleCheckin(ticket.id)}
                                disabled={togglingTicket === ticket.id}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-60 shrink-0 ${
                                  ticket.is_checked_in
                                    ? 'bg-stone-100 text-stone-600 border border-stone-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                    : 'bg-stone-900 text-white hover:bg-stone-700'
                                }`}
                              >
                                {togglingTicket === ticket.id ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : ticket.is_checked_in ? (
                                  <><Undo2 size={12} /> Undo</>
                                ) : (
                                  <><Check size={12} /> Check In</>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDoor;
