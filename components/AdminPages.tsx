import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Edit, Upload, Star, ChevronDown, ChevronUp, Globe, Eye, EyeOff, ExternalLink, FileText, Send, Download, X, ArrowUp, ArrowDown, Copy, ToggleLeft, ToggleRight } from 'lucide-react';

const API = '/api';

interface CustomPage {
  id: number;
  title: string;
  slug: string | null;
  hero_label: string;
  hero_title: string;
  hero_subtitle: string;
  left_panel_title: string;
  left_panel_desc: string;
  right_panel_title: string;
  right_panel_desc: string;
  is_published: boolean;
  show_in_header: boolean;
  image_count: number;
  submission_count: number;
  created_at: string;
}

interface PageImage {
  id: number;
  is_main: boolean;
  created_at: string;
}

interface FormField {
  id: number;
  field_type: string;
  field_label: string;
  field_placeholder: string;
  is_required: boolean;
  sort_order: number;
}

interface SubmissionFile {
  id: number;
  field_label: string;
  file_name: string;
}

interface Submission {
  id: number;
  form_data: Record<string, string>;
  files: SubmissionFile[];
  created_at: string;
}

async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (res.status === 401) {
    alert('Your session has expired. Please log in again.');
    window.location.href = '/admin';
    throw new Error('Session expired');
  }
  return res;
}

const FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'file', 'photo', 'signature'];
const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  email: 'Email',
  tel: 'Phone',
  textarea: 'Textarea',
  file: 'File Upload',
  photo: 'Photo',
  signature: 'Signature',
};

