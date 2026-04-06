import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, Users, Package, Eye, Check, X, ToggleLeft, ToggleRight, Images } from 'lucide-react';

const API = '/api';

async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (res.status === 401) throw new Error('Session expired');
  return res;
}

interface EventPackage {
  id: number;
  event_id: number;
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

interface Event {
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
  is_published: boolean;
  show_in_header: boolean;
  package_count: string;
  attendee_count: string;
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
  package_price: string;
  quantity: number;
  amount_paid: string;
  status: string;
  purchased_at: string;
  tickets: Ticket[];
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const EventForm: React.FC<{
  event: Partial<Event>;
  onSave: (data: Partial<Event>) => Promise<void>;
  saving: boolean;
}> = ({ event, onSave, saving }) => {
  const [form, setForm] = useState({
    title: event.title || '',
    description: event.description || '',
    date: event.date || '',
    time: event.time || '',
    venue: event.venue || '',
    slug: event.slug || '',
    text_bg_color: event.text_bg_color || '#000000',
    text_bg_opacity: event.text_bg_opacity ?? 0.5,
    is_published: event.is_published || false,
    bg_image: event.bg_image || '',
    bg_type: event.bg_type || 'image',
    bg_video: event.bg_video || '',
  });

  const videoInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { set('bg_image', reader.result as string); set('bg_type', 'image'); set('bg_video', ''); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { set('bg_video', reader.result as string); set('bg_type', 'video'); set('bg_image', ''); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { set('bg_video', reader.result as string); set('bg_type', 'gif'); set('bg_image', ''); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearBackground = () => { set('bg_image', ''); set('bg_video', ''); set('bg_type', 'image'); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const hasBackground = form.bg_image || form.bg_video;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Event Title *</label>
          <input required value={form.title} onChange={e => { set('title', e.target.value); if (!event.id) set('slug', slugify(e.target.value)); }}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Slug (URL) *</label>
          <input required value={form.slug} onChange={e => set('slug', slugify(e.target.value))}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 font-mono focus:outline-none focus:border-stone-400"
            placeholder="my-event" />
          <p className="text-[10px] text-stone-400 mt-0.5">/event/{form.slug || 'my-event'}</p>
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 resize-none focus:outline-none focus:border-stone-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Date</label>
          <input value={form.date} onChange={e => set('date', e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400"
            placeholder="Saturday 12 July 2025" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Time</label>
          <input value={form.time} onChange={e => set('time', e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400"
            placeholder="18:00 – Late" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Venue</label>
          <input value={form.venue} onChange={e => set('venue', e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-stone-400"
            placeholder="Helsinki, Finland" />
        </div>
      </div>

      <div className="border border-stone-200 rounded-lg p-4 space-y-4">
        <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500">Background & Overlay Settings</p>

        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-2">Background Media</label>
          {hasBackground ? (
            <div className="flex items-center gap-3 flex-wrap">
              {form.bg_type === 'image' && form.bg_image && (
                <img src={form.bg_image} alt="bg" className="w-24 h-16 object-cover rounded-lg border border-stone-200" />
              )}
              {(form.bg_type === 'video' || form.bg_type === 'gif') && form.bg_video && (
                form.bg_type === 'video' ? (
                  <video src={form.bg_video} className="w-24 h-16 object-cover rounded-lg border border-stone-200" muted />
                ) : (
                  <img src={form.bg_video} alt="gif bg" className="w-24 h-16 object-cover rounded-lg border border-stone-200" />
                )
              )}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-stone-600 uppercase">
                  {form.bg_type === 'video' ? 'Video' : form.bg_type === 'gif' ? 'GIF' : 'Image'} background
                </span>
                <button type="button" onClick={clearBackground}
                  className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 w-fit">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-stone-200">
                <Upload size={14} /> Image
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
              </label>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-stone-200">
                <Upload size={14} /> Video
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoUpload} />
              </label>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-stone-200">
                <Upload size={14} /> GIF
                <input ref={gifInputRef} type="file" accept="image/gif" className="hidden" onChange={handleGifUpload} />
              </label>
            </div>
          )}
          <p className="text-[10px] text-stone-400 mt-1">Video and GIF will play silently in a loop as the page background.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Text Overlay Colour</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.text_bg_color} onChange={e => set('text_bg_color', e.target.value)}
                className="w-10 h-10 rounded border border-stone-200 cursor-pointer" />
              <input value={form.text_bg_color} onChange={e => set('text_bg_color', e.target.value)}
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-mono focus:outline-none focus:border-stone-400" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">
              Overlay Opacity: {Math.round(form.text_bg_opacity * 100)}%
            </label>
            <input type="range" min="0" max="1" step="0.05" value={form.text_bg_opacity}
              onChange={e => set('text_bg_opacity', parseFloat(e.target.value))}
              className="w-full accent-stone-900" />
          </div>
        </div>
        <div
          className="rounded-lg p-4 text-sm font-medium"
          style={{ backgroundColor: form.text_bg_color ? `${form.text_bg_color}${Math.round(form.text_bg_opacity * 255).toString(16).padStart(2, '0')}` : 'rgba(0,0,0,0.5)', color: '#fff' }}>
          Preview: This is how text overlay will look on the event page
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="ev-published" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} className="accent-stone-900" />
        <label htmlFor="ev-published" className="text-sm text-stone-700 font-medium">Published (visible to public)</label>
      </div>

      <button type="submit" disabled={saving}
        className="px-6 py-3 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
        {saving ? 'Saving...' : event.id ? 'Save Changes' : 'Create Event'}
      </button>
    </form>
  );
};

const PackagesManager: React.FC<{ eventId: number }> = ({ eventId }) => {
  const [packages, setPackages] = useState<EventPackage[]>([]);
  const [adding, setAdding] = useState(false);
  const [newPkg, setNewPkg] = useState({ name: '', description: '', price: '', payment_link: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: '', description: '', price: '', payment_link: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiCall(`${API}/events/${eventId}/packages`);
      setPackages(await res.json());
    } catch {}
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const addPackage = async () => {
    if (!newPkg.name.trim() || !newPkg.price) return alert('Name and price are required');
    setSaving(true);
    try {
      await apiCall(`${API}/events/${eventId}/packages`, {
        method: 'POST',
        body: JSON.stringify({ ...newPkg, sort_order: packages.length }),
      });
      setNewPkg({ name: '', description: '', price: '', payment_link: '' });
      setAdding(false);
      load();
    } catch {}
    setSaving(false);
  };

  const saveEdit = async (pkgId: number) => {
    setSaving(true);
    try {
      await apiCall(`${API}/events/${eventId}/packages/${pkgId}`, {
        method: 'PUT',
        body: JSON.stringify(editData),
      });
      setEditId(null);
      load();
    } catch {}
    setSaving(false);
  };

  const deletePkg = async (pkgId: number) => {
    if (!confirm('Delete this package?')) return;
    await apiCall(`${API}/events/${eventId}/packages/${pkgId}`, { method: 'DELETE' });
    load();
  };

  const moveUp = async (idx: number) => {
    if (idx === 0) return;
    const a = packages[idx - 1];
    const b = packages[idx];
    await apiCall(`${API}/events/${eventId}/packages/${a.id}`, { method: 'PUT', body: JSON.stringify({ ...a, sort_order: b.sort_order }) });
    await apiCall(`${API}/events/${eventId}/packages/${b.id}`, { method: 'PUT', body: JSON.stringify({ ...b, sort_order: a.sort_order }) });
    load();
  };

  const moveDown = async (idx: number) => {
    if (idx >= packages.length - 1) return;
    const a = packages[idx];
    const b = packages[idx + 1];
    await apiCall(`${API}/events/${eventId}/packages/${a.id}`, { method: 'PUT', body: JSON.stringify({ ...a, sort_order: b.sort_order }) });
    await apiCall(`${API}/events/${eventId}/packages/${b.id}`, { method: 'PUT', body: JSON.stringify({ ...b, sort_order: a.sort_order }) });
    load();
  };

  return (
    <div className="mt-4 border border-stone-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500">Ticket Packages</p>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800">
          <Plus size={12} /> Add Package
        </button>
      </div>

      {packages.length === 0 && !adding && (
        <p className="text-stone-400 text-sm">No packages yet. Add at least one ticket tier.</p>
      )}

      <div className="space-y-2">
        {packages.map((pkg, idx) => (
          <div key={pkg.id} className="bg-stone-50 rounded-lg border border-stone-200 p-3">
            {editId === pkg.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                    className="px-2 py-1.5 bg-white border border-stone-200 rounded text-sm focus:outline-none" placeholder="Package name" />
                  <input value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                    className="px-2 py-1.5 bg-white border border-stone-200 rounded text-sm focus:outline-none" placeholder="Description" />
                  <input type="number" step="0.01" min="0" value={editData.price} onChange={e => setEditData(d => ({ ...d, price: e.target.value }))}
                    className="px-2 py-1.5 bg-white border border-stone-200 rounded text-sm focus:outline-none" placeholder="Price €" />
                </div>
                <input value={editData.payment_link} onChange={e => setEditData(d => ({ ...d, payment_link: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded text-sm focus:outline-none" placeholder="Payment link (e.g. https://pay.stripe.com/…) — leave empty to use built-in checkout" />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(pkg.id)} disabled={saving}
                    className="px-3 py-1.5 bg-stone-900 text-white rounded text-xs font-bold hover:bg-stone-800 disabled:opacity-60">Save</button>
                  <button onClick={() => setEditId(null)} className="px-3 py-1.5 border border-stone-200 text-stone-600 rounded text-xs font-bold hover:bg-stone-100">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 text-stone-300 hover:text-stone-700 disabled:opacity-20"><ChevronUp size={14} /></button>
                  <button onClick={() => moveDown(idx)} disabled={idx === packages.length - 1} className="p-0.5 text-stone-300 hover:text-stone-700 disabled:opacity-20"><ChevronDown size={14} /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-stone-900 text-sm">{pkg.name}</span>
                  {pkg.description && <span className="text-stone-500 text-xs ml-2">— {pkg.description}</span>}
                  {pkg.payment_link && (
                    <a href={pkg.payment_link} target="_blank" rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-medium truncate max-w-[140px]">
                      🔗 payment link
                    </a>
                  )}
                </div>
                <span className="text-amber-700 font-bold text-sm">€{parseFloat(pkg.price).toFixed(2)}</span>
                <button onClick={() => { setEditId(pkg.id); setEditData({ name: pkg.name, description: pkg.description, price: pkg.price, payment_link: pkg.payment_link || '' }); }}
                  className="px-2 py-1 text-xs text-stone-600 border border-stone-200 rounded hover:bg-stone-100">Edit</button>
                <button onClick={() => deletePkg(pkg.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-3 border border-stone-300 rounded-lg p-3 bg-white space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={newPkg.name} onChange={e => setNewPkg(p => ({ ...p, name: e.target.value }))}
              className="px-2 py-1.5 bg-stone-50 border border-stone-200 rounded text-sm focus:outline-none" placeholder="Package name *" />
            <input value={newPkg.description} onChange={e => setNewPkg(p => ({ ...p, description: e.target.value }))}
              className="px-2 py-1.5 bg-stone-50 border border-stone-200 rounded text-sm focus:outline-none" placeholder="Description" />
            <input type="number" step="0.01" min="0" value={newPkg.price} onChange={e => setNewPkg(p => ({ ...p, price: e.target.value }))}
              className="px-2 py-1.5 bg-stone-50 border border-stone-200 rounded text-sm focus:outline-none" placeholder="Price (€) *" />
          </div>
          <input value={newPkg.payment_link} onChange={e => setNewPkg(p => ({ ...p, payment_link: e.target.value }))}
            className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded text-sm focus:outline-none" placeholder="Payment link (e.g. https://pay.stripe.com/…) — leave empty to use built-in checkout" />
          <div className="flex gap-2">
            <button onClick={addPackage} disabled={saving} className="px-4 py-1.5 bg-stone-900 text-white rounded text-xs font-bold hover:bg-stone-800 disabled:opacity-60">Add</button>
            <button onClick={() => setAdding(false)} className="px-4 py-1.5 border border-stone-200 text-stone-600 rounded text-xs font-bold hover:bg-stone-100">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

const ImagesManager: React.FC<{ eventId: number }> = ({ eventId }) => {
  const [images, setImages] = useState<EventImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiCall(`${API}/events/${eventId}/images`);
      setImages(await res.json());
    } catch {}
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      await new Promise<void>(resolve => {
        reader.onload = async ev => {
          const image_data = ev.target?.result as string;
          try {
            await apiCall(`${API}/events/${eventId}/images`, {
              method: 'POST',
              body: JSON.stringify({ image_data }),
            });
          } catch {}
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    await load();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const deleteImage = async (imgId: number) => {
    if (!confirm('Delete this image?')) return;
    await apiCall(`${API}/events/${eventId}/images/${imgId}`, { method: 'DELETE' });
    setImages(prev => prev.filter(i => i.id !== imgId));
  };

  return (
    <div className="mt-4 border border-stone-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500">Gallery Images ({images.length})</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 disabled:opacity-60">
          <Upload size={12} /> {uploading ? 'Uploading...' : 'Upload Images'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </div>
      {images.length === 0 && !uploading && (
        <p className="text-stone-400 text-sm">No gallery images yet. These appear as a photo gallery below the ticket section on the event page.</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {images.map(img => (
          <div key={img.id} className="relative group rounded-lg overflow-hidden border border-stone-200">
            <img src={img.image_data} alt="" className="w-full h-24 object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button onClick={() => deleteImage(img.id)} className="p-1.5 bg-red-500 text-white rounded-full" title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AttendeesView: React.FC<{ eventId: number }> = ({ eventId }) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(`${API}/events/${eventId}/attendees`);
      setAttendees(await res.json());
    } catch {}
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const toggleCheckin = async (ticketId: number) => {
    setCheckingIn(ticketId);
    try {
      await apiCall(`${API}/events/tickets/${ticketId}/checkin`, { method: 'POST' });
      load();
    } catch {}
    setCheckingIn(null);
  };

  const paid = attendees.filter(a => a.status === 'paid');
  const totalTickets = paid.reduce((s, a) => s + a.quantity, 0);
  const checkedIn = paid.reduce((s, a) => s + (a.tickets || []).filter(t => t.is_checked_in).length, 0);
  const pending = attendees.filter(a => a.status !== 'paid');

  if (loading) return <div className="text-center py-8 text-stone-500 text-sm">Loading attendees...</div>;

  return (
    <div className="mt-4">
      <div className="flex gap-4 mb-4">
        <div className="bg-stone-50 rounded-lg border border-stone-200 px-4 py-3 text-center flex-1">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Paid</p>
          <p className="font-serif text-2xl text-stone-900">{paid.length}</p>
        </div>
        <div className="bg-stone-50 rounded-lg border border-stone-200 px-4 py-3 text-center flex-1">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Tickets</p>
          <p className="font-serif text-2xl text-stone-900">{totalTickets}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 px-4 py-3 text-center flex-1">
          <p className="text-[10px] uppercase font-bold tracking-widest text-green-500">Checked In</p>
          <p className="font-serif text-2xl text-green-700">{checkedIn}</p>
        </div>
        {pending.length > 0 && (
          <div className="bg-amber-50 rounded-lg border border-amber-200 px-4 py-3 text-center flex-1">
            <p className="text-[10px] uppercase font-bold tracking-widest text-amber-600">Pending</p>
            <p className="font-serif text-2xl text-amber-700">{pending.length}</p>
          </div>
        )}
      </div>

      {attendees.length === 0 ? (
        <p className="text-stone-400 text-sm text-center py-6">No purchases yet.</p>
      ) : (
        <div className="space-y-2">
          {attendees.map(a => (
            <div key={a.id} className={`bg-white rounded-lg border ${a.status === 'paid' ? 'border-stone-200' : 'border-amber-200'}`}>
              <button className="w-full text-left p-3 flex items-center gap-3" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-900 text-sm">{a.buyer_name}</span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full">{a.package_name}</span>
                    <span className="text-stone-500 text-xs">× {a.quantity}</span>
                    <span className="text-stone-700 text-xs font-bold">€{parseFloat(a.amount_paid).toFixed(2)}</span>
                    {a.status !== 'paid' && (
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full uppercase">{a.status}</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{a.buyer_email} · {a.buyer_phone}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-stone-400">{new Date(a.purchased_at).toLocaleDateString('en-GB')}</span>
                  {expanded === a.id ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                </div>
              </button>
              {expanded === a.id && (
                <div className="border-t border-stone-100 p-3 space-y-2">
                  {(a.tickets || []).map((ticket, ti) => (
                    <div key={ticket.id} className={`flex items-center gap-3 p-2 rounded-lg ${ticket.is_checked_in ? 'bg-green-50 border border-green-200' : 'bg-stone-50 border border-stone-200'}`}>
                      <span className="text-xs text-stone-500 font-mono shrink-0">Ticket #{ti + 1}</span>
                      <span className="text-[10px] font-mono text-stone-400 flex-1 truncate">{ticket.ticket_token}</span>
                      {ticket.is_checked_in && ticket.checked_in_at && (
                        <span className="text-[10px] text-green-600">{new Date(ticket.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      <button
                        onClick={() => toggleCheckin(ticket.id)}
                        disabled={checkingIn === ticket.id}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors ${ticket.is_checked_in ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-stone-900 text-white hover:bg-stone-800'} disabled:opacity-60`}>
                        {checkingIn === ticket.id ? '...' : ticket.is_checked_in ? (<><Check size={12} /> Checked In</>) : 'Check In'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | 'new' | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, 'edit' | 'packages' | 'images' | 'attendees'>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [togglingHeader, setTogglingHeader] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(`${API}/events/admin/all`);
      setEvents(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getTab = (id: number) => activeTab[id] || 'edit';
  const setTab = (id: number, tab: 'edit' | 'packages' | 'images' | 'attendees') => setActiveTab(t => ({ ...t, [id]: tab }));

  const createEvent = async (data: Partial<Event>) => {
    setSaving(true);
    setError('');
    try {
      const res = await apiCall(`${API}/events`, { method: 'POST', body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) { setError(result.error || 'Failed to create event'); setSaving(false); return; }
      setExpanded(null);
      load();
    } catch { setError('Failed to save'); }
    setSaving(false);
  };

  const updateEvent = async (id: number, data: Partial<Event>) => {
    setSaving(true);
    setError('');
    try {
      const res = await apiCall(`${API}/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) { setError(result.error || 'Failed to update event'); setSaving(false); return; }
      load();
    } catch { setError('Failed to save'); }
    setSaving(false);
  };

  const deleteEvent = async (id: number) => {
    if (!confirm('Delete this event and all its data?')) return;
    await apiCall(`${API}/events/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleHeader = async (ev: Event) => {
    if (!ev.is_published) {
      alert('The event must be published before it can be shown in the header.');
      return;
    }
    const newVal = !ev.show_in_header;
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, show_in_header: newVal } : e));
    setTogglingHeader(ev.id);
    try {
      const res = await apiCall(`${API}/events/${ev.id}/header`, {
        method: 'PATCH',
        body: JSON.stringify({ show_in_header: newVal }),
      });
      if (!res.ok) {
        setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, show_in_header: ev.show_in_header } : e));
      }
    } catch {
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, show_in_header: ev.show_in_header } : e));
    }
    setTogglingHeader(null);
  };

  if (loading) return <div className="text-center py-12 text-stone-500">Loading events...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Events</h2>
          <p className="text-stone-500 text-sm mt-1">Create and manage events with ticket tiers and QR check-in</p>
        </div>
        <button onClick={() => setExpanded(expanded === 'new' ? null : 'new')}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800">
          <Plus size={14} /> New Event
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}

      {expanded === 'new' && (
        <div className="mb-6 bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-serif text-xl text-stone-900">New Event</h3>
          <EventForm event={{}} onSave={createEvent} saving={saving} />
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No events yet. Create your first event above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(ev => (
            <div key={ev.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                {ev.bg_image && (
                  <img src={ev.bg_image} alt="" className="w-16 h-12 object-cover rounded-lg border border-stone-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-lg text-stone-900">{ev.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${ev.is_published ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {ev.is_published ? 'Published' : 'Draft'}
                    </span>
                    {ev.show_in_header && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-100 text-blue-700">In Header</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    {ev.date && <span className="text-stone-500 text-xs">{ev.date}</span>}
                    {ev.venue && <span className="text-stone-400 text-xs">· {ev.venue}</span>}
                    <span className="text-stone-400 text-xs">· {ev.package_count} packages</span>
                    <span className="text-stone-400 text-xs">· {ev.attendee_count} attendees</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleHeader(ev)}
                    disabled={togglingHeader === ev.id}
                    title={ev.show_in_header ? 'Remove from header' : 'Show in header'}
                    className={`p-2 rounded-lg transition-colors ${ev.show_in_header ? 'text-blue-600 hover:bg-blue-50' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'} disabled:opacity-40`}>
                    {ev.show_in_header ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  {ev.is_published && (
                    <a href={`/event/${ev.slug}`} target="_blank" rel="noopener noreferrer"
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg" title="View page">
                      <Eye size={16} />
                    </a>
                  )}
                  <button onClick={() => deleteEvent(ev.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  <button onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${expanded === ev.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                    {expanded === ev.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expanded === ev.id ? 'Close' : 'Edit'}
                  </button>
                </div>
              </div>

              {expanded === ev.id && (
                <div className="border-t border-stone-100 p-4">
                  <div className="flex gap-1 mb-4 border-b border-stone-100 pb-3 overflow-x-auto">
                    {(['edit', 'packages', 'images', 'attendees'] as const).map(tab => (
                      <button key={tab} onClick={() => setTab(ev.id, tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${getTab(ev.id) === tab ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                        {tab === 'edit' ? 'Details' :
                          tab === 'packages' ? (<span className="flex items-center gap-1"><Package size={12} /> Packages</span>) :
                          tab === 'images' ? (<span className="flex items-center gap-1"><Images size={12} /> Gallery</span>) :
                          (<span className="flex items-center gap-1"><Users size={12} /> Attendees</span>)}
                      </button>
                    ))}
                  </div>

                  {getTab(ev.id) === 'edit' && (
                    <EventForm event={ev} onSave={data => updateEvent(ev.id, data)} saving={saving} />
                  )}
                  {getTab(ev.id) === 'packages' && <PackagesManager eventId={ev.id} />}
                  {getTab(ev.id) === 'images' && <ImagesManager eventId={ev.id} />}
                  {getTab(ev.id) === 'attendees' && <AttendeesView eventId={ev.id} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
