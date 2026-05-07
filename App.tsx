/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { HeroScene, QuantumComputerScene } from './components/QuantumScene';
import { WorkflowDiagram, EfficiencyDiagram } from './components/Diagrams';
import BookingForm from './components/BookingForm';
import { ArrowDown, Menu, X, CheckCircle2, User, Briefcase, Globe, ClipboardList, Zap, Layers, AlertCircle, MapPin, Clock } from 'lucide-react';
import { useLanguage, languages } from './LanguageContext';

const AdminPanel = lazy(() => import('./components/AdminPanel'));
const ProductPageComponent = lazy(() => import('./components/ProductPage'));
const ReceiptPageComponent = lazy(() => import('./components/ReceiptPage'));
const ProductsListPage = lazy(() => import('./components/ProductsListPage'));
const CustomPageComponent = lazy(() => import('./components/CustomPage'));
const AstandPage = lazy(() => import('./components/AstandPage'));
const EventPageComponent = lazy(() => import('./components/EventPage'));
const EventReceiptPageComponent = lazy(() => import('./components/EventReceiptPage'));
const TicketVerifyPageComponent = lazy(() => import('./components/TicketVerifyPage'));
const DoorPageComponent = lazy(() => import('./components/DoorPage'));
const BarRequestPageComponent = lazy(() => import('./components/BarRequestPage'));
const BarHostPageComponent = lazy(() => import('./components/BarHostPage'));

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';
const GOOGLE_INVESTMENT_SCRIPT_URL = import.meta.env.VITE_GOOGLE_INVESTMENT_SCRIPT_URL || '';

const AnalogClock = ({ city, timezone }: { city: string; timezone: string }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const [h, m] = timeStr.split(':').map(Number);
      setHours(h);
      setMinutes(m);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [timezone]);

  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;
  const r = 40;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="90" height="90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="#292524" stroke="#78716c" strokeWidth="1.5" />
        {[0, 3, 6, 9].map((h) => {
          const angle = (h * 30 - 90) * (Math.PI / 180);
          const x1 = 50 + Math.cos(angle) * (r - 6);
          const y1 = 50 + Math.sin(angle) * (r - 6);
          const x2 = 50 + Math.cos(angle) * (r - 2);
          const y2 = 50 + Math.sin(angle) * (r - 2);
          return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a8a29e" strokeWidth="1.5" />;
        })}
        <line
          x1="50" y1="50"
          x2={50 + Math.cos((hourAngle - 90) * (Math.PI / 180)) * 22}
          y2={50 + Math.sin((hourAngle - 90) * (Math.PI / 180)) * 22}
          stroke="#d6d3d1" strokeWidth="2.5" strokeLinecap="round"
        />
        <line
          x1="50" y1="50"
          x2={50 + Math.cos((minuteAngle - 90) * (Math.PI / 180)) * 30}
          y2={50 + Math.sin((minuteAngle - 90) * (Math.PI / 180)) * 30}
          stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round"
        />
        <circle cx="50" cy="50" r="2" fill="#b99755" />
      </svg>
      <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400">{city}</span>
    </div>
  );
};

const AuthorCard = ({ name, role, delay }: { name: string, role: string, delay: string }) => {
  return (
    <div className="flex flex-col group animate-fade-in-up items-center p-8 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 w-full max-w-xs hover:border-nobel-gold/50" style={{ animationDelay: delay }}>
      <h3 className="font-serif text-2xl text-stone-900 text-center mb-3">{name}</h3>
      <div className="w-12 h-0.5 bg-nobel-gold mb-4 opacity-60"></div>
      <p className="text-xs text-stone-500 font-bold uppercase tracking-widest text-center leading-relaxed">{role}</p>
    </div>
  );
};

