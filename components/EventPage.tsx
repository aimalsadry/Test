import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Clock, X, AlertCircle, Music, Star, ChevronLeft, ChevronRight } from 'lucide-react';

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

const hexToRgba = (hex: string, opacity: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

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
        body: JSON.stringify({
          buyer_name: name,
          buyer_email: email,
          buyer_phone: phone,
          package_id: selectedPackage.id,
          quantity,
        }),
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
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
              <p className="text-sm text-stone-500 mt-0.5">€{parseFloat(selectedPackage.price).toFixed(2)} × {quantity} ticket{quantity > 1 ? 's' : ''}</p>
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
            <input
              data-testid="input-buyer-name"
              value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
              placeholder="Your full name" />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Email Address *</label>
            <input
              data-testid="input-buyer-email"
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
              placeholder="you@example.com" />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Phone Number *</label>
            <input
              data-testid="input-buyer-phone"
              type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
              placeholder="+358 40 000 0000" />
          </div>

          <p className="text-xs text-stone-400">Your QR code tickets will be generated after payment. One QR code per ticket purchased.</p>

          <button
            data-testid="button-pay"
            type="submit" disabled={loading}
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
    <div className="mt-12 w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-serif text-2xl">Photos</h2>
        <span className="text-white/40 text-xs">{images.length} photo{images.length !== 1 ? 's' : ''}</span>
      </div>

      {images.length === 1 ? (
        <div className="rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setCurrent(0); setLightboxOpen(true); }}>
          <img src={images[0].image_data} alt="" className="w-full max-h-96 object-cover" />
        </div>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {images.slice(0, 6).map((img, idx) => (
              <div
                key={img.id}
                className="relative rounded-xl overflow-hidden cursor-pointer group aspect-square"
                onClick={() => { setCurrent(idx); setLightboxOpen(true); }}
              >
                <img src={img.image_data} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {idx === 5 && images.length > 6 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">+{images.length - 6}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white">
            <X size={24} />
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-4 p-3 text-white/70 hover:text-white bg-white/10 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-4 p-3 text-white/70 hover:text-white bg-white/10 rounded-full">
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <img
            src={images[current].image_data}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={e => { e.stopPropagation(); setCurrent(idx); }}
                  className={`w-2 h-2 rounded-full transition-colors ${idx === current ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EventPage: React.FC<Props> = ({ slug, onNavigateHome }) => {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<EventPackage | null>(null);
  const quantity = 1;
  const [modalOpen, setModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const playVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
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
    if (event?.bg_type === 'video' && event?.bg_video) {
      const t = setTimeout(playVideo, 100);
      return () => clearTimeout(t);
    }
  }, [event, playVideo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-white text-sm">Loading event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4">
        <p className="text-white text-lg">{error || 'Event not found'}</p>
        <button onClick={onNavigateHome} className="px-6 py-3 bg-white text-stone-900 rounded-full font-bold text-sm hover:bg-stone-100">
          Back to Home
        </button>
      </div>
    );
  }

  const total = selectedPkg ? parseFloat(selectedPkg.price) * quantity : 0;

  const overlayColor = hexToRgba(event.text_bg_color || '#000000', event.text_bg_opacity ?? 0.5);

  const isVideo = event.bg_type === 'video';
  const isGif = event.bg_type === 'gif';
  const hasMedia = (isVideo || isGif) && event.bg_video;
  const hasImageBg = event.bg_type === 'image' && event.bg_image;

  const bgStyle: React.CSSProperties = hasImageBg
    ? { backgroundImage: `url(${event.bg_image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
    : !hasMedia
      ? { background: 'linear-gradient(135deg, #0a0a0f 0%, #1c1c24 50%, #0a0a0f 100%)' }
      : {};

  return (
    <div className="min-h-screen relative" style={hasMedia ? { background: '#0a0a0f' } : bgStyle}>
      {hasMedia && isVideo && (
        <video
          ref={videoRef}
          src={event.bg_video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={playVideo}
          onEnded={playVideo}
          className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
        />
      )}
      {hasMedia && isGif && (
        <img
          src={event.bg_video}
          alt=""
          className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
        />
      )}

      {(hasMedia || hasImageBg) && <div className="fixed inset-0 bg-black/40 z-[1] pointer-events-none" />}

      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="pt-8 pb-4 px-6 flex justify-between items-center">
          <button onClick={onNavigateHome} className="text-white/70 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
            ← Aimal.fi
          </button>
          <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Event</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-4xl">

            <div className="rounded-2xl overflow-hidden mb-8" style={{ backgroundColor: overlayColor }}>
              <div className="p-8 md:p-12 text-white">
                <div className="inline-block mb-4 px-3 py-1 border border-white/30 text-white/80 text-[10px] tracking-[0.25em] uppercase font-bold rounded-full backdrop-blur-sm">
                  Live Event
                </div>
                <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-6">{event.title}</h1>

                {event.description && (
                  <p className="text-white/80 text-lg leading-relaxed max-w-2xl mb-6">{event.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  {event.date && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Star size={14} className="text-amber-400" />
                      <span>{event.date}</span>
                    </div>
                  )}
                  {event.time && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Clock size={14} className="text-amber-400" />
                      <span>{event.time}</span>
                    </div>
                  )}
                  {event.venue && (
                    <div className="flex items-center gap-2 text-white/80">
                      <MapPin size={14} className="text-amber-400" />
                      <span>{event.venue}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {event.packages.length > 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-white text-center font-serif text-2xl mb-2">Choose Your Ticket</h2>
                  <p className="text-white/50 text-center text-sm mb-6">Select a package then choose how many tickets you need</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {event.packages.map(pkg => (
                      <button
                        key={pkg.id}
                        data-testid={`button-package-${pkg.id}`}
                        onClick={() => setSelectedPkg(pkg)}
                        className={`rounded-xl p-5 text-left transition-all border-2 ${selectedPkg?.id === pkg.id
                          ? 'border-amber-400 bg-white/15 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30'
                        }`}>
                        <div className={`w-3 h-3 rounded-full mb-3 border-2 flex-shrink-0 ${selectedPkg?.id === pkg.id ? 'bg-amber-400 border-amber-400' : 'border-white/30'}`} />
                        <p className="font-bold text-white text-base mb-1">{pkg.name}</p>
                        {pkg.description && <p className="text-white/60 text-sm mb-3 leading-snug">{pkg.description}</p>}
                        <p className="text-amber-400 font-serif text-3xl font-bold">€{parseFloat(pkg.price).toFixed(2)}</p>
                        <p className="text-white/40 text-xs mt-1">per ticket</p>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPkg && (
                  <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: overlayColor }}>
                    <div className="p-6 md:p-8">
                      <div className="flex items-center justify-between">
                        <p className="text-white/60 text-sm">1 Ticket</p>
                        <div className="text-right">
                          <p className="text-white/60 text-sm">Total</p>
                          <p className="text-amber-400 font-serif text-4xl font-bold">€{total.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/10">
                        <button
                          data-testid="button-buy-tickets"
                          onClick={() => {
                            if (selectedPkg?.payment_link) {
                              window.open(selectedPkg.payment_link, '_blank', 'noopener,noreferrer');
                            } else {
                              setModalOpen(true);
                            }
                          }}
                          className="w-full py-4 bg-amber-500 text-stone-900 font-bold uppercase tracking-[0.15em] text-sm rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
                          Buy 1 Ticket — €{total.toFixed(2)}
                          {selectedPkg?.payment_link && <span className="ml-2 text-[10px] opacity-60">↗ external</span>}
                        </button>
                        {!selectedPkg?.payment_link && (
                          <p className="text-white/30 text-xs text-center mt-3 flex items-center justify-center gap-1">
                            <Music size={11} /> Each ticket includes a unique QR code for entry
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {event.packages.length === 0 && (
              <div className="text-center text-white/40 py-8">
                <p>Tickets not yet available. Check back soon.</p>
              </div>
            )}

            {event.images && event.images.length > 0 && (
              <ImageGallery images={event.images} />
            )}
          </div>
        </div>
      </div>

      {modalOpen && selectedPkg && (
        <CheckoutModal
          event={event}
          selectedPackage={selectedPkg}
          quantity={quantity}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

export default EventPage;
