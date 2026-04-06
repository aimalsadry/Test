import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Tag, ShoppingCart, Key, AlertCircle, X, Clock, Calendar, CheckCircle2, RotateCcw, PenLine } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface ProductImage {
  id: number;
  image_data: string;
  is_main: boolean;
}

interface CheckoutField {
  id: number;
  field_type: string;
  field_label: string;
  field_placeholder: string;
  is_required: boolean;
  sort_order: number;
}

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  discount_percent: number;
  receipt_sentence: string;
  sumup_checkout_url: string;
  slug: string;
  images: ProductImage[];
  has_keys: boolean;
  can_purchase: boolean;
  is_out_of_stock: boolean;
  checkout_info_enabled: boolean;
  book_to_receive_enabled: boolean;
  book_to_receive_title: string;
  book_to_receive_buffer_days: number;
  checkout_fields: CheckoutField[];
}

interface TimeSlot {
  start: string;
  end: string;
}

interface BookedSlot {
  date: string;
  time: string;
}

const PhotoField: React.FC<{
  fieldId: number;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ fieldId, placeholder, value, onChange }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleRemove = () => {
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className={`flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${value ? 'border-stone-400 bg-stone-50' : 'border-stone-200 bg-stone-50 hover:border-stone-400 hover:bg-stone-100'}`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => { onChange(ev.target?.result as string || ''); };
            reader.readAsDataURL(file);
          }}
        />
        {value ? (
          <img src={value} alt="Preview" className="max-h-40 max-w-full rounded object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-stone-400">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <span className="text-xs">{placeholder || 'Click to upload image'}</span>
          </div>
        )}
      </label>
      {value && (
        <button type="button" onClick={handleRemove}
          className="mt-1 text-xs text-stone-400 hover:text-red-500 transition-colors">
          Remove photo
        </button>
      )}
    </div>
  );
};

