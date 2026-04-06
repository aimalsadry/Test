import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Upload, RotateCcw, PenLine } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface FormField {
  id: number;
  field_type: string;
  field_label: string;
  field_placeholder: string;
  is_required: boolean;
  sort_order: number;
}

interface CustomPageData {
  id: number;
  title: string;
  slug: string;
  hero_label: string;
  hero_title: string;
  hero_subtitle: string;
  left_panel_title: string;
  left_panel_desc: string;
  right_panel_title: string;
  right_panel_desc: string;
  is_published: boolean;
  fields: FormField[];
  main_image: string | null;
}

const PhotoUpload: React.FC<{
  fieldId: number;
  placeholder: string;
  value: { name: string; data: string } | null;
  onChange: (val: { name: string; data: string } | null) => void;
}> = ({ placeholder, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRemove = () => {
    onChange(null);
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
            reader.onload = ev => {
              onChange({ name: file.name, data: ev.target?.result as string || '' });
            };
            reader.readAsDataURL(file);
          }}
        />
        {value ? (
          <img src={value.data} alt="Preview" className="max-h-40 max-w-full rounded object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-stone-400">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <span className="text-xs">{placeholder || 'Click to upload photo'}</span>
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

const SignaturePad: React.FC<{
  value: { name: string; data: string } | null;
  onChange: (val: { name: string; data: string } | null) => void;
}> = ({ value, onChange }) => {
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
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setConfirmed(false);
    onChange(null);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onChange({ name: 'signature.png', data: canvas.toDataURL('image/png') });
    setConfirmed(true);
  };

  if (confirmed && value) {
    return (
      <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2 bg-green-50 border-b border-green-100">
          <div className="flex items-center gap-2 text-green-700 text-xs font-bold uppercase tracking-widest">
            <CheckCircle2 size={13} /> Signature confirmed
          </div>
          <button type="button" onClick={() => setConfirmed(false)}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors">
            <PenLine size={12} /> Edit
          </button>
        </div>
        <div className="p-3 flex justify-center">
          <img src={value.data} alt="Signature" className="max-h-24 max-w-full" style={{ background: 'white' }} />
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

const FILE_LIKE_TYPES = ['file', 'photo', 'signature'];

const CustomPageForm: React.FC<{ page: CustomPageData }> = ({ page }) => {
  const [values, setValues] = useState<Record<number, string>>({});
  const [fileMap, setFileMap] = useState<Record<number, { name: string; data: string } | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleFileChange = (fieldId: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileMap(prev => ({ ...prev, [fieldId]: { name: file.name, data: e.target?.result as string } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData: Record<string, string> = {};
    const filesToSubmit: { field_label: string; file_name: string; file_data: string }[] = [];

    for (const field of page.fields) {
      if (FILE_LIKE_TYPES.includes(field.field_type)) {
        const f = fileMap[field.id];
        if (f) {
          filesToSubmit.push({ field_label: field.field_label, file_name: f.name, file_data: f.data });
        } else if (field.is_required) {
          setError(`"${field.field_label}" is required.`);
          setSubmitting(false);
          return;
        }
      } else {
        const val = values[field.id] || '';
        if (field.is_required && !val.trim()) {
          setError(`"${field.field_label}" is required.`);
          setSubmitting(false);
          return;
        }
        formData[field.field_label] = val;
      }
    }

    try {
      const res = await fetch(`/api/pages/${page.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_data: formData, files: filesToSubmit }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="py-12 text-center animate-fade-in">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="font-serif text-3xl text-stone-900 mb-4">Thank you!</h2>
        <p className="text-stone-600">Your submission has been received. We will be in touch soon.</p>
      </div>
    );
  }

  if (page.fields.length === 0) {
    return (
      <div className="py-12 text-center text-stone-400">
        <p className="text-sm">No form fields configured.</p>
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
        {page.fields.map(field => (
          <div key={field.id} className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">
              {field.field_label}{field.is_required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {field.field_type === 'signature' ? (
              <SignaturePad
                value={fileMap[field.id] || null}
                onChange={val => setFileMap(prev => ({ ...prev, [field.id]: val }))}
              />
            ) : field.field_type === 'photo' ? (
              <PhotoUpload
                fieldId={field.id}
                placeholder={field.field_placeholder}
                value={fileMap[field.id] || null}
                onChange={val => setFileMap(prev => ({ ...prev, [field.id]: val }))}
              />
            ) : field.field_type === 'textarea' ? (
              <textarea
                rows={4}
                required={field.is_required}
                placeholder={field.field_placeholder}
                value={values[field.id] || ''}
                onChange={e => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold transition-colors text-stone-800 resize-none"
              />
            ) : field.field_type === 'file' ? (
              <div>
                <input
                  type="file"
                  ref={el => { fileRefs.current[field.id] = el; }}
                  required={field.is_required}
                  className="hidden"
                  onChange={e => handleFileChange(field.id, e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => fileRefs.current[field.id]?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg hover:border-nobel-gold transition-colors text-left"
                >
                  <Upload size={16} className="text-stone-400 shrink-0" />
                  <span className={`text-sm ${fileMap[field.id] ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>
                    {fileMap[field.id] ? fileMap[field.id]!.name : field.field_placeholder || 'Click to upload file'}
                  </span>
                </button>
              </div>
            ) : (
              <input
                type={field.field_type}
                required={field.is_required}
                placeholder={field.field_placeholder}
                value={values[field.id] || ''}
                onChange={e => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold transition-colors text-stone-800"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-4 mt-4 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-[0.2em] text-xs transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2 ${submitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-stone-800'}`}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </>
  );
};

const CustomPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { language } = useLanguage();
  const [page, setPage] = useState<CustomPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    document.title = 'Loading... | Aimal.fi Advisory';
    (async () => {
      try {
        const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
        const params = new URLSearchParams({ lang: language });
        if (isPreview) params.set('preview', 'true');
        const url = `/api/pages/public/${slug}?${params}`;
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPage(data);
          document.title = `${data.hero_title || data.title} | Aimal.fi Advisory`;
        } else {
          setNotFound(true);
          document.title = 'Page Not Found | Aimal.fi Advisory';
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [slug, language]);

  if (loading) {
    return (
      <main className="pt-32 pb-24 min-h-screen flex items-center justify-center">
        <div className="text-stone-400">Loading...</div>
      </main>
    );
  }

  if (notFound || !page) {
    return (
      <main className="pt-32 pb-24 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-6xl text-stone-900 mb-4">404</h1>
          <p className="text-stone-500 mb-8">This page could not be found.</p>
          <a href="/" className="px-6 py-3 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors">
            Go Home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-24 animate-fade-in min-h-screen">
      <div className="container mx-auto px-6 max-w-5xl">
        {(page.hero_label || page.hero_title || page.hero_subtitle) && (
          <div className="text-center mb-20">
            {page.hero_label && (
              <div className="inline-block mb-4 px-3 py-1 border border-nobel-gold text-nobel-gold text-[10px] tracking-[0.2em] uppercase font-bold rounded-full">
                {page.hero_label}
              </div>
            )}
            {page.hero_title && (
              <h1 className="font-serif text-6xl md:text-8xl text-stone-900 mb-6 animate-fade-in-up">
                {page.hero_title}
              </h1>
            )}
            {page.hero_subtitle && (
              <p className="text-xl text-stone-600 leading-relaxed font-light max-w-2xl mx-auto animate-fade-in-up">
                {page.hero_subtitle}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-8 md:p-10 border-b border-stone-100 bg-stone-50">
              {page.left_panel_title && (
                <h2 className="font-serif text-3xl text-stone-900 mb-4">{page.left_panel_title}</h2>
              )}
              {page.left_panel_desc && (
                <p className="text-stone-600 leading-relaxed text-sm whitespace-pre-line">{page.left_panel_desc}</p>
              )}
            </div>
            {page.main_image && (
              <div className="flex-1">
                <img src={page.main_image} alt={page.left_panel_title || page.title} className="w-full h-full object-cover max-h-80" />
              </div>
            )}
            {!page.main_image && !page.left_panel_title && !page.left_panel_desc && (
              <div className="flex-1 p-8 md:p-10 flex items-center justify-center text-stone-300">
                <p className="text-sm">Content coming soon</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-8 md:p-10 border-b border-stone-100 bg-stone-900">
              {page.right_panel_title && (
                <h2 className="font-serif text-3xl text-white mb-4">{page.right_panel_title}</h2>
              )}
              {page.right_panel_desc && (
                <p className="text-stone-400 leading-relaxed text-sm whitespace-pre-line">{page.right_panel_desc}</p>
              )}
            </div>
            <div className="p-8 md:p-10 flex-1">
              <CustomPageForm page={page} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CustomPage;
