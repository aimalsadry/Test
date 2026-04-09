import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Edit, Trash2, Key, Globe, Star, Upload, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, ExternalLink, Eye, EyeOff, Package, Send, Copy, ArrowUp, ArrowDown, ClipboardList, Calendar } from 'lucide-react';

const API = '/api';

interface ProductImage {
  id: number;
  product_id: number;
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
  slug: string | null;
  show_in_header: boolean;
  is_published: boolean;
  is_out_of_stock: boolean;
  show_in_products_page: boolean;
  checkout_info_enabled: boolean;
  book_to_receive_enabled: boolean;
  book_to_receive_title: string;
  book_to_receive_buffer_days: number;
  images: ProductImage[];
  available_keys: number;
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

const ProductForm: React.FC<{
  product?: Product;
  onSave: () => void;
  onCancel: () => void;
}> = ({ product, onSave, onCancel }) => {
  const [title, setTitle] = useState(product?.title || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price?.toString() || '0');
  const [discount, setDiscount] = useState(product?.discount_percent?.toString() || '0');
  const [receiptSentence, setReceiptSentence] = useState(product?.receipt_sentence || '');
  const [checkoutUrl, setCheckoutUrl] = useState(product?.sumup_checkout_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Title is required');
    setSaving(true);
    setError('');
    try {
      const body = {
        title: title.trim(), description, price, discount_percent: discount,
        receipt_sentence: receiptSentence, sumup_checkout_url: checkoutUrl,
        ...(product ? {
          checkout_info_enabled: product.checkout_info_enabled,
          book_to_receive_enabled: product.book_to_receive_enabled,
          book_to_receive_title: product.book_to_receive_title,
          book_to_receive_buffer_days: product.book_to_receive_buffer_days,
        } : {}),
      };
      const url = product ? `${API}/products/${product.id}` : `${API}/products`;
      const method = product ? 'PUT' : 'POST';
      const res = await apiCall(url, { method, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      } else {
        onSave();
      }
    } catch (err: any) {
      setError(err.message || 'Error saving product');
    }
    setSaving(false);
  };

  const discountedPrice = parseFloat(price) * (1 - parseFloat(discount || '0') / 100);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

      <div>
        <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} required
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
          placeholder="Product name" />
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800 resize-none"
          placeholder="Product description..." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Price (€)</label>
          <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Discount (%)</label>
          <input type="number" min="0" max="100" step="0.1" value={discount} onChange={e => setDiscount(e.target.value)}
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800" />
        </div>
      </div>

      {parseFloat(discount) > 0 && (
        <div className="text-sm text-stone-500 -mt-2">
          Final price: <span className="font-bold text-stone-900">€{discountedPrice.toFixed(2)}</span>
          <span className="ml-2 line-through text-stone-400">€{parseFloat(price).toFixed(2)}</span>
        </div>
      )}

      <div>
        <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Receipt Sentence</label>
        <input value={receiptSentence} onChange={e => setReceiptSentence(e.target.value)}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
          placeholder="Sentence shown on receipt, e.g. 'Thank you for your purchase!'" />
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">SumUp Checkout URL</label>
        <input value={checkoutUrl} onChange={e => setCheckoutUrl(e.target.value)}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-800"
          placeholder="https://pay.sumup.com/..." />
        <p className="text-[10px] text-stone-400 mt-1">Paste the static SumUp checkout link for this product.</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 border border-stone-200 text-stone-600 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-stone-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-stone-800 disabled:opacity-60">
          {saving ? 'Saving...' : (product ? 'Save' : 'Create Product')}
        </button>
      </div>
    </form>
  );
};