const PageCard: React.FC<{
  page: CustomPage;
  onRefresh: () => void;
  onSilentRefresh: () => void;
}> = ({ page, onRefresh, onSilentRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [subsExpanded, setSubsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'images' | 'fields' | 'publish'>('content');

  const [title, setTitle] = useState(page.title);
  const [heroLabel, setHeroLabel] = useState(page.hero_label || '');
  const [heroTitle, setHeroTitle] = useState(page.hero_title || '');
  const [heroSubtitle, setHeroSubtitle] = useState(page.hero_subtitle || '');
  const [leftTitle, setLeftTitle] = useState(page.left_panel_title || '');
  const [leftDesc, setLeftDesc] = useState(page.left_panel_desc || '');
  const [rightTitle, setRightTitle] = useState(page.right_panel_title || '');
  const [rightDesc, setRightDesc] = useState(page.right_panel_desc || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [slug, setSlug] = useState(page.slug || '');
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState('');

  const [images, setImages] = useState<(PageImage & { image_data?: string })[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [fields, setFields] = useState<FormField[]>([]);
  const [fieldsLoaded, setFieldsLoaded] = useState(false);
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(true);
  const [addingField, setAddingField] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subsLoaded, setSubsLoaded] = useState(false);
  const [expandedSub, setExpandedSub] = useState<number | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [previewNeedsSlug, setPreviewNeedsSlug] = useState(false);

  const loadImages = useCallback(async () => {
    if (imagesLoaded) return;
    try {
      const res = await apiCall(`${API}/pages/${page.id}/images`);
      const data = await res.json();
      if (Array.isArray(data)) setImages(data);
    } catch {}
    setImagesLoaded(true);
  }, [page.id, imagesLoaded]);

  const loadFields = useCallback(async () => {
    if (fieldsLoaded) return;
    try {
      const res = await apiCall(`${API}/pages/${page.id}/form-fields`);
      const data = await res.json();
      if (Array.isArray(data)) setFields(data);
    } catch {}
    setFieldsLoaded(true);
  }, [page.id, fieldsLoaded]);

  const loadSubmissions = useCallback(async () => {
    if (subsLoaded) return;
    try {
      const res = await apiCall(`${API}/pages/${page.id}/submissions`);
      const data = await res.json();
      if (Array.isArray(data)) setSubmissions(data);
    } catch {}
    setSubsLoaded(true);
  }, [page.id, subsLoaded]);

  useEffect(() => {
    if (expanded) {
      loadFields();
      loadImages();
    }
  }, [expanded, loadFields, loadImages]);

  useEffect(() => {
    if (subsExpanded) loadSubmissions();
  }, [subsExpanded, loadSubmissions]);

  const saveContent = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await apiCall(`${API}/pages/${page.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title, hero_label: heroLabel, hero_title: heroTitle, hero_subtitle: heroSubtitle,
          left_panel_title: leftTitle, left_panel_desc: leftDesc,
          right_panel_title: rightTitle, right_panel_desc: rightDesc,
        }),
      });
      if (res.ok) { setSaveMsg('Saved'); onSilentRefresh(); }
      else { const d = await res.json(); setSaveMsg(d.error || 'Error'); }
    } catch { setSaveMsg('Error'); }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const saveSlug = async () => {
    setSlugSaving(true);
    setSlugError('');
    try {
      const res = await apiCall(`${API}/pages/${page.id}/set-slug`, {
        method: 'PUT',
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) setSlugError(data.error || 'Error');
      else onSilentRefresh();
    } catch { setSlugError('Error'); }
    setSlugSaving(false);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        const res = await apiCall(`${API}/pages/${page.id}/images`, {
          method: 'POST',
          body: JSON.stringify({ image_data: imageData }),
        });
        if (res.ok) {
          const newImg = await res.json();
          setImages(prev => [...prev, { ...newImg, image_data: imageData }]);
          onSilentRefresh();
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploading(false); }
  };

  const setMainImage = async (imgId: number) => {
    await apiCall(`${API}/pages/${page.id}/images/${imgId}/set-main`, { method: 'PUT' });
    setImages(prev => prev.map(i => ({ ...i, is_main: i.id === imgId })));
    onSilentRefresh();
  };

  const deleteImage = async (imgId: number) => {
    await apiCall(`${API}/pages/${page.id}/images/${imgId}`, { method: 'DELETE' });
    setImages(prev => prev.filter(i => i.id !== imgId));
    onSilentRefresh();
  };

  const addField = async () => {
    if (!newFieldLabel.trim()) return;
    setAddingField(true);
    try {
      const res = await apiCall(`${API}/pages/${page.id}/form-fields`, {
        method: 'POST',
        body: JSON.stringify({
          field_type: newFieldType,
          field_label: newFieldLabel.trim(),
          field_placeholder: newFieldPlaceholder.trim(),
          is_required: newFieldRequired,
          sort_order: fields.length,
        }),
      });
      if (res.ok) {
        const f = await res.json();
        setFields(prev => [...prev, f]);
        setNewFieldLabel('');
        setNewFieldPlaceholder('');
        setNewFieldRequired(true);
        onSilentRefresh();
      }
    } catch {}
    setAddingField(false);
  };

  const deleteField = async (fieldId: number) => {
    await apiCall(`${API}/pages/${page.id}/form-fields/${fieldId}`, { method: 'DELETE' });
    setFields(prev => prev.filter(f => f.id !== fieldId));
    onSilentRefresh();
  };

  const moveField = async (idx: number, dir: 'up' | 'down') => {
    const newFields = [...fields];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newFields.length) return;
    [newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]];
    const updated = newFields.map((f, i) => ({ ...f, sort_order: i }));
    setFields(updated);
    await Promise.all(updated.map((f, i) =>
      apiCall(`${API}/pages/${page.id}/form-fields/${f.id}`, {
        method: 'PUT',
        body: JSON.stringify({ sort_order: i }),
      })
    ));
    onSilentRefresh();
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const res = await apiCall(`${API}/pages/${page.id}/publish`, { method: 'PUT' });
      if (!res.ok) { const d = await res.json(); alert(d.error); }
      else onSilentRefresh();
    } catch {}
    setPublishing(false);
  };

  const toggleHeader = async () => {
    if (!page.slug || !page.is_published) {
      alert('The page must be published with a URL slug before it can be added to the header.');
      return;
    }
    try {
      await apiCall(`${API}/pages/${page.id}/header`, {
        method: 'PATCH',
        body: JSON.stringify({ show_in_header: !page.show_in_header }),
      });
      onSilentRefresh();
    } catch {}
  };

  const deletePage = async () => {
    if (!window.confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    await apiCall(`${API}/pages/${page.id}`, { method: 'DELETE' });
    onRefresh();
  };

  const duplicatePage = async () => {
    setDuplicating(true);
    try {
      const res = await apiCall(`${API}/pages/${page.id}/duplicate`, { method: 'POST' });
      if (res.ok) onRefresh();
      else { const d = await res.json(); alert(d.error || 'Failed to duplicate'); }
    } catch { alert('Failed to duplicate page'); }
    setDuplicating(false);
  };

  const previewPage = () => {
    if (!page.slug) {
      setPreviewNeedsSlug(true);
      setTimeout(() => setPreviewNeedsSlug(false), 3000);
      return;
    }
    window.open(`/more/${page.slug}?preview=true`, '_blank', 'noopener,noreferrer');
  };

  const tabs = [
    { id: 'content', label: 'Content' },
    { id: 'images', label: 'Images' },
    { id: 'fields', label: 'Form Fields' },
    { id: 'publish', label: 'Publish' },
  ] as const;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={20} className="text-stone-400 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-stone-900 truncate">{page.title}</div>
            <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
              {page.slug ? (
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest truncate max-w-[140px] sm:max-w-none">/more/{page.slug}</span>
              ) : (
                <span className="text-[10px] text-stone-300 italic">No slug set</span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${page.is_published ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                {page.is_published ? 'Published' : 'Draft'}
              </span>
              {page.submission_count > 0 && (
                <span className="text-[10px] text-stone-400">{page.submission_count} sub{Number(page.submission_count) !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {previewNeedsSlug && (
            <span className="text-[10px] text-amber-600 font-medium whitespace-nowrap">Set a slug first</span>
          )}
          <button onClick={previewPage} title="Preview page"
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-colors">
            <Eye size={16} />
          </button>
          <button onClick={duplicatePage} disabled={duplicating} title="Duplicate page"
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-40">
            <Copy size={16} />
          </button>
          {page.slug && page.is_published && (
            <a href={`/more/${page.slug}`} target="_blank" rel="noopener noreferrer"
              className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-colors">
              <ExternalLink size={16} />
            </a>
          )}
          <button onClick={() => setExpanded(e => !e)}
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-colors">
            <Edit size={16} />
          </button>
          <button onClick={deletePage}
            className="p-2 hover:bg-red-50 rounded-lg text-stone-300 hover:text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-100">
          <div className="flex gap-1 p-3 border-b border-stone-100 bg-stone-50 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-200'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'content' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Page Title (admin)</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Page URL Slug</label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
                      <span className="px-3 text-stone-400 text-xs font-mono">/more/</span>
                      <input value={slug} onChange={e => setSlug(e.target.value)}
                        className="flex-1 px-1 py-2 bg-transparent text-sm text-stone-800 focus:outline-none" placeholder="my-page-name" />
                    </div>
                    <button onClick={saveSlug} disabled={slugSaving}
                      className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 disabled:opacity-60">
                      {slugSaving ? '...' : 'Set'}
                    </button>
                  </div>
                  {slugError && <p className="text-red-500 text-xs mt-1">{slugError}</p>}
                </div>
                <hr className="border-stone-100" />
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Hero Label (pill text)</label>
                  <input value={heroLabel} onChange={e => setHeroLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400" placeholder="e.g. Investment Opportunity" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Hero Title (large heading)</label>
                  <input value={heroTitle} onChange={e => setHeroTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400" placeholder="e.g. Join Our Network" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Hero Subtitle</label>
                  <textarea value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} rows={2}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400 resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Left Panel Title</label>
                    <input value={leftTitle} onChange={e => setLeftTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400 mb-2" />
                    <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Left Panel Description</label>
                    <textarea value={leftDesc} onChange={e => setLeftDesc(e.target.value)} rows={3}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400 resize-none" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Right Panel Title</label>
                    <input value={rightTitle} onChange={e => setRightTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400 mb-2" />
                    <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Right Panel Description</label>
                    <textarea value={rightDesc} onChange={e => setRightDesc(e.target.value)} rows={3}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400 resize-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={saveContent} disabled={saving}
                    className="px-6 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Content'}
                  </button>
                  {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
                </div>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="space-y-4">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
                <button onClick={() => imageInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
                  <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
                {images.length === 0 && !uploading && (
                  <p className="text-stone-400 text-sm">No images uploaded yet.</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {images.map(img => (
                    <div key={img.id} className={`relative rounded-lg overflow-hidden border-2 transition-colors ${img.is_main ? 'border-amber-400' : 'border-stone-200'}`}>
                      {img.image_data ? (
                        <img src={img.image_data} alt="" className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-stone-100 flex items-center justify-center text-stone-300 text-xs">No preview</div>
                      )}
                      {img.is_main && (
                        <div className="absolute top-1 left-1 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Star size={9} /> Main
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        {!img.is_main && (
                          <button onClick={() => setMainImage(img.id)}
                            className="bg-amber-400 text-white rounded p-1 hover:bg-amber-500" title="Set as main">
                            <Star size={12} />
                          </button>
                        )}
                        <button onClick={() => deleteImage(img.id)}
                          className="bg-red-500 text-white rounded p-1 hover:bg-red-600" title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'fields' && (
              <div className="space-y-4">
                {fields.length === 0 && (
                  <p className="text-stone-400 text-sm">No form fields yet. Add fields below.</p>
                )}
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveField(idx, 'up')} disabled={idx === 0}
                          className="p-0.5 hover:bg-stone-200 rounded disabled:opacity-30"><ArrowUp size={12} /></button>
                        <button onClick={() => moveField(idx, 'down')} disabled={idx === fields.length - 1}
                          className="p-0.5 hover:bg-stone-200 rounded disabled:opacity-30"><ArrowDown size={12} /></button>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-stone-200 px-2 py-1 rounded w-20 text-center shrink-0">
                        {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-stone-800 text-sm truncate">{field.field_label}</div>
                        {field.field_placeholder && <div className="text-stone-400 text-xs truncate">{field.field_placeholder}</div>}
                      </div>
                      {field.is_required && (
                        <span className="text-[10px] text-red-500 font-bold shrink-0">Required</span>
                      )}
                      <button onClick={() => deleteField(field.id)}
                        className="p-1 hover:bg-red-50 rounded text-stone-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-100 pt-4">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-3">Add Field</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Field Type</label>
                      <select value={newFieldType} onChange={e => setNewFieldType(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none">
                        {FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Label</label>
                      <input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400"
                        placeholder="e.g. Full Name" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Placeholder</label>
                      <input value={newFieldPlaceholder} onChange={e => setNewFieldPlaceholder(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400"
                        placeholder="e.g. Enter your name" />
                    </div>
                    <div className="flex items-end gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={newFieldRequired} onChange={e => setNewFieldRequired(e.target.checked)}
                          className="accent-stone-900" />
                        <span className="text-sm text-stone-700">Required</span>
                      </label>
                    </div>
                  </div>
                  <button onClick={addField} disabled={addingField || !newFieldLabel.trim()}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
                    <Plus size={14} /> {addingField ? 'Adding...' : 'Add Field'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'publish' && (
              <div className="space-y-6">
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-stone-800">Page Status</p>
                      <p className="text-stone-500 text-sm mt-0.5">
                        {page.is_published ? 'This page is live and publicly accessible.' : 'This page is a draft and not publicly visible.'}
                      </p>
                      {!page.slug && !page.is_published && (
                        <p className="text-amber-600 text-xs mt-1">Set a URL slug before publishing.</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${page.is_published ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-500'}`}>
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={togglePublish} disabled={publishing}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 ${page.is_published ? 'bg-stone-200 text-stone-700 hover:bg-stone-300' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                    {page.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                    {publishing ? '...' : page.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  {page.slug && page.is_published && (
                    <a href={`/more/${page.slug}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800">
                      <ExternalLink size={14} /> View Live
                    </a>
                  )}
                  {page.slug && !page.is_published && (
                    <button onClick={previewPage}
                      className="flex items-center gap-2 px-6 py-3 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-200">
                      <Eye size={14} /> Preview Draft
                    </button>
                  )}
                </div>

                <div className="border-t border-stone-100 pt-4">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-3">Header Navigation</p>
                  <button onClick={toggleHeader}
                    className={`w-full flex items-center justify-between py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${page.show_in_header ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                    <div className="flex items-center gap-2">
                      {page.show_in_header ? <ToggleRight size={16} className="text-amber-600" /> : <ToggleLeft size={16} />}
                      Add to Header
                    </div>
                    <span className={`text-[10px] ${page.show_in_header ? 'text-amber-600' : 'text-stone-400'}`}>
                      {page.show_in_header ? 'Visible in header' : 'Hidden from header'}
                    </span>
                  </button>
                  {page.show_in_header && (
                    <p className="text-[10px] text-stone-400 mt-2">
                      Button label in header: <span className="font-bold text-stone-600">{page.title}</span>
                    </p>
                  )}
                  {(!page.slug || !page.is_published) && (
                    <p className="text-[10px] text-amber-600 mt-1">Page must be published with a slug to appear in the header.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {Number(page.submission_count) > 0 && (
        <div className="border-t border-stone-100">
          <button onClick={() => setSubsExpanded(e => !e)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors text-left">
            <div className="flex items-center gap-2 text-stone-600">
              <Send size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">{page.submission_count} Submission{Number(page.submission_count) !== 1 ? 's' : ''}</span>
            </div>
            {subsExpanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
          </button>
          {subsExpanded && (
            <div className="border-t border-stone-100 p-4">
              {!subsLoaded ? (
                <p className="text-stone-400 text-sm">Loading...</p>
              ) : submissions.length === 0 ? (
                <p className="text-stone-400 text-sm">No submissions found.</p>
              ) : (
                <div className="space-y-2">
                  {submissions.map(sub => (
                    <div key={sub.id} className="rounded-lg border border-stone-100 overflow-hidden">
                      <button
                        onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-stone-50 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-stone-400 shrink-0">{new Date(sub.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          <span className="text-sm text-stone-700 truncate">
                            {Object.values(sub.form_data || {}).filter(Boolean).slice(0, 2).join(' · ') || 'Submission'}
                          </span>
                          {sub.files && sub.files.length > 0 && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium shrink-0">{sub.files.length} file{sub.files.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        {expandedSub === sub.id ? <ChevronUp size={14} className="text-stone-400 shrink-0" /> : <ChevronDown size={14} className="text-stone-400 shrink-0" />}
                      </button>
                      {expandedSub === sub.id && (
                        <div className="px-3 pb-3 border-t border-stone-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {Object.entries(sub.form_data || {}).map(([key, val]) => (
                              <div key={key}>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">{key}</span>
                                <span className="text-sm text-stone-800 break-all">{val}</span>
                              </div>
                            ))}
                          </div>
                          {sub.files && sub.files.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {sub.files.map(f => (
                                <a key={f.id} href={`${API}/pages/${page.id}/submissions/${sub.id}/files/${f.id}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800">
                                  <Download size={14} /> {f.file_name}
                                  {sub.files.length > 1 && <span className="text-stone-400 ml-1">({f.field_label})</span>}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PagesView: React.FC = () => {
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(`${API}/pages/admin/all`);
      const data = await res.json();
      if (Array.isArray(data)) setPages(data);
    } catch {}
    setLoading(false);
  }, []);

  const refreshPages = useCallback(async () => {
    try {
      const res = await apiCall(`${API}/pages/admin/all`);
      const data = await res.json();
      if (Array.isArray(data)) setPages(data);
    } catch {}
  }, []);

  useEffect(() => { loadPages(); }, [loadPages]);

  const createPage = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await apiCall(`${API}/pages`, {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setNewTitle('');
        await loadPages();
      }
    } catch {}
    setCreating(false);
  };

  return (
    <div>
      <div className="mb-6 space-y-3">
        <h2 className="font-serif text-2xl text-stone-900">Custom Pages</h2>
        <div className="flex gap-2">
          <input
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createPage()}
            className="flex-1 min-w-0 px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400"
            placeholder="New page title..." />
          <button onClick={createPage} disabled={creating || !newTitle.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60 shrink-0">
            <Plus size={14} /> {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-500">Loading...</div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <FileText size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">No custom pages yet. Create your first page above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map(page => (
            <PageCard key={page.id} page={page} onRefresh={loadPages} onSilentRefresh={refreshPages} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PagesView;
