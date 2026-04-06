import React, { useState, useEffect } from 'react';
import { ShoppingCart, Tag } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface PublicProduct {
  id: number;
  title: string;
  price: number;
  discount_percent: number;
  slug: string;
  main_image: string | null;
}

interface Props {
  onNavigateToProduct: (slug: string) => void;
  titleText: string;
}

const ProductsListPage: React.FC<Props> = ({ onNavigateToProduct, titleText }) => {
  const { language } = useLanguage();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/public?lang=${language}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProducts(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [language]);

  return (
    <main className="min-h-screen pt-28 pb-20 animate-fade-in">
      <div className="container mx-auto px-6 max-w-6xl">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-[4/3] bg-stone-100" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-stone-100 rounded w-3/4" />
                  <div className="h-4 bg-stone-100 rounded w-1/3" />
                  <div className="h-10 bg-stone-100 rounded-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h2 className="font-serif text-stone-900 mb-6" style={{ fontSize: 'clamp(3rem, 10vw, 7rem)', lineHeight: 1.1 }}>Out of Stock</h2>
            <p className="text-stone-400 text-lg">Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => {
              const price = Number(product.price);
              const discount = Number(product.discount_percent);
              const finalPrice = discount > 0
                ? price * (1 - discount / 100)
                : price;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group cursor-pointer"
                  onClick={() => onNavigateToProduct(product.slug)}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-50">
                    {product.main_image ? (
                      <img
                        src={product.main_image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-200">
                        <ShoppingCart size={48} strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="font-serif text-xl text-stone-900 mb-2 leading-tight">{product.title}</h2>

                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-bold text-stone-900 text-lg">€{finalPrice.toFixed(2)}</span>
                      {product.discount_percent > 0 && (
                        <>
                          <span className="text-stone-400 line-through text-sm">€{Number(product.price).toFixed(2)}</span>
                          <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                            <Tag size={10} /> {product.discount_percent}% off
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      className="w-full py-3 bg-stone-900 text-white rounded-full font-bold uppercase tracking-[0.15em] text-xs hover:bg-stone-800 transition-colors"
                      onClick={e => { e.stopPropagation(); onNavigateToProduct(product.slug); }}
                    >
                      View Product
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default ProductsListPage;
