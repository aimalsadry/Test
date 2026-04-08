import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { translations, languages, Language } from './translations';
import { Globe } from 'lucide-react';

const STORAGE_KEY = 'aimal_language';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

const LanguagePicker: React.FC<{ onSelect: (lang: Language) => void }> = ({ onSelect }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = (code: Language) => {
    setVisible(false);
    setTimeout(() => onSelect(code), 250);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(4px)',
        transition: 'opacity 0.25s ease',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '1.25rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
          width: '100%',
          maxWidth: '460px',
          border: '1px solid #e7e5e4',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid #f5f5f4', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Globe size={18} color="#b99755" />
          <div>
            <p style={{ fontFamily: 'serif', fontSize: '1.1rem', fontWeight: 700, color: '#1c1917', lineHeight: 1.2, margin: 0 }}>
              Choose your language
            </p>
            <p style={{ fontSize: '0.7rem', color: '#a8a29e', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>
              Valitse kieli &nbsp;·&nbsp; Выберите язык &nbsp;·&nbsp; اختر لغتك
            </p>
          </div>
        </div>

        {/* Language grid */}
        <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', maxHeight: '360px', overflowY: 'auto' }}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.625rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
                width: '100%',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '1.375rem', lineHeight: 1, flexShrink: 0 }}>{lang.flag}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#292524', letterSpacing: '0.01em' }}>{lang.name}</span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #f5f5f4', background: '#fafaf9' }}>
          <p style={{ fontSize: '0.65rem', color: '#c4bfba', textAlign: 'center', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Your preference will be saved for future visits
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && translations[saved]) return saved;
    } catch {}
    return 'en';
  });

  const [showPicker, setShowPicker] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {}
    return false;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, []);

  const handlePickerSelect = useCallback((lang: Language) => {
    setLanguage(lang);
    setShowPicker(false);
  }, [setLanguage]);

  const t = useCallback((key: string) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
      {showPicker && <LanguagePicker onSelect={handlePickerSelect} />}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export { languages };
export type { Language };
export { STORAGE_KEY };
