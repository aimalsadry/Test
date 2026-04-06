import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Download, Inbox, ArrowUpDown } from 'lucide-react';

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

type SubmissionStatus = 'new' | 'contacted' | 'closed';
type SortOrder = 'newest' | 'oldest';

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; chip: string; dot: string }> = {
  new:       { label: 'New',       chip: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-500' },
  contacted: { label: 'Contacted', chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  closed:    { label: 'Closed',    chip: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
};

const StatusChip: React.FC<{
  status: SubmissionStatus;
  onChange: (s: SubmissionStatus) => void;
  saving?: boolean;
}> = ({ status, onChange, saving }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-opacity ${cfg.chip} ${saving ? 'opacity-50' : 'hover:opacity-80'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-stone-200 py-1 min-w-[110px]">
          {(Object.keys(STATUS_CONFIG) as SubmissionStatus[]).map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-stone-50 transition-colors ${s === status ? 'font-bold' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FilterBar: React.FC<{
  statusFilter: SubmissionStatus | 'all';
  sortOrder: SortOrder;
  onStatusFilter: (s: SubmissionStatus | 'all') => void;
  onSortOrder: (s: SortOrder) => void;
  counts: Record<SubmissionStatus | 'all', number>;
}> = ({ statusFilter, sortOrder, onStatusFilter, onSortOrder, counts }) => (
  <div className="flex items-center gap-2 flex-wrap mb-3">
    <div className="flex items-center gap-1 flex-wrap">
      {(['all', 'new', 'contacted', 'closed'] as const).map(s => {
        const active = statusFilter === s;
        const dot = s !== 'all' ? STATUS_CONFIG[s].dot : null;
        return (
          <button
            key={s}
            onClick={() => onStatusFilter(s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
              active
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
            }`}
          >
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : dot}`} />}
            {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            <span className={`ml-0.5 ${active ? 'text-stone-300' : 'text-stone-400'}`}>{counts[s]}</span>
          </button>
        );
      })}
    </div>
    <button
      onClick={() => onSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
      className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-stone-200 text-stone-500 hover:border-stone-400 transition-colors"
    >
      <ArrowUpDown size={10} />
      {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
    </button>
  </div>
);

interface InvestmentSubmission {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  y_tunnus: string;
  role: string;
  message: string;
  status: SubmissionStatus;
  created_at: string;
}

interface SubmissionFile {
  id: number;
  field_label: string;
  file_name: string;
}

interface CustomPageSubmission {
  id: number;
  form_data: Record<string, string>;
  files: SubmissionFile[];
  status: SubmissionStatus;
  created_at: string;
}

interface CustomPageSource {
  id: number;
  title: string;
  slug: string | null;
  is_published: boolean;
  submission_count: number;
  new_submission_count: number;
  form_field_count: number;
  last_submission_at: string | null;
}

const InvestmentSubmissionsPanel: React.FC<{ onNewCountChange?: (n: number) => void }> = ({ onNewCountChange }) => {
  const [submissions, setSubmissions] = useState<InvestmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  useEffect(() => {
    apiCall(`${API}/investment/submissions`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSubmissions(data);
          const newCount = data.filter((s: InvestmentSubmission) => (s.status || 'new') === 'new').length;
          onNewCountChange?.(newCount);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (sub: InvestmentSubmission, status: SubmissionStatus) => {
    setSavingId(sub.id);
    try {
      const res = await apiCall(`${API}/investment/submissions/${sub.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSubmissions(prev => {
          const updated = prev.map(s => s.id === sub.id ? { ...s, status } : s);
          const newCount = updated.filter(s => (s.status || 'new') === 'new').length;
          onNewCountChange?.(newCount);
          return updated;
        });
      }
    } catch {}
    setSavingId(null);
  };

  const normalised = submissions.map(s => ({ ...s, status: (s.status || 'new') as SubmissionStatus }));

  const counts: Record<SubmissionStatus | 'all', number> = {
    all: normalised.length,
    new: normalised.filter(s => s.status === 'new').length,
    contacted: normalised.filter(s => s.status === 'contacted').length,
    closed: normalised.filter(s => s.status === 'closed').length,
  };

  const visible = normalised
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });

  if (loading) return <div className="py-8 text-center text-stone-400 text-sm">Loading...</div>;

  if (submissions.length === 0) {
    return (
      <div className="py-10 text-center">
        <Inbox size={32} className="mx-auto text-stone-200 mb-3" />
        <p className="text-stone-400 text-sm">No submissions yet.</p>
        <p className="text-stone-300 text-xs mt-1">Submissions made going forward will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <FilterBar
        statusFilter={statusFilter}
        sortOrder={sortOrder}
        onStatusFilter={setStatusFilter}
        onSortOrder={setSortOrder}
        counts={counts}
      />
      {visible.length === 0 ? (
        <div className="py-8 text-center text-stone-300 text-sm">No submissions match this filter.</div>
      ) : (
        <div className="space-y-2">
          {visible.map(sub => (
            <div key={sub.id} className="rounded-lg border border-stone-100 overflow-hidden">
              <div
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-stone-50 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <StatusChip
                    status={sub.status}
                    onChange={s => handleStatusChange(sub, s)}
                    saving={savingId === sub.id}
                  />
                  <span className="text-xs text-stone-400 shrink-0">
                    {new Date(sub.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${sub.role === 'Investor' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {sub.role}
                  </span>
                  <span className="text-sm text-stone-700 truncate">
                    {sub.first_name} {sub.last_name}
                    {sub.email && <span className="text-stone-400 ml-2">· {sub.email}</span>}
                  </span>
                </div>
                {expandedId === sub.id
                  ? <ChevronUp size={14} className="text-stone-400 shrink-0 ml-2" />
                  : <ChevronDown size={14} className="text-stone-400 shrink-0 ml-2" />}
              </div>
              {expandedId === sub.id && (
                <div className="px-3 pb-3 border-t border-stone-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">First Name</span>
                      <span className="text-sm text-stone-800">{sub.first_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Last Name</span>
                      <span className="text-sm text-stone-800">{sub.last_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Email</span>
                      <span className="text-sm text-stone-800 break-all">{sub.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Phone</span>
                      <span className="text-sm text-stone-800">{sub.phone || '—'}</span>
                    </div>
                    {sub.y_tunnus && (
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Y-Tunnus</span>
                        <span className="text-sm text-stone-800">{sub.y_tunnus}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Role</span>
                      <span className={`text-sm font-bold ${sub.role === 'Investor' ? 'text-amber-700' : 'text-blue-700'}`}>{sub.role || '—'}</span>
                    </div>
                    {sub.message && (
                      <div className="col-span-full">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">Message / Idea</span>
                        <p className="text-sm text-stone-800 bg-stone-50 p-2 rounded-lg mt-1 whitespace-pre-wrap">{sub.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomPageSubmissionsPanel: React.FC<{ page: CustomPageSource; onNewCountChange?: (n: number) => void }> = ({ page, onNewCountChange }) => {
  const [submissions, setSubmissions] = useState<CustomPageSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  useEffect(() => {
    apiCall(`${API}/pages/${page.id}/submissions`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSubmissions(data);
          const newCount = data.filter((s: CustomPageSubmission) => (s.status || 'new') === 'new').length;
          onNewCountChange?.(newCount);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page.id]);

  const handleStatusChange = async (sub: CustomPageSubmission, status: SubmissionStatus) => {
    setSavingId(sub.id);
    try {
      const res = await apiCall(`${API}/pages/${page.id}/submissions/${sub.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSubmissions(prev => {
          const updated = prev.map(s => s.id === sub.id ? { ...s, status } : s);
          const newCount = updated.filter(s => (s.status || 'new') === 'new').length;
          onNewCountChange?.(newCount);
          return updated;
        });
      }
    } catch {}
    setSavingId(null);
  };

  const normalised = submissions.map(s => ({ ...s, status: (s.status || 'new') as SubmissionStatus }));

  const counts: Record<SubmissionStatus | 'all', number> = {
    all: normalised.length,
    new: normalised.filter(s => s.status === 'new').length,
    contacted: normalised.filter(s => s.status === 'contacted').length,
    closed: normalised.filter(s => s.status === 'closed').length,
  };

  const visible = normalised
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });

  if (loading) return <div className="py-8 text-center text-stone-400 text-sm">Loading...</div>;

  if (submissions.length === 0) {
    return (
      <div className="py-10 text-center">
        <Inbox size={32} className="mx-auto text-stone-200 mb-3" />
        <p className="text-stone-400 text-sm">No submissions yet.</p>
      </div>
    );
  }

  return (
    <div>
      <FilterBar
        statusFilter={statusFilter}
        sortOrder={sortOrder}
        onStatusFilter={setStatusFilter}
        onSortOrder={setSortOrder}
        counts={counts}
      />
      {visible.length === 0 ? (
        <div className="py-8 text-center text-stone-300 text-sm">No submissions match this filter.</div>
      ) : (
        <div className="space-y-2">
          {visible.map(sub => (
            <div key={sub.id} className="rounded-lg border border-stone-100 overflow-hidden">
              <div
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-stone-50 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <StatusChip
                    status={sub.status}
                    onChange={s => handleStatusChange(sub, s)}
                    saving={savingId === sub.id}
                  />
                  <span className="text-xs text-stone-400 shrink-0">
                    {new Date(sub.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className="text-sm text-stone-700 truncate">
                    {Object.values(sub.form_data || {}).filter(Boolean).slice(0, 2).join(' · ') || 'Submission'}
                  </span>
                  {sub.files && sub.files.length > 0 && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium shrink-0">
                      {sub.files.length} file{sub.files.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {expandedId === sub.id
                  ? <ChevronUp size={14} className="text-stone-400 shrink-0 ml-2" />
                  : <ChevronDown size={14} className="text-stone-400 shrink-0 ml-2" />}
              </div>
              {expandedId === sub.id && (
                <div className="px-3 pb-3 border-t border-stone-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {Object.entries(sub.form_data || {}).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">{key}</span>
                        <span className="text-sm text-stone-800 break-all">{val || '—'}</span>
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
  );
};

const FormSourceCard: React.FC<{
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  submissionCount: number;
  newCount?: number;
  lastSubmission?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, badge, badgeColor = 'bg-stone-100 text-stone-500', submissionCount, newCount, lastSubmission, children }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-5 flex items-center justify-between gap-4 hover:bg-stone-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
            <Inbox size={18} className="text-stone-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-stone-900">{title}</span>
              {badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
              )}
              {!!newCount && newCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                  {newCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-stone-400">{subtitle}</span>
              {lastSubmission && (
                <span className="text-xs text-stone-300">
                  Last: {new Date(lastSubmission).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold text-stone-900">{submissionCount}</div>
            <div className="text-[10px] text-stone-400 uppercase tracking-widest">Submission{submissionCount !== 1 ? 's' : ''}</div>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-stone-400" />
            : <ChevronDown size={16} className="text-stone-400" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-stone-100 p-4">
          {children}
        </div>
      )}
    </div>
  );
};

const AdminForms: React.FC = () => {
  const [investmentSubs, setInvestmentSubs] = useState<InvestmentSubmission[]>([]);
  const [customPages, setCustomPages] = useState<CustomPageSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [investmentNewCount, setInvestmentNewCount] = useState(0);
  const [customNewCounts, setCustomNewCounts] = useState<Record<number, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, pagesRes] = await Promise.allSettled([
        apiCall(`${API}/investment/submissions`).then(r => r.json()),
        apiCall(`${API}/pages/admin/all`).then(r => r.json()),
      ]);

      if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
        const subs = invRes.value as InvestmentSubmission[];
        setInvestmentSubs(subs);
        setInvestmentNewCount(subs.filter(s => (s.status || 'new') === 'new').length);
      }
      if (pagesRes.status === 'fulfilled' && Array.isArray(pagesRes.value)) {
        const withForms = pagesRes.value.filter((p: CustomPageSource) => Number(p.form_field_count) > 0);
        setCustomPages(withForms);
        const initialCounts: Record<number, number> = {};
        for (const p of withForms) {
          initialCounts[p.id] = Number(p.new_submission_count) || 0;
        }
        setCustomNewCounts(initialCounts);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const lastInvestmentSub = investmentSubs[0]?.created_at;

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="text-stone-400 text-sm">Loading forms...</div>
      </div>
    );
  }

  const totalSources = 1 + customPages.length;
  const totalSubmissions = investmentSubs.length + customPages.reduce((acc, p) => acc + Number(p.submission_count), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-stone-900">Form Submissions</h2>
          <p className="text-stone-500 text-sm mt-1">
            {totalSources} form source{totalSources !== 1 ? 's' : ''} · {totalSubmissions} total submission{totalSubmissions !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <FormSourceCard
          title="Investment Form"
          subtitle="Investment page — Investor & Entrepreneur applications"
          badge="Built-in"
          badgeColor="bg-amber-50 text-amber-700"
          submissionCount={investmentSubs.length}
          newCount={investmentNewCount}
          lastSubmission={lastInvestmentSub}
        >
          <InvestmentSubmissionsPanel onNewCountChange={setInvestmentNewCount} />
        </FormSourceCard>

        {customPages.map(page => (
          <FormSourceCard
            key={page.id}
            title={page.title}
            subtitle={page.slug ? `/more/${page.slug}` : 'No URL set'}
            badge={page.is_published ? 'Published' : 'Draft'}
            badgeColor={page.is_published ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}
            submissionCount={Number(page.submission_count)}
            newCount={customNewCounts[page.id]}
            lastSubmission={page.last_submission_at ?? undefined}
          >
            <CustomPageSubmissionsPanel
              page={page}
              onNewCountChange={n => setCustomNewCounts(prev => ({ ...prev, [page.id]: n }))}
            />
          </FormSourceCard>
        ))}
      </div>

      {customPages.length === 0 && (
        <p className="text-stone-400 text-sm text-center py-2">
          Custom pages with forms will appear here once created in the "New Page" tab.
        </p>
      )}
    </div>
  );
};

export default AdminForms;
