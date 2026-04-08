import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Clock, X, AlertCircle, Music, Star, ChevronLeft, ChevronRight, Calendar, Ticket } from 'lucide-react';

interface EventPackage {
  id: number;
  name: string;
  description: string;
  price: string;
  payment_link: string;
  sort_order: number;
}

interface EventImage {
  id: number;
  image_data: string;
  sort_order: number;
}

interface EventData {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  slug: string;
  bg_image: string;
  bg_type: string;
  bg_video: string;
  text_bg_color: string;
  text_bg_opacity: number;
  packages: EventPackage[];
  images: EventImage[];
}

interface Props {
  slug: string;
  onNavigateHome: () => void;
}

function useCountdown(dateStr: string, timeStr: string) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, valid: false });

  useEffect(() => {
    if (!dateStr) return;
    const tick = () => {
      const timeClean = timeStr && /^\d{1,2}:\d{2}/.test(timeStr) ? timeStr.substring(0, 5) : '00:00';
      const targetStr = `${dateStr}T${timeClean}:00`;
      const target = new Date(targetStr).getTime();
      if (isNaN(target)) return;
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, valid: true });
        return;
      }
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
        valid: true,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dateStr, timeStr]);

  return countdown;
}

const CheckoutModal: React.FC<{
  event: EventData;
  selectedPackage: EventPackage;
  quantity: number;
  onClose: () => void;
}> = ({ event, selectedPackage, quantity, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = parseFloat(selectedPackage.price) * quantity;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/events/${event.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_name: name, buyer_email: email, buyer_phone: phone, package_id: selectedPackage.id, quantity }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Purchase failed'); setLoading(false); return; }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        window.location.href = `/event-receipt/${data.purchaseId}?token=${data.receiptToken}`;
      }
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90dvh] overflow-y-auto flex flex-col">
        <div className="p-5 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-serif text-xl text-stone-900">Complete Purchase</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg text-stone-500"><X size={20} /></button>
        </div>
        <div className="p-5 bg-stone-50 border-b border-stone-100">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-2">Order Summary</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-stone-900">{selectedPackage.name}</p>
              {selectedPackage.description && <p className="text-sm text-stone-500">{selectedPackage.description}</p>}
              <p className="text-sm text-stone-500 mt-0.5">€{parseFloat(selectedPackage.price).toFixed(2)} × {quantity} ticket</p>
            </div>
            <p className="font-serif text-2xl text-stone-900">€{total.toFixed(2)}</p>
          </div>
        </div>
        <form onSubmit={handlePay} className="p-5 space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Full Name *</label>
            <input data-testid="input-buyer-name" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800" placeholder="Your full name" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Email Address *</label>
            <input data-testid="input-buyer-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800" placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Phone Number *</label>
            <input data-testid="input-buyer-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800" placeholder="+358 40 000 0000" />
          </div>
          <p className="text-xs text-stone-400">Your QR code tickets will be generated after payment. One QR code per ticket.</p>
          <button data-testid="button-pay" type="submit" disabled={loading}
            className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-[0.15em] text-sm hover:bg-stone-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? 'Processing...' : `Pay €${total.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

const ImageGallery: React.FC<{ images: EventImage[] }> = ({ images }) => {
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  if (images.length === 0) return null;
  const prev = () => setCurrent(c => (c - 1 + images.length) % images.length);
  const next = () => setCurrent(c => (c + 1) % images.length);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape') setLightboxOpen(false);
  };
  return (
    <div className="mt-12 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-serif text-2xl">Photos</h2>
        <span className="text-white/40 text-xs">{images.length} photo{images.length !== 1 ? 's' : ''}</span>
      </div>
      {images.length === 1 ? (
        <div className="rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setCurrent(0); setLightboxOpen(true); }}>
          <img src={images[0].image_data} alt="" className="w-full max-h-96 object-cover" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {images.slice(0, 6).map((img, idx) => (
            <div key={img.id} className="relative rounded-xl overflow-hidden cursor-pointer group aspect-square"
              onClick={() => { setCurrent(idx); setLightboxOpen(true); }}>
              <img src={img.image_data} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              {idx === 5 && images.length > 6 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">+{images.length - 6}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)} onKeyDown={handleKeyDown} tabIndex={0}>
          <button onClick={e => { e.stopPropagation(); setLightboxOpen(false); }} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"><X size={24} /></button>
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-4 p-3 text-white/70 hover:text-white bg-white/10 rounded-full"><ChevronLeft size={24} /></button>
              <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-4 p-3 text-white/70 hover:text-white bg-white/10 rounded-full"><ChevronRight size={24} /></button>
            </>
          )}
          <img src={images[current].image_data} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button key={idx} onClick={e => { e.stopPropagation(); setCurrent(idx); }}
                  className={`w-2 h-2 rounded-full transition-colors ${idx === current ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CountdownUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl px-4 py-3 min-w-[64px] text-center shadow-lg">
      <span className="font-serif text-3xl md:text-4xl font-bold text-white tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
    </div>
    <span className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-bold mt-2">{label}</span>
  </div>
);