const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = languages.find(l => l.code === language);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-stone-600 hover:text-nobel-gold transition-colors border border-stone-200 rounded-full bg-white/80 backdrop-blur-sm"
      >
        <span>{current?.flag}</span>
        <span>{language.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden z-[200] animate-fade-in max-h-80 overflow-y-auto">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-stone-50 transition-colors text-left ${language === lang.code ? 'bg-stone-50 text-nobel-gold font-bold' : 'text-stone-700'}`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StockTicker = () => {
  const [data, setData] = useState<{ symbol: string; price: number | null; change: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/market-data');
      const json = await res.json();
      setData(json);
    } catch {
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <section className="py-6 bg-stone-900 border-t border-stone-800">
        <div className="container mx-auto px-6 text-center text-stone-400 text-sm">Loading...</div>
      </section>
    );
  }

  return (
    <section className="py-6 bg-stone-900 border-t border-stone-800 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex gap-6 overflow-x-auto scrollbar-hide justify-center flex-wrap">
          {data.map((item) => (
            <div key={item.symbol} className="flex items-center gap-3 px-4 py-2 bg-stone-800/50 rounded-lg border border-stone-700/50 min-w-fit">
              <span className="text-xs font-bold tracking-wider uppercase text-white">{item.symbol}</span>
              {item.price !== null ? (
                <>
                  <span className="text-sm text-stone-300 font-medium">
                    {item.symbol === 'BTC' || item.symbol === 'ETH' || item.symbol === 'S&P 500'
                      ? `$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `$${item.price.toFixed(2)}`}
                  </span>
                  <span className={`text-xs font-bold ${item.change !== null && item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.change !== null ? `${item.change >= 0 ? '+' : ''}${item.change}%` : '—'}
                  </span>
                </>
              ) : (
                <span className="text-xs text-stone-500">N/A</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


const InvestmentForm = ({ role }: { role: 'Investor' | 'Entrepreneur' }) => {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      y_tunnus: formData.get('y_tunnus') as string,
      role: role,
      message: formData.get('message') as string,
    };

    if (!GOOGLE_INVESTMENT_SCRIPT_URL) {
      setError(t('invest_not_configured'));
      setLoading(false);
      return;
    }

    try {
      const [googleResult] = await Promise.allSettled([
        fetch(GOOGLE_INVESTMENT_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
        fetch('/api/investment/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).catch(() => {}),
      ]);

      if (googleResult.status === 'rejected') {
        throw new Error(googleResult.reason?.message || t('form_send_error'));
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting investment form:', err);
      setError(err.message || t('form_send_error'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-12 text-center animate-fade-in">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="font-serif text-3xl text-stone-900 mb-4">{t('invest_submitted_title')}</h2>
        <p className="text-stone-600">{t('invest_submitted_msg')}</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 text-sm animate-fade-in">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">{t('contact_first_name')}</label>
            <input required name="first_name" type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold transition-colors text-stone-800" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">{t('contact_last_name')}</label>
            <input required name="last_name" type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold transition-colors text-stone-800" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">{t('contact_phone')}</label>
          <input required name="phone" type="tel" pattern="[+0-9\s]+" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold transition-colors text-stone-800" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">{t('contact_email')}</label>
          <input required name="email" type="email" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold transition-colors text-stone-800" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">{t('contact_ytunnus')}</label>
          <input name="y_tunnus" type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold transition-colors text-stone-800" />
        </div>

        {role === 'Entrepreneur' && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">{t('invest_form_idea')}</label>
            <textarea required name="message" rows={4} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold transition-colors text-stone-800 resize-none" />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 mt-4 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-[0.2em] text-xs transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-stone-800'}`}
        >
          {loading ? t('invest_form_sending') : t('invest_form_submit')}
        </button>
      </form>
    </>
  );
};

const InvestmentPage = () => {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<'investor' | 'entrepreneur' | null>(null);

  return (
    <main className="pt-32 pb-24 animate-fade-in min-h-screen">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-20">
          <div className="inline-block mb-4 px-3 py-1 border border-nobel-gold text-nobel-gold text-[10px] tracking-[0.2em] uppercase font-bold rounded-full">
            {t('invest_label')}
          </div>
          <h1 className="font-serif text-6xl md:text-8xl text-stone-900 mb-6 animate-fade-in-up">{t('invest_title')}</h1>
          <p className="text-xl text-stone-600 leading-relaxed font-light max-w-2xl mx-auto animate-fade-in-up">
            {t('invest_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-8 md:p-10 border-b border-stone-100 bg-stone-50">
              <h2 className="font-serif text-3xl text-stone-900 mb-4">{t('invest_for_investors')}</h2>
              <p className="text-stone-600 leading-relaxed text-sm">
                {t('invest_investors_desc')}
              </p>
            </div>
            <div className="p-8 md:p-10 flex-1">
              {activeSection === 'investor' ? (
                <InvestmentForm role="Investor" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-nobel-gold mb-6">
                    <Briefcase size={28} />
                  </div>
                  <p className="text-stone-500 text-sm text-center mb-8">{t('invest_investors_cta_text')}</p>
                  <button
                    onClick={() => setActiveSection('investor')}
                    className="px-8 py-4 bg-stone-900 text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-stone-800 transition-all shadow-md active:scale-95"
                  >
                    {t('invest_investors_btn')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-8 md:p-10 border-b border-stone-100 bg-stone-900">
              <h2 className="font-serif text-3xl text-white mb-4">{t('invest_for_entrepreneurs')}</h2>
              <p className="text-stone-400 leading-relaxed text-sm">
                {t('invest_entrepreneurs_desc')}
              </p>
            </div>
            <div className="p-8 md:p-10 flex-1">
              {activeSection === 'entrepreneur' ? (
                <InvestmentForm role="Entrepreneur" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-nobel-gold mb-6">
                    <Zap size={28} />
                  </div>
                  <p className="text-stone-500 text-sm text-center mb-8">{t('invest_entrepreneurs_cta_text')}</p>
                  <button
                    onClick={() => setActiveSection('entrepreneur')}
                    className="px-8 py-4 bg-stone-900 text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-stone-800 transition-all shadow-md active:scale-95"
                  >
                    {t('invest_entrepreneurs_btn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

type View = 'home' | 'about' | 'card' | 'products' | 'investment' | 'admin' | 'product-page' | 'receipt' | 'custom-page' | 'astand' | 'event-page' | 'event-receipt' | 'ticket-verify' | 'door' | 'bar-request' | 'bar-host';

const STATIC_PATHS = ['/', '/card', '/products', '/about', '/investment', '/admin', '/more', '/astand', '/event', '/event-receipt', '/ticket', '/door'];

function getInitialView(): { view: View; slug: string } {
  const path = window.location.pathname;
  if (path === '/card') return { view: 'card', slug: '' };
  if (path === '/products') return { view: 'products', slug: '' };
  if (path === '/about') return { view: 'about', slug: '' };
  if (path === '/investment') return { view: 'investment', slug: '' };
  if (path === '/admin') return { view: 'admin', slug: '' };
  if (path === '/astand') return { view: 'astand', slug: '' };
  if (path.startsWith('/receipt/')) return { view: 'receipt', slug: path.replace('/receipt/', '') };
  if (path.startsWith('/more/')) return { view: 'custom-page', slug: path.replace('/more/', '') };
  if (path.startsWith('/event/')) {
    const eventPath = path.replace('/event/', '');
    if (eventPath.endsWith('/host')) return { view: 'bar-host', slug: eventPath.replace(/\/host$/, '') };
    if (eventPath.endsWith('/request')) return { view: 'bar-request', slug: eventPath.replace(/\/request$/, '') };
    return { view: 'event-page', slug: eventPath };
  }
  if (path.startsWith('/event-receipt/')) return { view: 'event-receipt', slug: path.replace('/event-receipt/', '') };
  if (path.startsWith('/ticket/')) return { view: 'ticket-verify', slug: path.replace('/ticket/', '') };
  if (path === '/door') return { view: 'door', slug: '' };
  if (path !== '/') return { view: 'product-page', slug: path.replace(/^\//, '') };
  return { view: 'home', slug: '' };
}

const App: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSource, setBookingSource] = useState('header');
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const initial = getInitialView();
  const [view, setView] = useState<View>(initial.view);
  const [productSlug, setProductSlug] = useState<string>(initial.slug);
  const [headerProducts, setHeaderProducts] = useState<{ id: number; title: string; slug: string }[]>([]);
  const [headerCustomPages, setHeaderCustomPages] = useState<{ id: number; title: string; slug: string }[]>([]);
  const [headerEvents, setHeaderEvents] = useState<{ id: number; title: string; slug: string }[]>([]);
  const [imageError, setImageError] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/products/header')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHeaderProducts(data); })
      .catch(() => {});
    fetch('/api/pages/header')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHeaderCustomPages(data); })
      .catch(() => {});
    fetch('/api/events/header')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHeaderEvents(data); })
      .catch(() => {});
    fetch('/api/settings/profile-image')
      .then(r => r.json())
      .then(data => { if (data.image) setProfileImage(data.image); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 500);
    const removeTimer = setTimeout(() => setShowSplash(false), 1000);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/card') { setView('card'); setProductSlug(''); }
      else if (path === '/products') { setView('products'); setProductSlug(''); }
      else if (path === '/about') { setView('about'); setProductSlug(''); }
      else if (path === '/investment') { setView('investment'); setProductSlug(''); }
      else if (path === '/admin') { setView('admin'); setProductSlug(''); }
      else if (path === '/astand') { setView('astand'); setProductSlug(''); }
      else if (path.startsWith('/receipt/')) { setView('receipt'); setProductSlug(path.replace('/receipt/', '')); }
      else if (path.startsWith('/more/')) { setView('custom-page'); setProductSlug(path.replace('/more/', '')); }
      else if (path.startsWith('/event/')) {
        const eventPath = path.replace('/event/', '');
        if (eventPath.endsWith('/host')) { setView('bar-host'); setProductSlug(eventPath.replace(/\/host$/, '')); }
        else if (eventPath.endsWith('/request')) { setView('bar-request'); setProductSlug(eventPath.replace(/\/request$/, '')); }
        else { setView('event-page'); setProductSlug(eventPath); }
      }
      else if (path.startsWith('/event-receipt/')) { setView('event-receipt'); setProductSlug(path.replace('/event-receipt/', '')); }
      else if (path.startsWith('/ticket/')) { setView('ticket-verify'); setProductSlug(path.replace('/ticket/', '')); }
      else if (path === '/door') { setView('door'); setProductSlug(''); }
      else if (path !== '/') { setView('product-page'); setProductSlug(path.replace(/^\//, '')); }
      else { setView('home'); setProductSlug(''); }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (v: View, slug?: string) => (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setView(v);
    if (slug) setProductSlug(slug);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let path = v === 'home' ? '/' : `/${v}`;
    if (v === 'product-page' && slug) path = `/${slug}`;
    if (v === 'receipt' && slug) path = `/receipt/${slug}`;
    if (v === 'custom-page' && slug) path = `/more/${slug}`;
    if (v === 'event-page' && slug) path = `/event/${slug}`;
    window.history.pushState({}, '', path);
  };

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    
    if (view !== 'home') {
      setView('home');
      window.history.pushState({}, '', '/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          const headerOffset = 100;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      }, 100);
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  if (view === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-stone-900 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
        <AdminPanel />
      </Suspense>
    );
  }

  if (view === 'door') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="text-stone-400">Loading...</div></div>}>
        <DoorPageComponent />
      </Suspense>
    );
  }

  if (view === 'bar-request') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F9F8F4] flex items-center justify-center"><div className="text-stone-500">Loading...</div></div>}>
        <BarRequestPageComponent slug={productSlug} />
      </Suspense>
    );
  }

  if (view === 'bar-host') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="text-stone-400">Loading...</div></div>}>
        <BarHostPageComponent slug={productSlug} />
      </Suspense>
    );
  }

  if (view === 'receipt') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
        <ReceiptPageComponent purchaseId={productSlug} onNavigateHome={navigateTo('home')} />
      </Suspense>
    );
  }



  const openBooking = (source: string) => {
    setBookingSource(source);
    setBookingOpen(true);
  };

  // --- BUSINESS CARD VIEW (/card) ---
  if (view === 'card') {
    return (
      <div className="min-h-screen bg-[#F9F8F4] flex flex-col items-center justify-center p-6 selection:bg-nobel-gold selection:text-white">
        <BookingForm isOpen={bookingOpen} onClose={() => setBookingOpen(false)} sourcePage={bookingSource} />
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden max-w-sm w-full border border-stone-200 animate-fade-in-up">
          {/* Profile Image */}
          <div className="aspect-[4/5] bg-stone-100 relative overflow-hidden group">
            {!imageError ? (
              <img 
                src={profileImage || '/images/profile-photo.png'} 
                alt="AimalSadry.fi"
                className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300">
                 <User size={80} strokeWidth={1} />
              </div>
            )}
            <div className="absolute inset-0 border-[12px] border-white/10 pointer-events-none"></div>
          </div>
          
          {/* Text Content */}
          <div className="p-10 text-center">
            <h1 className="font-serif text-4xl text-stone-900 mb-2 font-bold">AimalSadry.fi</h1>
            <p className="text-stone-600 font-medium mb-1 text-sm tracking-wide">{t('card_tagline')}</p>
            <p className="text-stone-400 uppercase text-[10px] font-bold tracking-[0.2em] mb-10">{t('card_location')}</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => openBooking('business-card')}
                className="w-full py-4 bg-stone-900 text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-stone-800 transition-all shadow-md active:scale-95"
              >
                Book a Call
              </button>
              <button 
                onClick={navigateTo('home')}
                className="w-full py-4 border border-stone-200 text-stone-600 rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-stone-50 transition-all active:scale-95"
              >
                {t('card_website')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Navigation = () => (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#F9F8F4]/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="hidden md:flex items-center gap-6 text-[10px] font-bold tracking-[0.2em] text-stone-600 uppercase flex-wrap">
          <a href="#home" onClick={navigateTo('home')} className="hover:text-nobel-gold transition-colors cursor-pointer">{t('nav_home')}</a>
          <a href="#about" onClick={navigateTo('about')} className="hover:text-nobel-gold transition-colors cursor-pointer">{t('nav_about')}</a>
          <a href="#products" onClick={navigateTo('products')} className="hover:text-nobel-gold transition-colors cursor-pointer">{t('nav_products')}</a>
          <a href="#investment" onClick={navigateTo('investment')} className="hover:text-nobel-gold transition-colors cursor-pointer">{t('nav_investment')}</a>
          {headerProducts.map(p => (
            <a key={p.id} href={`/${p.slug}`} onClick={navigateTo('product-page', p.slug)}
              className="hover:text-nobel-gold transition-colors cursor-pointer border border-current px-2 py-1 rounded-full">
              {p.title}
            </a>
          ))}
          {headerCustomPages.map(p => (
            <a key={p.id} href={`/more/${p.slug}`} onClick={navigateTo('custom-page', p.slug)}
              className="hover:text-nobel-gold transition-colors cursor-pointer border border-current px-2 py-1 rounded-full">
              {p.title}
            </a>
          ))}
          {headerEvents.map(ev => (
            <a key={ev.id} href={`/event/${ev.slug}`} onClick={navigateTo('event-page', ev.slug)}
              className="hover:text-nobel-gold transition-colors cursor-pointer border border-current px-2 py-1 rounded-full">
              {ev.title}
            </a>
          ))}
          <button 
            onClick={() => openBooking('header')}
            className="px-5 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors shadow-sm cursor-pointer"
          >
            Book a Call
          </button>
          <LanguageSelector />
        </div>

        <button className="md:hidden text-stone-900 p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>

        <div className="flex items-center cursor-pointer" onClick={navigateTo('home')}>
          <span className={`font-serif font-bold text-lg tracking-wide transition-opacity ${scrolled ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
            AimalSadry.fi <span className="font-normal uppercase text-xs tracking-widest ml-2" style={{ color: '#b99755' }}>{t('nav_advisory')}</span>
          </span>
        </div>
      </div>
    </nav>
  );

  const MobileMenu = () => menuOpen ? (
    <div className="fixed inset-0 z-40 bg-[#F9F8F4] flex flex-col items-center justify-center gap-6 text-xs font-bold tracking-widest animate-fade-in uppercase overflow-y-auto py-8">
        <a href="#home" onClick={navigateTo('home')} className="hover:text-nobel-gold transition-colors cursor-pointer">{t('nav_home')}</a>
        <a href="#about" onClick={navigateTo('about')} className="hover:text-nobel-gold transition-colors cursor-pointer">{t('nav_about')}</a>
        <a href="#products" onClick={navigateTo('products')} className="hover:text-nobel-gold transition-colors cursor-pointer">{t('nav_products')}</a>
        <a href="#investment" onClick={navigateTo('investment')} className="hover:text-nobel-gold transition-colors cursor-pointer">{t('nav_investment')}</a>
        {headerProducts.map(p => (
          <a key={p.id} href={`/${p.slug}`} onClick={navigateTo('product-page', p.slug)}
            className="hover:text-nobel-gold transition-colors cursor-pointer border border-stone-300 px-3 py-1.5 rounded-full">
            {p.title}
          </a>
        ))}
        {headerCustomPages.map(p => (
          <a key={p.id} href={`/more/${p.slug}`} onClick={navigateTo('custom-page', p.slug)}
            className="hover:text-nobel-gold transition-colors cursor-pointer border border-stone-300 px-3 py-1.5 rounded-full">
            {p.title}
          </a>
        ))}
        {headerEvents.map(ev => (
          <a key={ev.id} href={`/event/${ev.slug}`} onClick={navigateTo('event-page', ev.slug)}
            className="hover:text-nobel-gold transition-colors cursor-pointer border border-stone-300 px-3 py-1.5 rounded-full">
            {ev.title}
          </a>
        ))}
        <button 
          onClick={() => { openBooking('mobile-menu'); setMenuOpen(false); }} 
          className="px-8 py-3 bg-stone-900 text-white rounded-full shadow-lg cursor-pointer"
        >
          Book a Call
        </button>
        <LanguageSelector />
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-[#F9F8F4] text-stone-800 selection:bg-nobel-gold selection:text-white">
      {showSplash && view !== 'astand' && view !== 'event-page' && view !== 'event-receipt' && view !== 'ticket-verify' && (
        <div
          className="fixed inset-0 z-[200] bg-stone-950 flex items-center justify-center"
          style={{ opacity: splashFading ? 0 : 1, transition: 'opacity 0.5s ease-out' }}
        >
          <img
            src="/images/profile-photo.png"
            alt="Aimal.fi"
            className="w-32 h-32 rounded-full object-cover object-top"
            style={{ animation: 'pulse 1s ease-in-out' }}
          />
        </div>
      )}
      <BookingForm isOpen={bookingOpen} onClose={() => setBookingOpen(false)} sourcePage={bookingSource} />
      
      {view !== 'astand' && view !== 'event-page' && view !== 'event-receipt' && view !== 'ticket-verify' && <Navigation />}
      {view !== 'astand' && view !== 'event-page' && view !== 'event-receipt' && view !== 'ticket-verify' && <MobileMenu />}

      {view === 'home' && (
        <main>
          <header className="relative h-screen flex items-center justify-center overflow-hidden">
            <HeroScene />
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(249,248,244,0.92)_0%,rgba(249,248,244,0.6)_50%,rgba(249,248,244,0.3)_100%)]" />
            <div className="relative z-10 container mx-auto px-6 text-center">
              <div className="inline-block mb-4 px-3 py-1 border border-nobel-gold text-nobel-gold text-[10px] tracking-[0.3em] uppercase font-bold rounded-full backdrop-blur-sm bg-white/30">
                {t('hero_location')}
              </div>
              <h1 className="font-serif text-6xl md:text-8xl lg:text-[10rem] font-medium leading-tight md:leading-[0.85] mb-8 text-stone-900 drop-shadow-sm">
                Aimal.fi
              </h1>
              <div className="italic font-normal text-2xl md:text-4xl mb-6 max-w-4xl mx-auto" style={{ color: '#b99755' }}>
                {t('hero_tagline')}
              </div>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-stone-700 font-light leading-relaxed mb-8">
                {t('hero_subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-stone-600 text-sm">
                  <MapPin size={14} className="text-nobel-gold flex-shrink-0" />
                  <span> Rahakamarinportti 3 B, 00240, Finland Helsinki</span>
                </div>
                <span className="hidden sm:block text-stone-300">|</span>
                <div className="flex items-center gap-2 text-stone-600 text-sm">
                  <Clock size={14} className="text-nobel-gold flex-shrink-0" />
                  <span>Mon–Fri 9:00–17:00</span>
                </div>
              </div>
              <div className="flex justify-center mb-10">
                <button
                  data-testid="button-reserve-meeting"
                  onClick={() => openBooking('hero')}
                  className="px-8 py-3 bg-stone-900 text-white text-sm font-bold tracking-[0.15em] uppercase rounded-full hover:bg-stone-700 transition-colors backdrop-blur-sm"
                >
                  Reserve a Meeting
                </button>
              </div>
              <div className="flex justify-center">
                 <a href="#partners" onClick={scrollToSection('partners')} className="group flex flex-col items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-stone-500 hover:text-stone-900 transition-colors cursor-pointer uppercase">
                    <span>{t('hero_discover')}</span>
                    <span className="p-2 border border-stone-300 rounded-full group-hover:border-stone-900 transition-colors bg-white/50">
                        <ArrowDown size={16} />
                    </span>
                 </a>
              </div>
            </div>
          </header>

          <section id="partners" className="py-32 bg-white">
            <div className="container mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
              <div className="md:col-span-5">
                <div className="inline-block mb-3 text-[10px] font-bold tracking-widest text-stone-500 uppercase">{t('partners_label')}</div>
                <h2 className="font-serif text-5xl mb-8 leading-tight text-stone-900">{t('partners_title')}</h2>
                <div className="w-16 h-1 bg-nobel-gold mb-8"></div>
                <p className="text-xl text-stone-600 leading-relaxed mb-8">
                  {t('partners_desc')}
                </p>
              </div>
              <div className="md:col-span-7 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { title: t('partners_item1_title'), desc: t('partners_item1_desc'), icon: <CheckCircle2 className="text-nobel-gold" /> },
                    { title: t('partners_item2_title'), desc: t('partners_item2_desc'), icon: <Zap className="text-nobel-gold" /> },
                    { title: t('partners_item3_title'), desc: t('partners_item3_desc'), icon: <User className="text-nobel-gold" /> },
                    { title: t('partners_item4_title'), desc: t('partners_item4_desc'), icon: <Globe className="text-nobel-gold" /> }
                  ].map((item, idx) => (
                    <div key={idx} className="p-8 bg-stone-50 rounded-xl border border-stone-100 hover:border-nobel-gold/30 transition-all group">
                      <div className="mb-4">{item.icon}</div>
                      <h4 className="font-serif text-xl text-stone-900 mb-2">{item.title}</h4>
                      <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <StockTicker />

          <section id="who" className="py-32 bg-[#F9F8F4] border-t border-stone-100">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold tracking-widest uppercase rounded-full mb-6 border border-stone-200">
                            {t('who_label')}
                        </div>
                        <h2 className="font-serif text-5xl md:text-6xl mb-8 text-stone-900">{t('who_title')}</h2>
                        <div className="space-y-6">
                          {[
                            { title: t('who_item1_title'), desc: t('who_item1_desc') },
                            { title: t('who_item2_title'), desc: t('who_item2_desc') },
                            { title: t('who_item3_title'), desc: t('who_item3_desc') },
                            { title: t('who_item4_title'), desc: t('who_item4_desc') },
                            { title: t('who_item5_title'), desc: t('who_item5_desc') }
                          ].map((item, idx) => (
                            <div key={idx} className="flex gap-6 group">
                              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center text-nobel-gold font-serif text-xl group-hover:bg-nobel-gold group-hover:text-white transition-all">
                                {idx + 1}
                              </div>
                              <div>
                                <h4 className="font-serif text-2xl text-stone-900 mb-1">{item.title}</h4>
                                <p className="text-stone-500">{item.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="relative p-3 border-2 border-stone-900">
                          <img 
                            src="/images/profile-photo.png" 
                            alt="Aimal.fi Advisory"
                            className="w-full max-w-md aspect-square object-cover object-top"
                          />
                        </div>
                    </div>
                </div>
            </div>
          </section>

          <section className="py-16 bg-stone-900">
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
                {[
                  { city: "NYC", tz: "America/New_York" },
                  { city: "SH", tz: "Asia/Shanghai" },
                  { city: "LDN", tz: "Europe/London" },
                  { city: "TYO", tz: "Asia/Tokyo" },
                ].map((c) => (
                  <AnalogClock key={c.city} city={c.city} timezone={c.tz} />
                ))}
              </div>
            </div>
          </section>

          <section id="outcomes" className="py-32 bg-stone-900 text-stone-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="w-96 h-96 rounded-full bg-stone-600 blur-[100px] absolute top-[-100px] left-[-100px]"></div>
                <div className="w-96 h-96 rounded-full bg-nobel-gold blur-[100px] absolute bottom-[-100px] right-[-100px]"></div>
            </div>
            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                     <div className="order-2 lg:order-1">
                        <WorkflowDiagram />
                     </div>
                     <div className="order-1 lg:order-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-800 text-nobel-gold text-[10px] font-bold tracking-widest uppercase rounded-full mb-6 border border-stone-700">
                            {t('outcomes_label')}
                        </div>
                        <h2 className="font-serif text-5xl mb-8 text-white">{t('outcomes_title')}</h2>
                        <div className="space-y-12">
                          {[
                            { 
                              type: t('outcomes_case1_type'), 
                              prob: t('outcomes_case1_prob'), 
                              sol: t('outcomes_case1_sol'), 
                              res: t('outcomes_case1_res') 
                            },
                            { 
                              type: t('outcomes_case2_type'), 
                              prob: t('outcomes_case2_prob'), 
                              sol: t('outcomes_case2_sol'), 
                              res: t('outcomes_case2_res') 
                            },
                            { 
                              type: t('outcomes_case3_type'), 
                              prob: t('outcomes_case3_prob'), 
                              sol: t('outcomes_case3_sol'), 
                              res: t('outcomes_case3_res') 
                            }
                          ].map((caseStudy, idx) => (
                            <div key={idx} className="border-l border-stone-700 pl-8 relative">
                              <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-nobel-gold shadow-[0_0_10px_rgba(197,160,89,0.5)]"></div>
                              <h4 className="font-serif text-xl text-nobel-gold mb-3">{caseStudy.type}</h4>
                              <div className="space-y-2 text-sm text-stone-400">
                                <p><strong className="text-stone-200">{t('outcomes_problem')}</strong> {caseStudy.prob}</p>
                                <p><strong className="text-stone-200">{t('outcomes_solution')}</strong> {caseStudy.sol}</p>
                                <p className="text-white font-medium italic">{t('outcomes_result')} {caseStudy.res}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                     </div>
                </div>
            </div>
          </section>

          <section id="testimonials" className="py-32 bg-[#F9F8F4]">
            <div className="container mx-auto px-6 text-center">
                <h2 className="font-serif text-5xl mb-16 text-stone-900">{t('efficiency_title')}</h2>
                <div className="max-w-4xl mx-auto">
                    <EfficiencyDiagram />
                </div>
            </div>
          </section>
        </main>
      )}

      {view === 'about' && (
        <main className="pt-32 pb-24 animate-fade-in min-h-screen">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="inline-block mb-4 px-3 py-1 border border-nobel-gold text-nobel-gold text-[10px] tracking-[0.2em] uppercase font-bold rounded-full">
              {t('about_location')}
            </div>
            <h1 className="font-serif text-6xl md:text-8xl text-stone-900 mb-12 animate-fade-in-up">{t('about_title')}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-16 animate-fade-in-up delay-100">
              <div className="md:col-span-5">
                <div className="aspect-[3/4] bg-stone-200 rounded-2xl overflow-hidden shadow-2xl grayscale hover:grayscale-0 transition-all duration-700 flex items-center justify-center bg-stone-100 group relative">
                  {!imageError ? (
                    <img 
                      src={profileImage || '/images/profile-photo.png'} 
                      alt="Aimal.fi"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 text-stone-400 p-8 text-center">
                        <User size={80} strokeWidth={1} />
                        <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Aimal.fi Advisory</span>
                    </div>
                  )}
                  <div className="absolute inset-0 border-[20px] border-white/10 pointer-events-none"></div>
                </div>
              </div>
              <div className="md:col-span-7 flex flex-col justify-center">
                <div className="space-y-6 text-lg md:text-xl text-stone-600 leading-relaxed font-light">
                  <p className="text-stone-900 font-normal">
                    {t('about_p1')}
                  </p>
                  <p>
                    {t('about_p2')}
                  </p>
                  <p>
                    {t('about_p3')}
                  </p>
                  <p>
                    {t('about_p4')}
                  </p>
                </div>
                <div className="mt-16 pt-12 border-t border-stone-200">
                  <h3 className="font-serif text-2xl text-stone-900 mb-8 uppercase tracking-wide">{t('about_philosophy')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {[
                      { label: t('about_phil1'), icon: <Zap size={18} /> },
                      { label: t('about_phil2'), icon: <Layers size={18} /> },
                      { label: t('about_phil3'), icon: <ClipboardList size={18} /> },
                      { label: t('about_phil4'), icon: <Briefcase size={18} /> }
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-4 group">
                        <div className="mt-1 p-2 rounded-lg bg-stone-100 text-nobel-gold group-hover:bg-nobel-gold group-hover:text-white transition-colors">
                          {item.icon}
                        </div>
                        <span className="text-stone-700 font-serif text-lg leading-snug">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {view === 'products' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-stone-500">Loading...</div></div>}>
          <ProductsListPage
            titleText={t('products_title')}
            onNavigateToProduct={(slug) => {
              setProductSlug(slug);
              setView('product-page');
              window.history.pushState({}, '', `/${slug}`);
            }}
          />
        </Suspense>
      )}

      {view === 'product-page' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-stone-500">Loading...</div></div>}>
          <ProductPageComponent slug={productSlug} onNavigateHome={navigateTo('home')} />
        </Suspense>
      )}

      {view === 'investment' && <InvestmentPage />}

      {view === 'custom-page' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-stone-400">Loading...</div></div>}>
          <CustomPageComponent slug={productSlug} />
        </Suspense>
      )}

      {view === 'astand' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-stone-950"><div className="text-stone-400">Loading...</div></div>}>
          <AstandPage />
        </Suspense>
      )}

      {view === 'event-page' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-stone-950"><div className="text-stone-400">Loading...</div></div>}>
          <EventPageComponent slug={productSlug} onNavigateHome={() => { setView('home'); setProductSlug(''); window.history.pushState(null, '', '/'); }} />
        </Suspense>
      )}

      {view === 'event-receipt' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-stone-950"><div className="text-stone-400">Loading...</div></div>}>
          <EventReceiptPageComponent purchaseId={productSlug} onNavigateHome={() => { setView('home'); setProductSlug(''); window.history.pushState(null, '', '/'); }} />
        </Suspense>
      )}

      {view === 'ticket-verify' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-stone-950"><div className="text-stone-400">Loading...</div></div>}>
          <TicketVerifyPageComponent token={productSlug} onNavigateHome={() => { setView('home'); setProductSlug(''); window.history.pushState(null, '', '/'); }} />
        </Suspense>
      )}

      {view !== 'astand' && view !== 'event-page' && view !== 'event-receipt' && view !== 'ticket-verify' && <footer className="bg-stone-900 text-stone-400 py-24">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-12">
            <div>
                <div className="text-white font-serif font-bold text-3xl mb-4">Aimal.fi</div>
                <p className="text-sm max-w-xs mb-8">{t('footer_desc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-16 uppercase tracking-widest text-[10px] font-bold">
               <div className="flex flex-col gap-4">
                  <span className="text-stone-600 mb-2">{t('footer_sections')}</span>
                  <a href="#partners" onClick={scrollToSection('partners')} className="hover:text-nobel-gold transition-colors">{t('footer_partners')}</a>
                  <a href="#who" onClick={scrollToSection('who')} className="hover:text-nobel-gold transition-colors">{t('footer_who')}</a>
                  <a href="#outcomes" onClick={scrollToSection('outcomes')} className="hover:text-nobel-gold transition-colors">{t('footer_outcomes')}</a>
                  <button onClick={navigateTo('card')} className="text-left hover:text-nobel-gold transition-colors uppercase">{t('footer_card')}</button>
               </div>
               <div className="flex flex-col gap-4">
                  <span className="text-stone-600 mb-2">{t('footer_contact')}</span>
                  <button onClick={() => openBooking('footer')} className="text-left hover:text-nobel-gold transition-colors">Book a Call</button>
                  <span className="text-stone-500">{t('footer_location')}</span>
               </div>
            </div>
        </div>
        <div className="container mx-auto px-6 border-t border-stone-800 mt-20 pt-8 text-[10px] uppercase tracking-widest text-stone-600 text-center">
            {t('footer_rights').replace('{year}', new Date().getFullYear().toString())}
        </div>
      </footer>}
    </div>
  );
};

export default App;
<div className="ticker">
  <span>BTC ↑ 67,000</span>
  <span>ETH ↑ 3,400</span>
  <span>NVIDIA +2.4%</span>
  <span>APPLE -1.2%</span>
  <span>S&P 500 LIVE</span>
</div>