const ImageManager: React.FC<{ product: Product; onRefresh: () => void }> = ({ product, onRefresh }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = async (ev) => {
          const imageData = ev.target?.result as string;
          const isFirst = product.images.length === 0;
          try {
            const res = await apiCall(`${API}/products/${product.id}/images`, {
              method: 'POST',
              body: JSON.stringify({ image_data: imageData, is_main: isFirst }),
            });
            if (!res.ok) {
              const d = await res.json();
              alert(d.error || 'Failed to upload image');
            }
          } catch { }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    onRefresh();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const setMain = async (imageId: number) => {
    await apiCall(`${API}/products/${product.id}/images/${imageId}/set-main`, { method: 'PUT' });
    onRefresh();
  };

  const deleteImage = async (imageId: number) => {
    if (!confirm('Delete this image?')) return;
    await apiCall(`${API}/products/${product.id}/images/${imageId}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Images ({product.images.length})</span>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
          <Upload size={12} /> {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </div>

      {product.images.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-stone-200 rounded-lg text-stone-400 text-sm">
          No images yet. Upload at least one.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {product.images.map(img => (
            <div key={img.id} className={`relative group rounded-lg overflow-hidden border-2 ${img.is_main ? 'border-amber-400' : 'border-transparent'}`}>
              <img src={img.image_data} alt="" className="w-full h-24 object-cover" />
              {img.is_main && (
                <div className="absolute top-1 left-1 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star size={9} fill="white" /> Main
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_main && (
                  <button onClick={() => setMain(img.id)}
                    className="p-1.5 bg-amber-400 text-white rounded-full" title="Set as main">
                    <Star size={12} />
                  </button>
                )}
                <button onClick={() => deleteImage(img.id)}
                  className="p-1.5 bg-red-500 text-white rounded-full" title="Delete">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AccessKeyManager: React.FC<{ product: Product; onRefresh: () => void }> = ({ product, onRefresh }) => {
  const [keysText, setKeysText] = useState('');
  const [importing, setImporting] = useState(false);
  const [parsedFileCount, setParsedFileCount] = useState<number | null>(null);
  const fileKeyRef = useRef<HTMLInputElement>(null);
  interface AccessKey { id: number; key_value: string; is_used: boolean; created_at: string }
  const [keyData, setKeyData] = useState<{ total: number; available: number; keys: AccessKey[] } | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);

  const loadKeyData = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const res = await apiCall(`${API}/products/${product.id}/access-keys`);
      const data = await res.json();
      setKeyData(data);
    } catch { }
    setLoadingKeys(false);
  }, [product.id]);

  useEffect(() => { loadKeyData(); }, [loadKeyData]);

  const importKeys = async () => {
    if (!keysText.trim()) return;
    setImporting(true);
    try {
      const res = await apiCall(`${API}/products/${product.id}/access-keys`, {
        method: 'POST',
        body: JSON.stringify({ keys_text: keysText }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`${data.inserted} key(s) imported successfully`);
        setKeysText('');
        setParsedFileCount(null);
        loadKeyData();
        onRefresh();
      } else {
        alert(data.error || 'Failed to import keys');
      }
    } catch { }
    setImporting(false);
  };

  const handleKeyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let text = (ev.target?.result as string) || '';
      text = text.replace(/^\uFEFF/, '');

      const HEADER_PATTERN = /^(key|keys|license[_\s]?key|access[_\s]?key|serial|code|token|value)s?$/i;

      const keys: string[] = [];
      const rawLines = text.split(/[\r\n]+/);
      for (const rawLine of rawLines) {
        const line = rawLine.trim();
        if (!line) continue;

        const firstField = line.includes(',')
          ? line.split(',')[0].replace(/^"|"$/g, '').trim()
          : line;

        if (!firstField) continue;
        if (HEADER_PATTERN.test(firstField)) continue;

        keys.push(firstField);
      }

      setKeysText(keys.join('\n'));
      setParsedFileCount(keys.length);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const deleteKey = async (keyId: number) => {
    if (!confirm('Delete this key?')) return;
    await apiCall(`${API}/products/${product.id}/access-keys/${keyId}`, { method: 'DELETE' });
    loadKeyData();
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
        <Key size={16} className="text-amber-600" />
        <div className="text-sm">
          <span className="font-bold text-stone-900">{keyData?.available ?? '...'}</span>
          <span className="text-stone-500"> available / </span>
          <span className="font-medium text-stone-700">{keyData?.total ?? '...'}</span>
          <span className="text-stone-500"> total keys</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Import Access Keys (one per line)
          </label>
          <button onClick={() => fileKeyRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors">
            <Upload size={11} /> Upload File
          </button>
          <input ref={fileKeyRef} type="file" accept=".csv,.txt,text/plain,text/csv" className="hidden" onChange={handleKeyFile} />
        </div>
        {parsedFileCount !== null && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">
            Found {parsedFileCount} key{parsedFileCount !== 1 ? 's' : ''} — review below then click Import Keys to confirm
          </p>
        )}
        <textarea
          value={keysText} onChange={e => { setKeysText(e.target.value); setParsedFileCount(null); }} rows={5}
          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 resize-none focus:outline-none focus:border-stone-400 font-mono"
          placeholder={"KEY-ABCD-1234\nKEY-EFGH-5678\nKEY-IJKL-9012"} />
        <button onClick={importKeys} disabled={importing || !keysText.trim()}
          className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-amber-700 disabled:opacity-60">
          {importing ? 'Importing...' : 'Import Keys'}
        </button>
      </div>

      {keyData && keyData.keys.length > 0 && (
        <div>
          <button onClick={() => { setShowKeys(!showKeys); }}
            className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-stone-400 hover:text-stone-700">
            {showKeys ? <EyeOff size={12} /> : <Eye size={12} />}
            {showKeys ? 'Hide' : 'Show'} All Keys
          </button>
          {showKeys && (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {keyData.keys.map((k) => (
                <div key={k.id} className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono ${k.is_used ? 'bg-stone-100 text-stone-400 line-through' : 'bg-white border border-stone-200 text-stone-800'}`}>
                  <span>{k.key_value}</span>
                  {!k.is_used && (
                    <button onClick={() => deleteKey(k.id)} className="text-red-400 hover:text-red-600 ml-2">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CHECKOUT_FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'photo', 'signature'];
const CHECKOUT_FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  email: 'Email',
  tel: 'Phone',
  textarea: 'Textarea',
  photo: 'Photo',
  signature: 'Signature',
};

const CheckoutFieldsManager: React.FC<{ product: Product; onRefresh: () => void }> = ({ product, onRefresh }) => {
  const [fields, setFields] = useState<CheckoutField[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newType, setNewType] = useState('text');
  const [newLabel, setNewLabel] = useState('');
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [newRequired, setNewRequired] = useState(true);
  const [adding, setAdding] = useState(false);

  const [enabled, setEnabled] = useState(!!product.checkout_info_enabled);
  const [toggling, setToggling] = useState(false);

  const loadFields = useCallback(async () => {
    if (loaded) return;
    try {
      const res = await apiCall(`${API}/products/${product.id}/checkout-fields`);
      const data = await res.json();
      if (Array.isArray(data)) setFields(data);
    } catch {}
    setLoaded(true);
  }, [product.id, loaded]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const toggleEnabled = async () => {
    setToggling(true);
    try {
      const res = await apiCall(`${API}/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          price: product.price,
          discount_percent: product.discount_percent,
          receipt_sentence: product.receipt_sentence,
          sumup_checkout_url: product.sumup_checkout_url,
          checkout_info_enabled: !enabled,
          book_to_receive_enabled: product.book_to_receive_enabled,
          book_to_receive_title: product.book_to_receive_title,
        }),
      });
      if (res.ok) { setEnabled(!enabled); onRefresh(); }
    } catch {}
    setToggling(false);
  };

  const addField = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const res = await apiCall(`${API}/products/${product.id}/checkout-fields`, {
        method: 'POST',
        body: JSON.stringify({ field_type: newType, field_label: newLabel.trim(), field_placeholder: newPlaceholder.trim(), is_required: newRequired, sort_order: fields.length }),
      });
      if (res.ok) {
        const f = await res.json();
        setFields(prev => [...prev, f]);
        setNewLabel('');
        setNewPlaceholder('');
        setNewRequired(true);
      }
    } catch {}
    setAdding(false);
  };

  const deleteField = async (fieldId: number) => {
    await apiCall(`${API}/products/${product.id}/checkout-fields/${fieldId}`, { method: 'DELETE' });
    setFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const moveField = async (idx: number, dir: 'up' | 'down') => {
    const newFields = [...fields];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newFields.length) return;
    [newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]];
    const updated = newFields.map((f, i) => ({ ...f, sort_order: i }));
    setFields(updated);
    await Promise.all(updated.map((f, i) =>
      apiCall(`${API}/products/${product.id}/checkout-fields/${f.id}`, { method: 'PUT', body: JSON.stringify({ sort_order: i }) })
    ));
  };

  return (
    <div className="space-y-3">
      <button onClick={toggleEnabled} disabled={toggling}
        className={`w-full flex items-center justify-between py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${enabled ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className={enabled ? 'text-blue-600' : 'text-stone-400'} />
          Checkout Info
        </div>
        <span className={`text-[10px] ${enabled ? 'text-blue-600' : 'text-stone-400'}`}>
          {enabled ? 'On' : 'Off'}
        </span>
      </button>

      {enabled && (
        <div className="border border-blue-100 rounded-xl p-4 space-y-4 bg-blue-50/30">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Checkout Fields — buyers fill these in before paying</p>

          {fields.length > 0 && (
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={f.id} className="flex items-center gap-2 p-2.5 bg-white border border-stone-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-stone-800">{f.field_label}</span>
                    <span className="ml-2 text-[10px] text-stone-400 uppercase">{CHECKOUT_FIELD_TYPE_LABELS[f.field_type] || f.field_type}</span>
                    {f.is_required && <span className="ml-1 text-[10px] text-red-400">*</span>}
                  </div>
                  <button onClick={() => moveField(idx, 'up')} disabled={idx === 0} className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30"><ArrowUp size={12} /></button>
                  <button onClick={() => moveField(idx, 'down')} disabled={idx === fields.length - 1} className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30"><ArrowDown size={12} /></button>
                  <button onClick={() => deleteField(f.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-blue-100">
            <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Add Field</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-stone-500 mb-0.5 block">Field Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400">
                  {CHECKOUT_FIELD_TYPES.map(t => <option key={t} value={t}>{CHECKOUT_FIELD_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-stone-500 mb-0.5 block">Label</label>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                  placeholder="e.g. Full Name" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-stone-500 mb-0.5 block">Placeholder</label>
              <input value={newPlaceholder} onChange={e => setNewPlaceholder(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                placeholder="e.g. Enter your name" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={newRequired} onChange={e => setNewRequired(e.target.checked)} id={`req-${product.id}`}
                className="rounded border-stone-300 text-stone-900" />
              <label htmlFor={`req-${product.id}`} className="text-xs text-stone-600">Required</label>
            </div>
            <button onClick={addField} disabled={adding || !newLabel.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
              <Plus size={13} /> {adding ? 'Adding...' : 'Add Field'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const BookToReceiveManager: React.FC<{ product: Product; onRefresh: () => void }> = ({ product, onRefresh }) => {
  const [enabled, setEnabled] = useState(!!product.book_to_receive_enabled);
  const [title, setTitle] = useState(product.book_to_receive_title || '');
  const [bufferDays, setBufferDays] = useState(product.book_to_receive_buffer_days ?? 0);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const saveSettings = async (overrideEnabled?: boolean) => {
    const isEnabled = overrideEnabled !== undefined ? overrideEnabled : enabled;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await apiCall(`${API}/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          price: product.price,
          discount_percent: product.discount_percent,
          receipt_sentence: product.receipt_sentence,
          sumup_checkout_url: product.sumup_checkout_url,
          checkout_info_enabled: product.checkout_info_enabled,
          book_to_receive_enabled: isEnabled,
          book_to_receive_title: title,
          book_to_receive_buffer_days: bufferDays,
        }),
      });
      if (res.ok) {
        setSaveMsg('Saved');
        onRefresh();
        setTimeout(() => setSaveMsg(''), 2000);
      }
    } catch {}
    setSaving(false);
  };

  const toggleEnabled = async () => {
    setToggling(true);
    const next = !enabled;
    setEnabled(next);
    await saveSettings(next);
    setToggling(false);
  };

  return (
    <div className="space-y-3">
      <button onClick={toggleEnabled} disabled={toggling}
        className={`w-full flex items-center justify-between py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${enabled ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
        <div className="flex items-center gap-2">
          <Calendar size={15} className={enabled ? 'text-amber-600' : 'text-stone-400'} />
          Book to Receive
        </div>
        <span className={`text-[10px] ${enabled ? 'text-amber-600' : 'text-stone-400'}`}>
          {enabled ? 'On' : 'Off'}
        </span>
      </button>

      {enabled && (
        <div className="border border-amber-100 rounded-xl p-4 space-y-3 bg-amber-50/30">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Buyers must book a date & time before checkout</p>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Booking Step Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
              placeholder="e.g. Book a Receiving Time" />
            <p className="text-[10px] text-stone-400 mt-1">This title appears on the product page above the date picker.</p>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1">Buffer Working Days</label>
            <input
              type="number" min={0} step={1}
              value={bufferDays}
              onChange={e => setBufferDays(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
              placeholder="0" />
            <p className="text-[10px] text-stone-400 mt-1">Buyers can only book from this many working days in the future. Set to 0 for no restriction.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => saveSettings()} disabled={saving}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

const PageManager: React.FC<{ product: Product; onRefresh: () => void }> = ({ product, onRefresh }) => {
  const [slugInput, setSlugInput] = useState('');
  const [showSlugInput, setShowSlugInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const makeSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const handleMakePage = async () => {
    if (!slugInput.trim()) return setError('Please enter a URL name');
    const slug = makeSlug(slugInput.trim());
    if (!slug) return setError('Invalid URL name');

    setSaving(true);
    setError('');
    try {
      const res = await apiCall(`${API}/products/${product.id}/set-slug`, {
        method: 'PUT',
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create page');
      } else {
        setShowSlugInput(false);
        setSlugInput('');
        onRefresh();
      }
    } catch { }
    setSaving(false);
  };

  const toggleHeader = async () => {
    if (!product.slug) {
      alert('Please create a page first before adding to header.');
      return;
    }
    try {
      await apiCall(`${API}/products/${product.id}/header`, {
        method: 'PUT',
        body: JSON.stringify({ show_in_header: !product.show_in_header }),
      });
      onRefresh();
    } catch { }
  };

  const toggleOutOfStock = async () => {
    try {
      await apiCall(`${API}/products/${product.id}/out-of-stock`, {
        method: 'PATCH',
        body: JSON.stringify({ is_out_of_stock: !product.is_out_of_stock }),
      });
      onRefresh();
    } catch { }
  };

  const toggleShowInProductsPage = async () => {
    try {
      await apiCall(`${API}/products/${product.id}/show-in-products-page`, {
        method: 'PATCH',
        body: JSON.stringify({ show_in_products_page: !product.show_in_products_page }),
      });
      onRefresh();
    } catch { }
  };

  const pageUrl = product.slug ? `/${product.slug}` : null;

  return (
    <div className="space-y-3">
      {product.slug ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Globe size={14} className="text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-green-700 text-sm font-medium truncate block">{pageUrl}</span>
            <span className="text-green-500 text-[10px]">Public page active</span>
          </div>
          <a href={pageUrl!} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700">
            <ExternalLink size={10} /> View
          </a>
        </div>
      ) : (
        <div className="p-3 bg-stone-50 border border-dashed border-stone-300 rounded-lg text-stone-500 text-sm text-center">
          No public page yet
        </div>
      )}

      {!showSlugInput ? (
        <button onClick={() => { setShowSlugInput(true); setSlugInput(product.slug || ''); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-stone-200 text-stone-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-50">
          <Globe size={14} /> {product.slug ? 'Change Page URL' : 'Make a Page'}
        </button>
      ) : (
        <div className="space-y-2">
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex items-center gap-1">
            <span className="text-stone-400 text-sm shrink-0">aimal.fi/</span>
            <input
              value={slugInput}
              onChange={e => { setSlugInput(e.target.value); setError(''); }}
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
              placeholder="my-product" />
          </div>
          {slugInput && (
            <p className="text-[10px] text-stone-400">Will create: /{makeSlug(slugInput)}</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setShowSlugInput(false); setError(''); }} className="flex-1 py-2 border border-stone-200 text-stone-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-50">Cancel</button>
            <button onClick={handleMakePage} disabled={saving}
              className="flex-1 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Page'}
            </button>
          </div>
        </div>
      )}

      <button onClick={toggleHeader}
        className={`w-full flex items-center justify-between py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${product.show_in_header ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
        <div className="flex items-center gap-2">
          {product.show_in_header ? <ToggleRight size={16} className="text-amber-600" /> : <ToggleLeft size={16} />}
          Add to Header
        </div>
        <span className={`text-[10px] ${product.show_in_header ? 'text-amber-600' : 'text-stone-400'}`}>
          {product.show_in_header ? 'Visible' : 'Hidden'}
        </span>
      </button>

      <button onClick={toggleShowInProductsPage}
        className={`w-full flex items-center justify-between py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${product.show_in_products_page !== false ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
        <div className="flex items-center gap-2">
          {product.show_in_products_page !== false ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
          Show in Products Page
        </div>
        <span className={`text-[10px] ${product.show_in_products_page !== false ? 'text-green-600' : 'text-stone-400'}`}>
          {product.show_in_products_page !== false ? 'Shown' : 'Hidden'}
        </span>
      </button>

      <button onClick={toggleOutOfStock}
        className={`w-full flex items-center justify-between py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${product.is_out_of_stock ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
        <div className="flex items-center gap-2">
          {product.is_out_of_stock ? <ToggleRight size={16} className="text-red-500" /> : <ToggleLeft size={16} />}
          Out of Stock
        </div>
        <span className={`text-[10px] ${product.is_out_of_stock ? 'text-red-500' : 'text-stone-400'}`}>
          {product.is_out_of_stock ? 'Out of Stock' : 'In Stock'}
        </span>
      </button>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product; onRefresh: () => void; onDelete: (id: number) => void }> = ({ product, onRefresh, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const mainImage = product.images.find(img => img.is_main) || product.images[0];
  const finalPrice = Number(product.discount_percent) > 0
    ? Number(product.price) * (1 - Number(product.discount_percent) / 100)
    : Number(product.price);

  const togglePublish = async () => {
    setPublishing(true);
    try {
      await apiCall(`${API}/products/${product.id}/publish`, {
        method: 'PUT',
        body: JSON.stringify({ is_published: !product.is_published }),
      });
      onRefresh();
    } catch { }
    setPublishing(false);
  };

  const [duplicateMsg, setDuplicateMsg] = useState('');

  const duplicateProduct = async () => {
    setDuplicating(true);
    try {
      const res = await apiCall(`${API}/products/${product.id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        setDuplicateMsg('Duplicated!');
        setTimeout(() => setDuplicateMsg(''), 2500);
        onRefresh();
      } else {
        const d = await res.json();
        setDuplicateMsg(d.error || 'Failed to duplicate');
        setTimeout(() => setDuplicateMsg(''), 3000);
      }
    } catch (err: any) {
      setDuplicateMsg(err?.message || 'Failed to duplicate');
      setTimeout(() => setDuplicateMsg(''), 3000);
    }
    setDuplicating(false);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="p-4 flex items-start gap-4">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
          {mainImage ? (
            <img src={mainImage.image_data} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300">
              <Package size={24} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-serif text-lg text-stone-900 leading-tight">{product.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                {product.discount_percent > 0 ? (
                  <>
                    <span className="font-bold text-stone-900">€{finalPrice.toFixed(2)}</span>
                    <span className="text-stone-400 line-through text-sm">€{Number(product.price).toFixed(2)}</span>
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">-{product.discount_percent}%</span>
                  </>
                ) : (
                  <span className="font-bold text-stone-900">€{Number(product.price).toFixed(2)}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {product.is_published ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Published</span>
                ) : (
                  <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-bold">Draft</span>
                )}
                {product.slug && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">/{product.slug}</span>
                )}
                {product.show_in_header && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">In Header</span>
                )}
                {product.is_out_of_stock && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Out of Stock</span>
                )}
                {product.show_in_products_page === false && (
                  <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-bold">Hidden from List</span>
                )}
                {product.available_keys > 0 && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{product.available_keys} keys</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {duplicateMsg && (
                <span className={`text-[10px] font-medium whitespace-nowrap ${duplicateMsg === 'Duplicated!' ? 'text-green-600' : 'text-red-500'}`}>
                  {duplicateMsg}
                </span>
              )}
              <button onClick={duplicateProduct} disabled={duplicating} title="Duplicate product"
                className="flex items-center gap-1 px-2 py-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 disabled:opacity-40 text-[10px] font-bold uppercase tracking-wider">
                <Copy size={13} /> {duplicating ? '...' : 'Duplicate'}
              </button>
              <button onClick={() => { setEditing(!editing); setExpanded(true); }}
                className="p-2 hover:bg-stone-100 rounded-lg text-stone-500 hover:text-stone-900">
                <Edit size={15} />
              </button>
              <button onClick={() => { if (confirm(`Delete "${product.title}"?`)) onDelete(product.id); }}
                className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600">
                <Trash2 size={15} />
              </button>
              <button onClick={() => setExpanded(!expanded)}
                className="p-2 hover:bg-stone-100 rounded-lg text-stone-500">
                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-100">
          {editing ? (
            <div className="p-4 space-y-6">
              <div>
                <h4 className="font-bold text-sm text-stone-700 mb-4 uppercase tracking-widest">Edit Product</h4>
                <ProductForm product={product} onSave={() => { setEditing(false); onRefresh(); }} onCancel={() => setEditing(false)} />
              </div>

              <div className="border-t border-stone-100 pt-5">
                <h4 className="font-bold text-sm text-stone-700 mb-4 uppercase tracking-widest">Images</h4>
                <ImageManager product={product} onRefresh={onRefresh} />
              </div>

              <div className="border-t border-stone-100 pt-5">
                <h4 className="font-bold text-sm text-stone-700 mb-4 uppercase tracking-widest">Page & Header</h4>
                <PageManager product={product} onRefresh={onRefresh} />
              </div>

              <div className="border-t border-stone-100 pt-5">
                <h4 className="font-bold text-sm text-stone-700 mb-4 uppercase tracking-widest">Checkout Info</h4>
                <CheckoutFieldsManager product={product} onRefresh={onRefresh} />
              </div>

              <div className="border-t border-stone-100 pt-5">
                <h4 className="font-bold text-sm text-stone-700 mb-4 uppercase tracking-widest">Book to Receive</h4>
                <BookToReceiveManager product={product} onRefresh={onRefresh} />
              </div>

              <div className="border-t border-stone-100 pt-5">
                <h4 className="font-bold text-sm text-stone-700 mb-3 uppercase tracking-widest">Publish</h4>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 p-3 rounded-lg border text-sm ${product.is_published ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-50 border-stone-200 text-stone-500'}`}>
                    {product.is_published
                      ? 'This product is live and visible on the Products page.'
                      : 'This product is a draft — only visible to you via direct URL.'}
                  </div>
                  <button
                    onClick={togglePublish}
                    disabled={publishing}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 ${product.is_published
                      ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                    {publishing ? '...' : product.is_published ? <><EyeOff size={13} /> Unpublish</> : <><Send size={13} /> Publish</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <h4 className="font-bold text-sm text-stone-700 mb-4 uppercase tracking-widest">Access Keys</h4>
              <AccessKeyManager product={product} onRefresh={onRefresh} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(`${API}/products/admin/all`);
      const data = await res.json();
      setProducts(data);
    } catch { }
    setLoading(false);
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const res = await apiCall(`${API}/products/admin/all`);
      const data = await res.json();
      setProducts(data);
    } catch { }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const deleteProduct = async (id: number) => {
    try {
      await apiCall(`${API}/products/${id}`, { method: 'DELETE' });
      loadProducts();
    } catch { }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Products</h2>
          <p className="text-stone-500 text-sm mt-1">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800">
          <Plus size={14} /> New Product
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
          <h3 className="font-serif text-xl text-stone-900 mb-4">Create Product</h3>
          <ProductForm onSave={() => { setShowCreate(false); loadProducts(); }} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-500">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
          <Package size={40} className="mx-auto text-stone-300 mb-4" />
          <h3 className="font-serif text-xl text-stone-700 mb-2">No products yet</h3>
          <p className="text-stone-400 text-sm">Create your first product to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onRefresh={refreshProducts} onDelete={deleteProduct} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsView;
