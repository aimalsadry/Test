import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Key, Calendar, Euro, AlertCircle, Printer, Clock } from 'lucide-react';

interface Purchase {
  id: number;
  buyer_name: string;
  buyer_email: string;
  amount_paid: number;
  status: string;
  created_at: string;
}

interface Product {
  title: string;
  receipt_sentence: string;
  description: string;
}

interface ReceiptData {
  purchase: Purchase;
  product: Product;
  accessKey: string | null;
  pendingKeyDelivery?: boolean;
}

const ReceiptPageComponent: React.FC<{ purchaseId: string; onNavigateHome: () => void }> = ({ purchaseId, onNavigateHome }) => {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [manualReview, setManualReview] = useState(false);

  const receiptToken = new URLSearchParams(window.location.search).get('token') || '';

  const load = useCallback(async () => {
    if (!purchaseId) {
      setError('No purchase ID provided.');
      setLoading(false);
      return;
    }

    if (!receiptToken) {
      setError('Invalid receipt link. Please use the link provided after payment.');
      setLoading(false);
      return;
    }

    try {
      const confirmRes = await fetch(`/api/products/purchases/${purchaseId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_token: receiptToken }),
      });

      if (confirmRes.ok) {
        const confirmedData = await confirmRes.json();
        setData(confirmedData);
      } else if (confirmRes.status === 402) {
        const errData = await confirmRes.json().catch(() => ({}));
        if (errData.pendingManualReview) {
          setManualReview(true);
        } else {
          setPendingMessage(errData.error || 'Payment not yet confirmed. Please check back shortly.');
          setPending(true);
        }
      } else if (confirmRes.status === 404) {
        setError('Receipt not found. If you completed payment, please contact us.');
      } else {
        const errData = await confirmRes.json().catch(() => ({}));
        setError(errData.error || 'Could not load receipt. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }, [purchaseId, receiptToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-stone-400">Loading receipt...</div>
      </main>
    );
  }

  if (pending) {
    return (
      <main className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 bg-amber-900/40 rounded-full flex items-center justify-center mb-6">
          <Clock size={28} className="text-amber-400" />
        </div>
        <h1 className="font-serif text-3xl text-white mb-3">Payment Pending</h1>
        <p className="text-stone-400 mb-8 max-w-sm">{pendingMessage}</p>
        <button onClick={() => { setLoading(true); setPending(false); load(); }}
          className="px-8 py-3 bg-amber-600 text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-amber-500 transition-all mb-3">
          Check Again
        </button>
        <button onClick={onNavigateHome}
          className="px-8 py-3 border border-stone-700 text-stone-400 rounded-full font-bold uppercase tracking-widest text-xs hover:border-stone-500 hover:text-stone-200 transition-all">
          Go Home
        </button>
      </main>
    );
  }

  if (manualReview) {
    return (
      <main className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mb-6">
          <Clock size={28} className="text-stone-400" />
        </div>
        <h1 className="font-serif text-3xl text-white mb-3">Payment Received</h1>
        <p className="text-stone-400 mb-2 max-w-sm">Thank you for your purchase. Your payment is being reviewed manually.</p>
        <p className="text-stone-500 text-sm mb-8 max-w-sm">Your access key will be delivered by email once your payment has been confirmed. This typically takes 1–2 business days.</p>
        <button onClick={onNavigateHome}
          className="px-8 py-3 border border-stone-700 text-stone-400 rounded-full font-bold uppercase tracking-widest text-xs hover:border-stone-500 hover:text-stone-200 transition-all">
          Go Home
        </button>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 bg-red-900/40 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <h1 className="font-serif text-3xl text-white mb-3">Receipt Not Found</h1>
        <p className="text-stone-400 mb-8 max-w-sm">{error || 'Something went wrong.'}</p>
        <button onClick={onNavigateHome}
          className="px-8 py-3 bg-white text-stone-900 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-100 transition-all">
          Go Home
        </button>
      </main>
    );
  }

  const { purchase, product, accessKey } = data;
  const date = new Date(purchase.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const handlePrint = () => window.print();

  return (
    <main className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-6 py-20 print:bg-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 print:hidden">
          <div className="w-20 h-20 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-700/50">
            <CheckCircle2 size={36} className="text-green-400" />
          </div>
          <h1 className="font-serif text-3xl text-white mb-2">Payment Successful</h1>
          <p className="text-stone-400 text-sm">Your receipt is below. Keep it safe.</p>
        </div>

        {/* RECEIPT CARD */}
        {/* NOTE: The receipt visual design will be refined per user's reference screenshot.
            Current design uses the site's elegant dark aesthetic as a placeholder. */}
        <div className="bg-stone-900 border border-stone-700 rounded-2xl overflow-hidden print:bg-white print:border-stone-200 print:rounded-none">
          <div className="bg-stone-800 px-8 py-6 border-b border-stone-700 print:bg-stone-50 print:border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-stone-400 text-[10px] uppercase tracking-widest print:text-stone-500">Receipt</p>
                <p className="text-white font-serif text-xl mt-0.5 print:text-stone-900">Aimal.fi Advisory</p>
              </div>
              <div className="text-right">
                <p className="text-stone-400 text-[10px] uppercase tracking-widest print:text-stone-500">Order #</p>
                <p className="text-white font-mono text-sm print:text-stone-900">{purchase.id.toString().padStart(6, '0')}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-5">
            <div>
              <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-1 print:text-stone-400">Product</p>
              <p className="text-white font-serif text-xl print:text-stone-900">{product.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1 print:text-stone-400">
                  <Calendar size={10} /> Date
                </p>
                <p className="text-stone-300 text-sm print:text-stone-700">{date}</p>
              </div>
              <div>
                <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1 print:text-stone-400">
                  <Euro size={10} /> Amount
                </p>
                <p className="text-stone-300 text-sm font-bold print:text-stone-700">€{Number(purchase.amount_paid).toFixed(2)}</p>
              </div>
            </div>

            <div>
              <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-1 print:text-stone-400">Purchased by</p>
              <p className="text-stone-300 text-sm print:text-stone-700">{purchase.buyer_name}</p>
              <p className="text-stone-500 text-xs print:text-stone-400">{purchase.buyer_email}</p>
            </div>

            {product.receipt_sentence && (
              <div className="border-t border-stone-700/50 pt-5 print:border-stone-200">
                <p className="text-stone-400 text-sm italic text-center print:text-stone-600">
                  "{product.receipt_sentence}"
                </p>
              </div>
            )}

            {accessKey && (
              <div className="border-t border-stone-700/50 pt-5 print:border-stone-200">
                <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5 print:text-stone-400">
                  <Key size={10} /> Your Access Key
                </p>
                <div className="bg-stone-800 border border-stone-600 rounded-xl p-4 text-center print:bg-stone-100 print:border-stone-300">
                  <p className="text-white font-mono text-lg tracking-widest break-all print:text-stone-900">
                    {accessKey}
                  </p>
                </div>
                <p className="text-stone-500 text-[10px] text-center mt-2 print:text-stone-400">
                  Keep this key safe. It is unique to your purchase.
                </p>
              </div>
            )}

            {!accessKey && data?.pendingKeyDelivery && (
              <div className="border-t border-stone-700/50 pt-5 print:border-stone-200">
                <div className="bg-stone-800 border border-stone-600 rounded-xl p-4 text-center print:bg-stone-100 print:border-stone-300">
                  <p className="text-stone-400 text-sm print:text-stone-600">
                    Your access key will be delivered to <span className="text-stone-200 print:text-stone-800">{data.purchase.buyer_email}</span> once your payment has been confirmed. This typically takes 1–2 business days.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-8 pb-6">
            <div className="pt-5 border-t border-stone-700/30 print:border-stone-200">
              <p className="text-stone-600 text-[10px] text-center uppercase tracking-widest print:text-stone-400">
                Aimal.fi Advisory · Helsinki, Finland
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 print:hidden">
          <button onClick={onNavigateHome}
            className="flex-1 py-3 border border-stone-700 text-stone-400 rounded-full font-bold uppercase tracking-widest text-xs hover:border-stone-500 hover:text-stone-200 transition-all">
            Back to Site
          </button>
          <button onClick={handlePrint}
            className="flex-1 py-3 bg-white text-stone-900 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-100 transition-all flex items-center justify-center gap-2">
            <Printer size={13} /> Print Receipt
          </button>
        </div>
      </div>
    </main>
  );
};

export default ReceiptPageComponent;
