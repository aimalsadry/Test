import React, { useState, useEffect, useCallback } from 'react';
import { X, LogOut, Calendar, Clock, Users, BarChart3, Settings, ChevronLeft, ChevronRight, Search, Download, Check, XCircle, AlertCircle, Eye, Trash2, Plus, Package, FileText, ClipboardList, Menu, Upload, User, Ticket, ScanLine, Mail } from 'lucide-react';
import ProductsView from './AdminProducts';
import PagesView from './AdminPages';
import FormsView from './AdminForms';
import EventsView from './AdminEvents';
import DoorView from './AdminDoor';


const API = '/api';

interface Booking {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  preferred_date: string;
  preferred_time: string;
  end_time: string;
  message: string;
  status: string;
  decline_reason: string;
  tags: string[];
  private_notes: string;
  source_page: string;
  created_at: string;
  updated_at: string;
}

interface ContactMessage {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface AvailabilityRule {
  id: number;
  day_of_week: number;
  is_working_day: boolean;
  open_time: string;
  close_time: string;
  lunch_start: string;
  lunch_end: string;
}

interface BlockedDate {
  id: number;
  blocked_date: string;
  reason: string;
}

interface EmailTemplate {
  id: number;
  template_type: string;
  subject: string;
  body: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TAG_OPTIONS = ['urgent', 'VIP', 'incomplete', 'follow-up'];

function normalizeDate(d: string): string {
  if (!d) return d;
  if (d.includes('T')) return d.split('T')[0];
  return d;
}
const TAG_COLORS: Record<string, string> = {
  'urgent': 'bg-red-100 text-red-700',
  'VIP': 'bg-amber-100 text-amber-700',
  'incomplete': 'bg-orange-100 text-orange-700',
  'follow-up': 'bg-blue-100 text-blue-700',
};

async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (res.status === 401) {
    window.location.hash = '#/admin';
    throw new Error('Session expired');
  }
  return res;
}

const AdminLogin: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm">
        <h1 className="font-serif text-3xl text-stone-900 mb-2 text-center">Admin Panel</h1>
        <p className="text-stone-500 text-sm text-center mb-8">Aimal.fi Advisory</p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">User ID</label>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
              required
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
              required
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-stone-800 transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const BookingDetail: React.FC<{ booking: Booking; onClose: () => void; onUpdate: () => void }> = ({ booking, onClose, onUpdate }) => {
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [notes, setNotes] = useState(booking.private_notes || '');
  const [tags, setTags] = useState<string[]>(booking.tags || []);
  const [saving, setSaving] = useState(false);

  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await apiCall(`${API}/bookings/${booking.id}/approve`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      else onUpdate();
    } catch { }
    setSaving(false);
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) return alert('Please provide a reason');
    setSaving(true);
    try {
      await apiCall(`${API}/bookings/${booking.id}/decline`, {
        method: 'PUT',
        body: JSON.stringify({ reason: declineReason }),
      });
      onUpdate();
    } catch { }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return alert('Please provide a reason');
    setSaving(true);
    try {
      const res = await apiCall(`${API}/bookings/${booking.id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      else onUpdate();
    } catch { }
    setSaving(false);
  };

  const toggleTag = async (tag: string) => {
    const newTags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(newTags);
    await apiCall(`${API}/bookings/${booking.id}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags: newTags }),
    });
  };

  const saveNotes = async () => {
    await apiCall(`${API}/bookings/${booking.id}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  };

  const formatDate = (d: string) => {
    const clean = normalizeDate(d);
    return new Date(clean + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  const formatTime = (t: string) => t?.substring(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-5 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-serif text-xl sm:text-2xl text-stone-900">Booking Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">First Name</span><span className="text-stone-900">{booking.first_name}</span></div>
            <div><span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Last Name</span><span className="text-stone-900">{booking.last_name}</span></div>
            <div><span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Email</span><span className="text-stone-900 break-all">{booking.email}</span></div>
            <div><span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Phone</span><span className="text-stone-900">{booking.phone}</span></div>
            <div><span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Date</span><span className="text-stone-900">{formatDate(booking.preferred_date)}</span></div>
            <div><span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Time</span><span className="text-stone-900">{formatTime(booking.preferred_time)} - {formatTime(booking.end_time)}</span></div>
          </div>

          {booking.message && (
            <div><span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Message</span><p className="text-stone-700 text-sm bg-stone-50 p-3 rounded-lg">{booking.message}</p></div>
          )}

          <div><span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Source</span><span className="text-stone-600 text-sm">{booking.source_page || 'Unknown'}</span></div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-2">Status</span>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${booking.status === 'approved' ? 'bg-green-100 text-green-700' : booking.status === 'declined' ? 'bg-red-100 text-red-700' : booking.status === 'cancelled' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'}`}>
              {booking.status}
            </span>
          </div>

          {booking.decline_reason && (
            <div><span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Decline Reason</span><p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{booking.decline_reason}</p></div>
          )}

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-2">Tags</span>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${tags.includes(tag) ? TAG_COLORS[tag] : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Private Notes</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 resize-none focus:outline-none focus:border-stone-400" rows={3}
              placeholder="Add internal notes..." />
          </div>

          {booking.status === 'pending' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button onClick={handleApprove} disabled={saving}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                <Check size={16} /> Approve
              </button>
              <button onClick={() => setShowDecline(!showDecline)} disabled={saving}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                <XCircle size={16} /> Decline
              </button>
            </div>
          )}

          {showDecline && booking.status === 'pending' && (
            <div className="space-y-3 animate-fade-in">
              <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-stone-800 resize-none focus:outline-none focus:border-red-400" rows={3}
                placeholder="Reason for declining (required)..." />
              <button onClick={handleDecline} disabled={saving || !declineReason.trim()}
                className="w-full py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-700 disabled:opacity-60">
                Confirm Decline
              </button>
            </div>
          )}

          {booking.status === 'approved' && (
            <div className="pt-2">
              <button onClick={() => setShowCancel(!showCancel)} disabled={saving}
                className="w-full py-3 bg-amber-500 text-white rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                <XCircle size={16} /> Cancel Meeting
              </button>
            </div>
          )}

          {showCancel && booking.status === 'approved' && (
            <div className="space-y-3 animate-fade-in">
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-stone-800 resize-none focus:outline-none focus:border-amber-400" rows={3}
                placeholder="Reason for cancellation (required)..." />
              <button onClick={handleCancel} disabled={saving || !cancelReason.trim()}
                className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-amber-600 disabled:opacity-60">
                Confirm Cancellation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CalendarView: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const loadCalendar = useCallback(async () => {
    try {
      const res = await apiCall(`${API}/bookings/calendar/${year}/${month}`);
      const data = await res.json();
      setBookings(data);
    } catch { }
  }, [year, month]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const getBookingsForDate = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(b => normalizeDate(b.preferred_date) === dateStr);
  };

  const dayBookings = selectedDate ? bookings.filter(b => normalizeDate(b.preferred_date) === selectedDate) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 hover:bg-stone-100 rounded-lg"><ChevronLeft size={20} /></button>
        <h2 className="font-serif text-2xl text-stone-900">{monthName}</h2>
        <button onClick={nextMonth} className="p-2 hover:bg-stone-100 rounded-lg"><ChevronRight size={20} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {[['S','Sun'],['M','Mon'],['T','Tue'],['W','Wed'],['T','Thu'],['F','Fri'],['S','Sat']].map(([short, full], i) => (
          <div key={full} className="text-center text-[10px] uppercase font-bold tracking-widest text-stone-400 py-2">
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{full}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayBookingsList = getBookingsForDate(day);
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          return (
            <button key={day} onClick={() => setSelectedDate(dateStr)}
              className={`p-1.5 sm:p-2 min-h-[48px] sm:min-h-[60px] rounded-lg text-left transition-all relative ${isSelected ? 'bg-stone-900 text-white' : isToday ? 'bg-amber-50 border border-amber-200' : 'hover:bg-stone-50 border border-transparent'}`}>
              <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-white' : ''}`}>{day}</span>
              {dayBookingsList.length > 0 && (
                <div className={`mt-0.5 text-[9px] sm:text-[10px] font-bold leading-tight ${isSelected ? 'text-amber-300' : 'text-green-600'}`}>
                  <span className="sm:hidden">{dayBookingsList.length}</span>
                  <span className="hidden sm:inline">{dayBookingsList.length} meeting{dayBookingsList.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-6 border-t border-stone-100 pt-6">
          <h3 className="font-serif text-xl text-stone-900 mb-4">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          {dayBookings.length === 0 ? (
            <p className="text-stone-500 text-sm">No approved meetings on this date.</p>
          ) : (
            <div className="space-y-2">
              {dayBookings.map(b => (
                <button key={b.id} onClick={() => setSelectedBooking(b)}
                  className="w-full text-left p-3 sm:p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-900 text-sm">{b.first_name} {b.last_name}</span>
                      <span className="text-stone-500 text-xs">{b.preferred_time?.substring(0, 5)}–{b.end_time?.substring(0, 5)}</span>
                    </div>
                  </div>
                  <Eye size={16} className="text-stone-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedBooking && <BookingDetail booking={selectedBooking} onClose={() => setSelectedBooking(null)} onUpdate={() => { loadCalendar(); setSelectedBooking(null); }} />}
    </div>
  );
};


const TodayView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [search, setSearch] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(true);

  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(`${API}/bookings/today`);
      setBookings(await res.json());
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { loadToday(); }, [loadToday]);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.first_name.toLowerCase().includes(s) || b.last_name.toLowerCase().includes(s) || b.phone.includes(s);
  });

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Today's Schedule", 20, 20);
    doc.setFontSize(11);
    doc.text(todayStr, 20, 30);

    let y = 45;
    filtered.forEach((b, i) => {
      doc.setFontSize(11);
      doc.text(`${i + 1}. ${b.preferred_time?.substring(0, 5)} - ${b.end_time?.substring(0, 5)}  |  ${b.first_name} ${b.last_name}`, 20, y);
      y += 7;
      doc.setFontSize(9);
      doc.text(`   Phone: ${b.phone}  |  Email: ${b.email}`, 20, y);
      y += 10;
      if (y > 270) { doc.addPage(); y = 20; }
    });

    doc.save(`schedule-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="mb-6 space-y-3">
        <div>
          <p className="text-stone-500 text-sm">{todayStr}</p>
          <p className="font-serif text-3xl sm:text-4xl text-stone-900 font-bold tabular-nums">{time}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400 w-full"
              placeholder="Search name or phone" />
          </div>
          <button onClick={exportPDF} className="px-3 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 flex items-center gap-1.5 shrink-0">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-500">{search ? 'No matching meetings.' : 'No meetings scheduled for today.'}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b, i) => (
            <button key={b.id} onClick={() => setSelectedBooking(b)}
              className="w-full text-left p-3 sm:p-4 bg-white rounded-lg border border-stone-100 hover:border-stone-300 transition-all flex items-center gap-3 min-w-0">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-stone-900 text-sm">{b.first_name} {b.last_name}</span>
                  <span className="text-stone-500 text-xs">{b.preferred_time?.substring(0, 5)}–{b.end_time?.substring(0, 5)}</span>
                </div>
                {b.tags && b.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">{b.tags.map(t => <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TAG_COLORS[t] || 'bg-stone-100'}`}>{t}</span>)}</div>
                )}
              </div>
              <Eye size={16} className="text-stone-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {selectedBooking && <BookingDetail booking={selectedBooking} onClose={() => setSelectedBooking(null)} onUpdate={() => { loadToday(); setSelectedBooking(null); }} />}
    </div>
  );
};

const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiCall(`${API}/bookings/stats`);
        setStats(await res.json());
      } catch { }
      setLoading(false);
    })();
  }, []);

  const exportCSV = () => {
    window.open(`${API}/bookings/export-csv`, '_blank');
  };

  if (loading) return <div className="text-center py-12 text-stone-500">Loading...</div>;
  if (!stats) return <div className="text-center py-12 text-stone-500">Failed to load stats.</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl text-stone-900">Dashboard</h2>
        <button onClick={exportCSV}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 flex items-center gap-2">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-100 p-6">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">Total Requests</p>
          <p className="font-serif text-3xl text-stone-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-100 p-6">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">Approved</p>
          <p className="font-serif text-3xl text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-100 p-6">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">Pending</p>
          <p className="font-serif text-3xl text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-100 p-6">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">Approval Rate</p>
          <p className="font-serif text-3xl text-stone-900">{stats.approvalRate}%</p>
        </div>
      </div>

      {stats.peakHours && stats.peakHours.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-100 p-6">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-4">Peak Booking Hours</p>
          <div className="space-y-3">
            {stats.peakHours.map((h: any) => (
              <div key={h.hour} className="flex items-center gap-4">
                <span className="text-sm font-medium text-stone-700 w-16">{String(Math.floor(h.hour)).padStart(2, '0')}:00</span>
                <div className="flex-1 bg-stone-100 rounded-full h-4 overflow-hidden">
                  <div className="h-full bg-stone-900 rounded-full" style={{ width: `${Math.min(100, (h.count / Math.max(...stats.peakHours.map((p: any) => parseInt(p.count)))) * 100)}%` }} />
                </div>
                <span className="text-sm text-stone-500">{h.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView: React.FC = () => {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hours');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImgSaving, setProfileImgSaving] = useState(false);
  const [profileImgMsg, setProfileImgMsg] = useState('');
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [activeEmailType, setActiveEmailType] = useState('confirmation');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [rulesRes, blockedRes, settingsRes, profileRes, emailRes] = await Promise.all([
          apiCall(`${API}/settings/availability`),
          apiCall(`${API}/settings/blocked-dates`),
          apiCall(`${API}/settings/booking-settings`),
          apiCall(`${API}/settings/profile-image`),
          apiCall(`${API}/settings/email-templates`),
        ]);
        setRules(await rulesRes.json());
        setBlockedDates(await blockedRes.json());
        setSettings(await settingsRes.json());
        const profileData = await profileRes.json();
        setProfileImage(profileData.image || null);
        setEmailTemplates(await emailRes.json());
      } catch { }
    })();
  }, []);

  const getTemplate = (type: string) => emailTemplates.find(t => t.template_type === type) || { id: 0, template_type: type, subject: '', body: '' };

  const updateTemplate = (type: string, field: 'subject' | 'body', value: string) => {
    setEmailTemplates(prev => prev.map(t => t.template_type === type ? { ...t, [field]: value } : t));
  };

  const saveEmailTemplate = async (type: string) => {
    const tpl = getTemplate(type);
    setEmailSaving(true);
    setEmailMsg('');
    try {
      const res = await apiCall(`${API}/settings/email-templates/${type}`, {
        method: 'PUT',
        body: JSON.stringify({ subject: tpl.subject, body: tpl.body }),
      });
      if (res.ok) setEmailMsg('Template saved successfully');
      else setEmailMsg('Failed to save');
    } catch { setEmailMsg('Error saving'); }
    setEmailSaving(false);
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setProfileImgSaving(true);
      setProfileImgMsg('');
      try {
        const res = await apiCall(`${API}/settings/profile-image`, {
          method: 'POST',
          body: JSON.stringify({ image: base64 }),
        });
        if (res.ok) {
          setProfileImage(base64);
          setProfileImgMsg('Image saved successfully');
        } else {
          setProfileImgMsg('Failed to save image');
        }
      } catch {
        setProfileImgMsg('Error saving image');
      }
      setProfileImgSaving(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleProfileImageRemove = async () => {
    setProfileImgSaving(true);
    setProfileImgMsg('');
    try {
      const res = await apiCall(`${API}/settings/profile-image`, { method: 'DELETE' });
      if (res.ok) {
        setProfileImage(null);
        setProfileImgMsg('Image removed');
      } else {
        setProfileImgMsg('Failed to remove image');
      }
    } catch {
      setProfileImgMsg('Error removing image');
    }
    setProfileImgSaving(false);
  };

  const saveRules = async () => {
    setSaving(true);
    await apiCall(`${API}/settings/availability`, { method: 'PUT', body: JSON.stringify({ rules }) });
    setSaving(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    await apiCall(`${API}/settings/booking-settings`, { method: 'PUT', body: JSON.stringify({ settings }) });
    setSaving(false);
  };

  const addBlockedDate = async () => {
    if (!newBlockedDate) return;
    await apiCall(`${API}/settings/blocked-dates`, { method: 'POST', body: JSON.stringify({ date: newBlockedDate, reason: newBlockedReason }) });
    const res = await apiCall(`${API}/settings/blocked-dates`);
    setBlockedDates(await res.json());
    setNewBlockedDate('');
    setNewBlockedReason('');
  };

  const removeBlockedDate = async (id: number) => {
    await apiCall(`${API}/settings/blocked-dates/${id}`, { method: 'DELETE' });
    setBlockedDates(prev => prev.filter(d => d.id !== id));
  };

  const changePassword = async () => {
    setPwMsg('');
    try {
      const res = await apiCall(`${API}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPwMsg(data.error || 'Failed');
      }
    } catch { setPwMsg('Error'); }
  };

  const tabs = [
    { id: 'hours', label: 'Working Hours', icon: <Clock size={16} /> },
    { id: 'blocked', label: 'Holidays', icon: <Calendar size={16} /> },
    { id: 'booking', label: 'Booking Rules', icon: <Settings size={16} /> },
    { id: 'emails', label: 'Email Templates', icon: <Mail size={16} /> },
    { id: 'profile', label: 'Profile Image', icon: <User size={16} /> },
    { id: 'password', label: 'Password', icon: <Users size={16} /> },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'hours' && (
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={rule.day_of_week} className="bg-white rounded-lg border border-stone-100 p-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 w-32">
                <input type="checkbox" checked={rule.is_working_day}
                  onChange={e => { const r = [...rules]; r[idx] = { ...r[idx], is_working_day: e.target.checked }; setRules(r); }}
                  className="accent-stone-900" />
                <span className="text-sm font-medium text-stone-900">{DAY_NAMES[rule.day_of_week]}</span>
              </label>
              {rule.is_working_day && (
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <label className="text-stone-500">Open
                    <input type="time" value={rule.open_time?.substring(0, 5)}
                      onChange={e => { const r = [...rules]; r[idx] = { ...r[idx], open_time: e.target.value }; setRules(r); }}
                      className="ml-1 px-2 py-1 bg-stone-50 border border-stone-200 rounded text-stone-800" />
                  </label>
                  <label className="text-stone-500">Close
                    <input type="time" value={rule.close_time?.substring(0, 5)}
                      onChange={e => { const r = [...rules]; r[idx] = { ...r[idx], close_time: e.target.value }; setRules(r); }}
                      className="ml-1 px-2 py-1 bg-stone-50 border border-stone-200 rounded text-stone-800" />
                  </label>
                  <label className="text-stone-500">Lunch
                    <input type="time" value={rule.lunch_start?.substring(0, 5)}
                      onChange={e => { const r = [...rules]; r[idx] = { ...r[idx], lunch_start: e.target.value }; setRules(r); }}
                      className="ml-1 px-2 py-1 bg-stone-50 border border-stone-200 rounded text-stone-800" />
                  </label>
                  <span className="text-stone-400">to</span>
                  <input type="time" value={rule.lunch_end?.substring(0, 5)}
                    onChange={e => { const r = [...rules]; r[idx] = { ...r[idx], lunch_end: e.target.value }; setRules(r); }}
                    className="px-2 py-1 bg-stone-50 border border-stone-200 rounded text-stone-800" />
                </div>
              )}
            </div>
          ))}
          <button onClick={saveRules} disabled={saving}
            className="px-6 py-3 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Working Hours'}
          </button>
        </div>
      )}

      {activeTab === 'blocked' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Date</label>
              <input type="date" value={newBlockedDate} onChange={e => setNewBlockedDate(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Reason</label>
              <input value={newBlockedReason} onChange={e => setNewBlockedReason(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm" placeholder="e.g. Christmas" />
            </div>
            <button onClick={addBlockedDate} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {blockedDates.map(d => (
              <div key={d.id} className="bg-white rounded-lg border border-stone-100 p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-stone-900">{new Date(normalizeDate(d.blocked_date) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  {d.reason && <span className="text-stone-500 text-sm ml-3">— {d.reason}</span>}
                </div>
                <button onClick={() => removeBlockedDate(d.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
            {blockedDates.length === 0 && <p className="text-stone-500 text-sm">No blocked dates set.</p>}
          </div>
        </div>
      )}

      {activeTab === 'booking' && (
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Meeting Duration (minutes)</label>
            <input type="number" value={settings.meeting_duration_minutes || '30'}
              onChange={e => setSettings(s => ({ ...s, meeting_duration_minutes: e.target.value }))}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm w-full" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Buffer After Meeting (minutes)</label>
            <input type="number" value={settings.buffer_minutes || '15'}
              onChange={e => setSettings(s => ({ ...s, buffer_minutes: e.target.value }))}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm w-full" />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.prevent_same_day_booking === 'true'}
                onChange={e => setSettings(s => ({ ...s, prevent_same_day_booking: e.target.checked ? 'true' : 'false' }))}
                className="accent-stone-900" />
              <span className="text-sm text-stone-700">Prevent same-day booking</span>
            </label>
          </div>
          <div className="border-t border-stone-100 pt-4 mt-2">
            <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">Door Scanner PIN</p>
            <p className="text-xs text-stone-400 mb-3">Give this PIN to door staff so they can access the scanner at <span className="font-mono text-stone-600">/door</span> without admin access.</p>
            <input
              type="text"
              inputMode="numeric"
              value={settings.door_pin || ''}
              onChange={e => setSettings(s => ({ ...s, door_pin: e.target.value }))}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm w-full font-mono tracking-wider"
              placeholder="e.g. 4321"
            />
          </div>
          <button onClick={saveSettings} disabled={saving}
            className="px-6 py-3 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}


      {activeTab === 'emails' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
            Available variables: <code className="font-mono font-bold">{'{first_name}'}</code> <code className="font-mono font-bold">{'{last_name}'}</code> <code className="font-mono font-bold">{'{date}'}</code> <code className="font-mono font-bold">{'{time}'}</code> <code className="font-mono font-bold">{'{reason}'}</code> (decline only)
          </div>
          <div className="flex gap-2">
            {['confirmation', 'decline', 'cancellation'].map(type => (
              <button key={type} onClick={() => { setActiveEmailType(type); setEmailMsg(''); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider capitalize transition-colors ${activeEmailType === type ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                {type}
              </button>
            ))}
          </div>
          {['confirmation', 'decline', 'cancellation'].map(type => {
            const tpl = getTemplate(type);
            return activeEmailType === type ? (
              <div key={type} className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Subject Line</label>
                  <input type="text" value={tpl.subject}
                    onChange={e => updateTemplate(type, 'subject', e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                    placeholder="Email subject..." />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Email Body</label>
                  <textarea value={tpl.body} rows={12}
                    onChange={e => updateTemplate(type, 'body', e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-mono focus:outline-none focus:border-stone-400 resize-y"
                    placeholder="Email body text..." />
                </div>
                {emailMsg && (
                  <p className={`text-sm font-medium ${emailMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{emailMsg}</p>
                )}
                <button onClick={() => saveEmailTemplate(type)} disabled={emailSaving}
                  className="px-6 py-3 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
                  {emailSaving ? 'Saving...' : `Save ${type} Template`}
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="max-w-sm space-y-6">
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Current Profile Image</p>
            {profileImage ? (
              <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-48 h-48 rounded-xl border border-dashed border-stone-300 bg-stone-50 flex flex-col items-center justify-center gap-2 text-stone-400">
                <User size={40} strokeWidth={1} />
                <span className="text-xs">No image set</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="sr-only">Upload profile image</span>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="profile-img-input"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors cursor-pointer ${profileImgSaving ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <Upload size={14} /> {profileImgSaving ? 'Saving...' : 'Upload Image'}
                </label>
                {profileImage && (
                  <button
                    onClick={handleProfileImageRemove}
                    disabled={profileImgSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <input
                id="profile-img-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageUpload}
                disabled={profileImgSaving}
              />
            </label>
            <p className="text-xs text-stone-400">Image will appear on the /about and /card pages. Recommended: portrait orientation.</p>
            {profileImgMsg && (
              <p className={`text-sm font-medium ${profileImgMsg.includes('success') || profileImgMsg.includes('removed') ? 'text-green-600' : 'text-red-600'}`}>
                {profileImgMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="max-w-sm space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm" />
          </div>
          {pwMsg && <p className={`text-sm ${pwMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{pwMsg}</p>}
          <button onClick={changePassword}
            className="px-6 py-3 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800">
            Change Password
          </button>
        </div>
      )}
    </div>
  );
};


const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeView, setActiveView] = useState('calendar');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    onLogout();
  };

  const navItems = [
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
    { id: 'today', label: 'Today', icon: <Clock size={18} /> },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
    { id: 'products', label: 'Products', icon: <Package size={18} /> },
    { id: 'events', label: 'Events', icon: <Ticket size={18} /> },
    { id: 'pages', label: 'New Page', icon: <FileText size={18} /> },
    { id: 'forms', label: 'Forms', icon: <ClipboardList size={18} /> },
    { id: 'door', label: 'Door', icon: <ScanLine size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const navigate = (id: string) => {
    setActiveView(id);
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-stone-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 text-stone-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            aria-label="Open menu">
            <Menu size={22} />
          </button>
          <h1 className="font-serif text-lg font-bold">Aimal.fi <span className="text-amber-400 text-xs font-normal uppercase tracking-widest ml-1">Admin</span></h1>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => navigate(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeView === item.id ? 'bg-white/20 text-white' : 'text-stone-400 hover:text-white hover:bg-white/10'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-3 sm:px-4 py-2 text-stone-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
          <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute left-0 top-0 bottom-0 w-72 bg-stone-900 flex flex-col shadow-2xl transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="font-serif text-white text-lg">Aimal.fi <span className="text-amber-400 text-xs font-normal uppercase tracking-widest ml-1">Admin</span></h2>
            <button onClick={() => setDrawerOpen(false)} className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-white/10">
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <button key={item.id} onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors text-left ${activeView === item.id ? 'bg-white/20 text-white' : 'text-stone-400 hover:text-white hover:bg-white/10'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-stone-400 hover:text-white hover:bg-white/10 transition-colors">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'today' && <TodayView />}
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'products' && <ProductsView />}
        {activeView === 'events' && <EventsView />}
        {activeView === 'pages' && <PagesView />}
        {activeView === 'forms' && <FormsView />}
        {activeView === 'door' && <DoorView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.title = 'Admin - Aimal.fi';
    return () => { document.head.removeChild(meta); document.title = 'Aimal.fi Advisory'; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
        setAuthenticated(res.ok);
      } catch {
        setAuthenticated(false);
      }
    })();
  }, []);

  if (authenticated === null) return <div className="min-h-screen bg-stone-900 flex items-center justify-center"><div className="text-white">Loading...</div></div>;
  if (!authenticated) return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  return <AdminDashboard onLogout={() => setAuthenticated(false)} />;
};

export default AdminPanel;