const EventPage: React.FC<Props> = ({ slug, onNavigateHome }) => {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<EventPackage | null>(null);
  const quantity = 1;
  const [modalOpen, setModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playAttempted = useRef(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const countdown = useCountdown(event?.date || '', event?.time || '');

  const playVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.volume = 0;
    v.loop = true;
    const attempt = () => v.play().catch(() => {});
    attempt();
    setTimeout(attempt, 500);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/by-slug/${slug}`);
      if (!res.ok) { setError('Event not found'); setLoading(false); return; }
      const data = await res.json();
      setEvent(data);
      if (data.packages?.length > 0) setSelectedPkg(data.packages[0]);
    } catch {
      setError('Failed to load event');
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (event) document.title = `${event.title} — Aimal.fi`;
    return () => { document.title = 'Aimal.fi Advisory'; };
  }, [event]);

  useEffect(() => {
    if (event?.bg_type !== 'video' || !event?.bg_video) return;
    const t1 = setTimeout(playVideo, 50);
    const t2 = setTimeout(playVideo, 1000);
    const onGesture = () => {
      if (playAttempted.current) return;
      playAttempted.current = true;
      playVideo();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') playVideo(); };
    document.addEventListener('touchstart', onGesture, { passive: true, once: true });
    document.addEventListener('touchmove', onGesture, { passive: true, once: true });
    document.addEventListener('scroll', onGesture, { passive: true, once: true });
    document.addEventListener('click', onGesture, { once: true });
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      document.removeEventListener('touchstart', onGesture);
      document.removeEventListener('touchmove', onGesture);
      document.removeEventListener('scroll', onGesture);
      document.removeEventListener('click', onGesture);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [event, playVideo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4">
        <p className="text-white text-lg">{error || 'Event not found'}</p>
        <button onClick={onNavigateHome} className="px-6 py-3 bg-white text-stone-900 rounded-full font-bold text-sm hover:bg-stone-100">Back to Home</button>
      </div>
    );
  }

  const total = selectedPkg ? parseFloat(selectedPkg.price) * quantity : 0;
  const isVideo = event.bg_type === 'video';
  const isGif = event.bg_type === 'gif';
  const hasMedia = (isVideo || isGif) && event.bg_video;
  const hasImageBg = event.bg_type === 'image' && event.bg_image;
  const hasBg = hasMedia || hasImageBg;

  const bgStyle: React.CSSProperties = hasImageBg
    ? { backgroundImage: `url(${event.bg_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : !hasMedia
      ? { background: 'linear-gradient(135deg, #0a0a0f 0%, #1c1c24 50%, #0a0a0f 100%)' }
      : {};

  return (
    <div className="min-h-screen" style={hasMedia ? { background: '#0a0a0f' } : bgStyle}>

      {/* ── Background video / gif ── */}
      {hasMedia && isVideo && (
        <video ref={videoRef} src={event.bg_video} autoPlay muted loop playsInline preload="auto"
          disablePictureInPicture disableRemotePlayback
          onCanPlay={playVideo} onLoadedData={playVideo} onEnded={playVideo}
          style={{ pointerEvents: 'none' }}
          className="fixed inset-0 w-full h-full object-cover z-0" />
      )}
      {hasMedia && isGif && (
        <img src={event.bg_video} alt="" className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none" />
      )}

      {/* ── Cinematic gradient overlay: dark top + dark bottom, open centre ── */}
      {hasBg && (
        <div className="fixed inset-0 z-[1] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 38%, rgba(0,0,0,0.1) 62%, rgba(0,0,0,0.85) 100%)' }} />
      )}

      {/* ── Page content ── */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Nav */}
        <nav className="flex justify-between items-center px-6 pt-8 pb-4">
          <button onClick={onNavigateHome}
            className="text-white/70 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1">
            ← Aimal.fi
          </button>
          <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Event</span>
        </nav>

        {/* ── HERO ── full-screen, centred on the video ── */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 min-h-[80vh]">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md bg-white/10 text-white/80 text-[10px] tracking-[0.3em] uppercase font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Live Event
          </div>

          {/* Floating metadata badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {event.date && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/15 text-white/85 text-xs font-medium">
                <Calendar size={11} className="text-amber-400" /> {event.date}
              </span>
            )}
            {event.time && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/15 text-white/85 text-xs font-medium">
                <Clock size={11} className="text-amber-400" /> {event.time}
              </span>
            )}
            {event.venue && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/15 text-white/85 text-xs font-medium">
                <MapPin size={11} className="text-amber-400" /> {event.venue}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif font-bold text-white leading-none mb-6"
            style={{ fontSize: 'clamp(3rem, 10vw, 7rem)', textShadow: '0 2px 40px rgba(0,0,0,0.5)' }}>
            {event.title}
          </h1>

          {/* Description */}
          {event.description && (
            <p className="text-white/75 text-base md:text-lg leading-relaxed max-w-xl mb-10"
              style={{ textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}>
              {event.description}
            </p>
          )}

          {/* Countdown */}
          {event.date && countdown.valid && !countdown.expired && (
            <div className="mb-10">
              <p className="text-white/40 text-[10px] uppercase tracking-[0.25em] font-bold mb-4">Event starts in</p>
              <div className="flex items-start gap-3 md:gap-5">
                <CountdownUnit value={countdown.days} label="Days" />
                <span className="text-white/30 text-2xl font-bold mt-3">:</span>
                <CountdownUnit value={countdown.hours} label="Hours" />
                <span className="text-white/30 text-2xl font-bold mt-3">:</span>
                <CountdownUnit value={countdown.minutes} label="Min" />
                <span className="text-white/30 text-2xl font-bold mt-3">:</span>
                <CountdownUnit value={countdown.seconds} label="Sec" />
              </div>
            </div>
          )}

          {/* CTA */}
          {event.packages.length > 0 && (
            <button
              onClick={() => ticketRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold uppercase tracking-[0.15em] text-sm rounded-full transition-all shadow-xl shadow-amber-500/30 hover:shadow-amber-400/40 hover:scale-105">
              <Ticket size={16} /> Get Tickets
            </button>
          )}
        </section>

        {/* ── TICKET SECTION ── */}
        {event.packages.length > 0 && (
          <section ref={ticketRef} className="px-4 pb-16">
            <div className="max-w-4xl mx-auto">

              {/* Section header */}
              <div className="text-center mb-8">
                <h2 className="text-white font-serif text-3xl md:text-4xl mb-2">Choose Your Ticket</h2>
                <p className="text-white/40 text-sm">Select a package to continue</p>
              </div>

              {/* Package cards — frosted glass */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {event.packages.map((pkg, idx) => {
                  const isSelected = selectedPkg?.id === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      data-testid={`button-package-${pkg.id}`}
                      onClick={() => setSelectedPkg(pkg)}
                      className={`relative rounded-2xl p-6 text-left transition-all duration-200 border ${
                        isSelected
                          ? 'border-amber-400/70 bg-amber-500/10 shadow-[0_0_30px_rgba(251,191,36,0.18)] backdrop-blur-md scale-[1.02]'
                          : 'border-white/10 bg-white/[0.06] backdrop-blur-md hover:bg-white/10 hover:border-white/25 hover:scale-[1.01]'
                      }`}>
                      {/* Tier label */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">
                          Tier {idx + 1}
                        </span>
                        <div className={`w-4 h-4 rounded-full border-2 transition-all ${isSelected ? 'bg-amber-400 border-amber-400' : 'border-white/25'}`} />
                      </div>

                      <p className="font-bold text-white text-lg mb-1">{pkg.name}</p>
                      {pkg.description && <p className="text-white/55 text-sm leading-snug mb-4">{pkg.description}</p>}

                      <div className="mt-auto">
                        <p className="text-amber-400 font-serif text-4xl font-bold">€{parseFloat(pkg.price).toFixed(2)}</p>
                        <p className="text-white/35 text-xs mt-1">per ticket</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Buy bar — frosted glass */}
              {selectedPkg && (
                <div className="rounded-2xl backdrop-blur-md bg-white/[0.07] border border-white/12 p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-1">Selected</p>
                      <p className="text-white font-semibold">{selectedPkg.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-1">Total</p>
                      <p className="text-amber-400 font-serif text-4xl font-bold">€{total.toFixed(2)}</p>
                    </div>
                  </div>

                  <button
                    data-testid="button-buy-tickets"
                    onClick={() => {
                      if (selectedPkg?.payment_link) {
                        window.open(selectedPkg.payment_link, '_blank', 'noopener,noreferrer');
                      } else {
                        setModalOpen(true);
                      }
                    }}
                    className="w-full py-4 bg-amber-500 text-stone-900 font-bold uppercase tracking-[0.15em] text-sm rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-400/35 flex items-center justify-center gap-2">
                    <Ticket size={16} />
                    Buy 1 Ticket — €{total.toFixed(2)}
                    {selectedPkg?.payment_link && <span className="ml-1 text-[10px] opacity-60">↗</span>}
                  </button>

                  {!selectedPkg?.payment_link && (
                    <p className="text-white/25 text-xs text-center mt-3 flex items-center justify-center gap-1">
                      <Music size={11} /> Each ticket includes a unique QR code for entry
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {event.packages.length === 0 && (
          <div className="text-center text-white/40 py-12 px-4">
            <Ticket size={32} className="mx-auto mb-3 opacity-30" />
            <p>Tickets not yet available. Check back soon.</p>
          </div>
        )}

        {/* Photo gallery */}
        {event.images && event.images.length > 0 && (
          <section className="px-4 pb-16">
            <div className="max-w-4xl mx-auto">
              <ImageGallery images={event.images} />
            </div>
          </section>
        )}

        {/* Footer strip */}
        <div className="text-center pb-8">
          <button onClick={onNavigateHome} className="text-white/30 hover:text-white/60 text-xs uppercase tracking-widest font-bold transition-colors">
            ← Back to Aimal.fi
          </button>
        </div>
      </div>

      {modalOpen && selectedPkg && (
        <CheckoutModal event={event} selectedPackage={selectedPkg} quantity={quantity} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
};

export default EventPage;
