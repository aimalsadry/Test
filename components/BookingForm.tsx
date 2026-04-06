import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Clock, Phone } from 'lucide-react';

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePage?: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

const BookingForm: React.FC<BookingFormProps> = ({ isOpen, onClose, sourcePage = 'unknown' }) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [closed, setClosed] = useState(false);
  const [closedReason, setClosedReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
    }
  }, [selectedDate]);

  const loadSlots = async (date: string) => {
    setLoadingSlots(true);
    setSelectedTime('');
    try {
      const res = await fetch(`/api/bookings/available-slots?date=${date}`);
      const data = await res.json();
      if (data.closed) {
        setClosed(true);
        setClosedReason(data.reason || '');
        setSlots([]);
      } else {
        setClosed(false);
        setSlots(data.slots || []);
      }
    } catch {
      setSlots([]);
    }
    setLoadingSlots(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      profession: formData.get('profession') as string,
      preferredDate: selectedDate,
      preferredTime: selectedTime,
      sourcePage,
    };

    try {
      const res = await fetch('/api/bookings/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedDate('');
    setSelectedTime('');
    setSubmitted(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative border border-stone-200 max-h-[90vh] overflow-y-auto">
        <button onClick={resetAndClose} className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 transition-colors z-10">
          <X size={24} />
        </button>

        <div className="p-8 md:p-10">
          {submitted ? (
            <div className="py-8 text-center animate-fade-in">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="font-serif text-3xl text-stone-900 mb-4">Call Booked!</h2>
              <p className="text-stone-600 mb-8">Your 10-minute call has been scheduled. We will contact you at the chosen time.</p>
              <button onClick={resetAndClose} className="px-8 py-3 border border-stone-200 rounded-full text-stone-600 hover:bg-stone-50 transition-colors font-medium">
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-stone-100 rounded-full">
                  <Phone size={18} className="text-stone-700" />
                </div>
                <h2 className="font-serif text-3xl text-stone-900">Book a Call</h2>
              </div>
              <p className="text-stone-500 mb-6 text-sm">Select a date and time for your 10-minute phone call.</p>

              <div className="flex items-center gap-4 mb-6">
                <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-stone-900' : 'text-stone-300'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-stone-900 text-white' : 'bg-stone-100'}`}>1</span>
                  Date & Time
                </div>
                <div className="flex-1 h-px bg-stone-200" />
                <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-stone-900' : 'text-stone-300'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-stone-900 text-white' : 'bg-stone-100'}`}>2</span>
                  Your Details
                </div>
              </div>

              {step === 1 && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth} className="p-1 hover:bg-stone-100 rounded"><ChevronLeft size={18} /></button>
                    <span className="text-sm font-medium text-stone-900">{monthName}</span>
                    <button onClick={nextMonth} className="p-1 hover:bg-stone-100 rounded"><ChevronRight size={18} /></button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                      <div key={d} className="text-center text-[10px] uppercase font-bold tracking-widest text-stone-400 py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const dateObj = new Date(calYear, calMonth, day);
                      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isPast = dateObj < today;
                      const isSelected = dateStr === selectedDate;
                      const isToday = dateObj.getTime() === today.getTime();

                      return (
                        <button key={day} disabled={isPast}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`p-2 rounded-lg text-sm transition-all ${isPast ? 'text-stone-300 cursor-not-allowed' : isSelected ? 'bg-stone-900 text-white' : isToday ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100' : 'hover:bg-stone-100'}`}>
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {selectedDate && (
                    <div className="mt-6 animate-fade-in">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-3">Select Time</p>
                      {loadingSlots ? (
                        <p className="text-stone-500 text-sm">Loading available times...</p>
                      ) : closed ? (
                        <p className="text-stone-500 text-sm">{closedReason || 'Not available on this day.'}</p>
                      ) : slots.length === 0 ? (
                        <p className="text-stone-500 text-sm">No available slots for this date.</p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {slots.map(slot => (
                            <button key={slot.start} onClick={() => setSelectedTime(slot.start)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${selectedTime === slot.start ? 'bg-stone-900 text-white' : 'bg-stone-50 border border-stone-200 hover:border-stone-400 text-stone-700'}`}>
                              <Clock size={12} /> {slot.start}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedDate && selectedTime && (
                    <button onClick={() => setStep(2)}
                      className="w-full mt-6 py-4 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-[0.2em] text-xs hover:bg-stone-800 transition-colors">
                      Continue
                    </button>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="animate-fade-in">
                  <div className="mb-6 p-4 bg-stone-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm text-stone-900 font-medium">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-stone-500 text-sm">{selectedTime} · 10 min call</p>
                    </div>
                    <button onClick={() => setStep(1)} className="text-xs text-stone-500 hover:text-stone-900 underline">Change</button>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Full Name</label>
                      <input required name="name" type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-stone-800" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Phone Number</label>
                      <input required name="phone" type="tel" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-stone-800" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Profession</label>
                      <input required name="profession" type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 transition-colors text-stone-800" placeholder="e.g. Entrepreneur, Lawyer, Consultant..." />
                    </div>

                    <button type="submit" disabled={loading}
                      className={`w-full py-4 mt-2 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-[0.2em] text-xs transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-stone-800'}`}>
                      {loading ? 'Booking...' : 'Confirm Call'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingForm;