const SignatureField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [confirmed, setConfirmed] = useState(!!value);
  const [isEmpty, setIsEmpty] = useState(!value);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setIsEmpty(false);
  };

  const stopDraw = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setConfirmed(false);
    onChange('');
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
    setConfirmed(true);
  };

  const edit = () => {
    setConfirmed(false);
  };

  if (confirmed && value) {
    return (
      <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2 bg-green-50 border-b border-green-100">
          <div className="flex items-center gap-2 text-green-700 text-xs font-bold uppercase tracking-widest">
            <CheckCircle2 size={13} /> Signature confirmed
          </div>
          <button type="button" onClick={edit}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors">
            <PenLine size={12} /> Edit
          </button>
        </div>
        <div className="p-3 flex justify-center">
          <img src={value} alt="Signature" className="max-h-24 max-w-full" style={{ background: 'white' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 flex items-center gap-1.5">
          <PenLine size={11} /> Draw your signature below
        </span>
        <button type="button" onClick={clear}
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors">
          <RotateCcw size={11} /> Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={460}
        height={140}
        className="w-full touch-none bg-white cursor-crosshair block"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3">
        <span className="text-[10px] text-stone-400">Sign with your mouse or finger</span>
        <button type="button" onClick={confirm} disabled={isEmpty}
          className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <CheckCircle2 size={13} /> Confirm Signature
        </button>
      </div>
    </div>
  );
};

const BuyModal: React.FC<{
  product: Product;
  bookedSlot?: BookedSlot;
  onClose: () => void;
}> = ({ product, bookedSlot, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [checkoutValues, setCheckoutValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finalPrice = Number(product.discount_percent) > 0
    ? Number(product.price) * (1 - Number(product.discount_percent) / 100)
    : Number(product.price);

  const checkoutFields = product.checkout_info_enabled ? (product.checkout_fields || []) : [];

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return setError('Name and email are required');

    for (const field of checkoutFields) {
      if (field.is_required && !checkoutValues[field.id]?.trim()) {
        return setError(`"${field.field_label}" is required`);
      }
    }

    setLoading(true);
    setError('');

    const checkoutInfo: Record<string, string> = {};
    for (const field of checkoutFields) {
      checkoutInfo[field.field_label] = checkoutValues[field.id] || '';
    }

    try {
      const res = await fetch(`/api/products/${product.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: name.trim(),
          buyer_email: email.trim(),
          checkout_info: checkoutFields.length > 0 ? checkoutInfo : undefined,
          booked_slot: bookedSlot ? `${bookedSlot.date} ${bookedSlot.time}` : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.purchaseId && Number(data.amount) === 0) {
        window.location.href = `/receipt/${data.purchaseId}?token=${data.receiptToken}`;
      } else {
        setError(data.error || 'Payment is not yet configured. Please contact us directly.');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <div>
            <h3 className="font-serif text-xl text-stone-900">Purchase</h3>
            <p className="text-stone-500 text-sm mt-0.5">{product.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handlePurchase} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex justify-between items-center">
              <span className="text-stone-600 text-sm">{product.title}</span>
              <div className="text-right">
                {product.discount_percent > 0 ? (
                  <>
                    <div className="font-bold text-stone-900">€{finalPrice.toFixed(2)}</div>
                    <div className="text-stone-400 text-xs line-through">€{Number(product.price).toFixed(2)}</div>
                  </>
                ) : (
                  <div className="font-bold text-stone-900">€{Number(product.price).toFixed(2)}</div>
                )}
              </div>
            </div>
            {bookedSlot && (
              <div className="mt-2 pt-2 border-t border-stone-200 flex items-center gap-2 text-xs text-stone-600">
                <Calendar size={12} />
                <span>{new Date(bookedSlot.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {bookedSlot.time}</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Your Name *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
              placeholder="Full name" />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Email Address *</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
              placeholder="your@email.com" />
            <p className="text-[10px] text-stone-400 mt-1">Your receipt and access key (if applicable) will be tied to this email.</p>
          </div>

          {checkoutFields.length > 0 && (
            <div className="space-y-3 pt-1 border-t border-stone-100">
              {checkoutFields.map(field => (
                <div key={field.id}>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">
                    {field.field_label} {field.is_required && <span className="text-red-400">*</span>}
                  </label>
                  {field.field_type === 'signature' ? (
                    <SignatureField
                      label={field.field_label}
                      value={checkoutValues[field.id] || ''}
                      onChange={val => setCheckoutValues(prev => ({ ...prev, [field.id]: val }))}
                    />
                  ) : field.field_type === 'photo' ? (
                    <PhotoField
                      fieldId={field.id}
                      placeholder={field.field_placeholder}
                      value={checkoutValues[field.id] || ''}
                      onChange={val => setCheckoutValues(prev => ({ ...prev, [field.id]: val }))}
                    />
                  ) : field.field_type === 'textarea' ? (
                    <textarea
                      value={checkoutValues[field.id] || ''}
                      onChange={e => setCheckoutValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      rows={3}
                      placeholder={field.field_placeholder}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800 resize-none"
                    />
                  ) : (
                    <input
                      type={field.field_type === 'email' ? 'email' : field.field_type === 'tel' ? 'tel' : 'text'}
                      value={checkoutValues[field.id] || ''}
                      onChange={e => setCheckoutValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.field_placeholder}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-stone-900 text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-stone-800 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
            <ShoppingCart size={14} />
            {loading ? 'Processing...' : `Pay €${finalPrice.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let count = 0;
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d;
}

const BookingPicker: React.FC<{
  title: string;
  bufferDays: number;
  onSlotSelected: (slot: BookedSlot) => void;
}> = ({ title, bufferDays, onSlotSelected }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [closed, setClosedDay] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime('');
    fetch(`/api/bookings/available-slots?date=${selectedDate}`)
      .then(r => r.json())
      .then(data => {
        if (data.closed) { setClosedDay(true); setSlots([]); }
        else { setClosedDay(false); setSlots(data.slots || []); }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliestBookable = addWorkingDays(today, bufferDays);
  earliestBookable.setHours(0, 0, 0, 0);
  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  return (
    <div className="mt-8 border border-stone-200 rounded-2xl p-6 bg-stone-50/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 rounded-full">
          <Calendar size={18} className="text-amber-700" />
        </div>
        <div>
          <h3 className="font-serif text-lg text-stone-900">{title || 'Book a Receiving Time'}</h3>
          <p className="text-stone-500 text-xs">Select a date and time before proceeding to payment</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
        <span className="text-sm font-medium text-stone-900">{monthName}</span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors"><ChevronRight size={18} /></button>
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
          const isPast = dateObj < earliestBookable;
          const isSelected = dateStr === selectedDate;
          const isToday = dateObj.getTime() === today.getTime();

          return (
            <button key={day} disabled={isPast}
              onClick={() => setSelectedDate(dateStr)}
              className={`p-2 rounded-lg text-sm transition-all ${isPast ? 'text-stone-300 cursor-not-allowed' : isSelected ? 'bg-stone-900 text-white' : isToday ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100' : 'hover:bg-stone-200'}`}>
              {day}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-5 animate-fade-in">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-3">Select Time</p>
          {loadingSlots ? (
            <p className="text-stone-500 text-sm">Loading available times...</p>
          ) : closed ? (
            <p className="text-stone-500 text-sm">Not available on this day.</p>
          ) : slots.length === 0 ? (
            <p className="text-stone-500 text-sm">No available slots for this date.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => (
                <button key={slot.start} onClick={() => setSelectedTime(slot.start)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${selectedTime === slot.start ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 hover:border-stone-400 text-stone-700'}`}>
                  <Clock size={12} /> {slot.start}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedDate && selectedTime && (
        <button
          onClick={() => onSlotSelected({ date: selectedDate, time: selectedTime })}
          className="w-full mt-5 py-4 bg-stone-900 text-white rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:bg-stone-800 transition-all shadow-lg flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          Confirm — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at {selectedTime}
        </button>
      )}
    </div>
  );
};

const ProductPageComponent: React.FC<{ slug: string; onNavigateHome: () => void }> = ({ slug, onNavigateHome }) => {
  const { language } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<BookedSlot | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/by-slug/${encodeURIComponent(slug)}?lang=${language}`);
      if (res.status === 404) {
        setNotFound(true);
      } else if (res.ok) {
        const data = await res.json();
        setProduct(data);
        const mainIdx = data.images.findIndex((img: ProductImage) => img.is_main);
        setActiveImage(mainIdx >= 0 ? mainIdx : 0);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }, [slug, language]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-stone-500">Loading...</div>
      </main>
    );
  }

  if (notFound || !product) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24">
        <h1 className="font-serif text-5xl text-stone-900 mb-4">Page Not Found</h1>
        <p className="text-stone-500 mb-8">This product page doesn't exist or has been removed.</p>
        <button onClick={onNavigateHome}
          className="px-8 py-4 bg-stone-900 text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-stone-800 transition-all">
          Go Home
        </button>
      </main>
    );
  }

  const finalPrice = Number(product.discount_percent) > 0
    ? Number(product.price) * (1 - Number(product.discount_percent) / 100)
    : Number(product.price);

  const images = product.images;
  const needsBooking = product.book_to_receive_enabled;

  const handleBuyClick = () => {
    if (!needsBooking || bookedSlot) {
      setShowBuyModal(true);
    }
  };

  const handleSlotSelected = (slot: BookedSlot) => {
    setBookedSlot(slot);
    setShowBuyModal(true);
  };

  return (
    <main className="min-h-screen pt-28 pb-16 flex flex-col justify-center animate-fade-in">
      {showBuyModal && (
        <BuyModal
          product={product}
          bookedSlot={bookedSlot}
          onClose={() => setShowBuyModal(false)}
        />
      )}

      <div className="container mx-auto px-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            {images.length > 0 ? (
              <div>
                <div className="relative rounded-2xl overflow-hidden bg-stone-100">
                  <img
                    src={images[activeImage]?.image_data}
                    alt={product.title}
                    className="w-full h-auto block"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImage((activeImage - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors">
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => setActiveImage((activeImage + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors">
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button key={img.id} onClick={() => setActiveImage(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === activeImage ? 'border-stone-900' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                        <img src={img.image_data} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-stone-100 aspect-[4/3] flex items-center justify-center text-stone-300">
                <ShoppingCart size={60} strokeWidth={1} />
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-28">
            <h1 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">{product.title}</h1>

            <div className="flex items-center gap-3 mb-6">
              {product.discount_percent > 0 ? (
                <>
                  <span className="font-bold text-3xl text-stone-900">€{finalPrice.toFixed(2)}</span>
                  <span className="text-stone-400 text-xl line-through">€{Number(product.price).toFixed(2)}</span>
                  <span className="flex items-center gap-1 text-sm bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">
                    <Tag size={12} /> {product.discount_percent}% off
                  </span>
                </>
              ) : (
                <span className="font-bold text-3xl text-stone-900">€{Number(product.price).toFixed(2)}</span>
              )}
            </div>

            {product.has_keys && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-6 text-sm text-blue-700">
                <Key size={14} />
                <span>Includes an exclusive access key upon purchase</span>
              </div>
            )}

            {product.description && (
              <div className="mb-8">
                <p className="text-stone-600 leading-relaxed text-base whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {product.is_out_of_stock ? (
              <div className="w-full py-5 bg-stone-100 border border-stone-200 text-stone-500 rounded-full font-bold uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2 cursor-default">
                <ShoppingCart size={16} />
                Out of Stock
              </div>
            ) : product.can_purchase ? (
              <>
                {needsBooking && !bookedSlot ? (
                  <BookingPicker
                    title={product.book_to_receive_title}
                    bufferDays={product.book_to_receive_buffer_days ?? 0}
                    onSlotSelected={handleSlotSelected}
                  />
                ) : (
                  <>
                    {bookedSlot && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <CheckCircle2 size={16} />
                          <span>
                            <span className="font-semibold">{new Date(bookedSlot.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {' '}at{' '}
                            <span className="font-semibold">{bookedSlot.time}</span>
                          </span>
                        </div>
                        <button
                          onClick={() => setBookedSlot(undefined)}
                          className="text-xs text-green-500 hover:text-green-700 underline">
                          Change
                        </button>
                      </div>
                    )}
                    <button
                      onClick={handleBuyClick}
                      className="w-full py-5 bg-stone-900 text-white rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:bg-stone-800 transition-all hover:shadow-xl hover:-translate-y-0.5 shadow-lg flex items-center justify-center gap-2">
                      <ShoppingCart size={16} />
                      Buy Now — €{finalPrice.toFixed(2)}
                    </button>
                    <p className="text-center text-stone-400 text-xs mt-4">Secure payment via SumUp</p>
                  </>
                )}
              </>
            ) : (
              <div className="w-full py-5 bg-stone-100 border border-stone-200 text-stone-500 rounded-full font-bold uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2 cursor-default">
                <ShoppingCart size={16} />
                Coming Soon
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProductPageComponent;
