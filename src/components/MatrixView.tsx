import React, { useState } from 'react';
import { 
  Award, 
  ArrowUpDown, 
  Plus, 
  TrendingDown, 
  Building2, 
  CheckCircle2, 
  Layers
} from 'lucide-react';
import { Product, Supplier } from '../types';
import { formatRupiah, getProductPriceStats } from '../utils/formatters';

interface MatrixViewProps {
  products: Product[];
  suppliers: Supplier[];
  onAddQuote: (product: Product) => void;
  onOpenAddProduct: () => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  products,
  suppliers,
  onAddQuote,
  onOpenAddProduct,
}) => {
  const [filterMultiSupplierOnly, setFilterMultiSupplierOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'savings' | 'name'>('savings');

  // Filter and sort products
  let displayProducts = products.filter((p) => {
    if (filterMultiSupplierOnly) {
      return p.quotes.length >= 2;
    }
    return true;
  });

  displayProducts = [...displayProducts].sort((a, b) => {
    const statsA = getProductPriceStats(a);
    const statsB = getProductPriceStats(b);
    if (sortBy === 'savings') {
      return statsB.difference - statsA.difference;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Matrix Controls & Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Matriks Perbandingan Harga Multi-Supplier
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tabel komparasi langsung seluruh penawaran harga antar supplier untuk setiap produk.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer shadow-2xs">
            <input
              type="checkbox"
              checked={filterMultiSupplierOnly}
              onChange={(e) => setFilterMultiSupplierOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            <span className="font-medium">Hanya produk &ge; 2 supplier</span>
          </label>

          <button
            onClick={() => setSortBy(sortBy === 'savings' ? 'name' : 'savings')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Urut: {sortBy === 'savings' ? 'Selisih Terbesar' : 'Nama Produk'}</span>
          </button>
        </div>
      </div>

      {/* Responsive Matrix Table */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
              <th className="p-3 sm:p-4 sticky left-0 z-20 bg-slate-100 min-w-[220px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                Nama Produk & Satuan
              </th>
              
              {/* Dynamic Supplier Headers */}
              {suppliers.map((sup) => (
                <th 
                  key={sup.id} 
                  className="p-3 sm:p-4 min-w-[140px] text-center border-l border-slate-200"
                >
                  <div className="font-bold text-slate-900 truncate max-w-[130px] mx-auto" title={sup.name}>
                    {sup.name}
                  </div>
                  {sup.paymentTerms && (
                    <span className="text-[10px] text-slate-500 font-normal block truncate mt-0.5">
                      {sup.paymentTerms}
                    </span>
                  )}
                </th>
              ))}

              <th className="p-3 sm:p-4 min-w-[130px] text-right border-l border-slate-200 bg-emerald-50/60 text-emerald-900 font-bold">
                Harga Termurah
              </th>
              <th className="p-3 sm:p-4 min-w-[120px] text-right border-l border-slate-200 text-slate-700 font-bold">
                Selisih (Hemat)
              </th>
              <th className="p-3 sm:p-4 min-w-[100px] text-center border-l border-slate-200 text-slate-700 font-bold">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-700">
            {displayProducts.length === 0 ? (
              <tr>
                <td colSpan={suppliers.length + 4} className="p-8 text-center text-slate-400">
                  Tidak ada data produk yang memenuhi kriteria filter.
                </td>
              </tr>
            ) : (
              displayProducts.map((product) => {
                const stats = getProductPriceStats(product);

                return (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Sticky Product Name Column */}
                    <td className="p-3 sm:p-4 sticky left-0 z-10 bg-white hover:bg-slate-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                      <p className="font-bold text-slate-900 leading-snug">
                        {product.name}
                      </p>
                      {product.company && (
                        <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          {product.company}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                        {product.packaging && (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-100">
                            {product.packaging}
                          </span>
                        )}
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-100">
                          {product.packContent || `1 ${product.defaultUnit} = ${product.subUnitCount || 10} ${product.subUnitName || 'lembar'}`}
                        </span>
                      </div>
                    </td>

                    {/* Dynamic Supplier Price Cells */}
                    {suppliers.map((sup) => {
                      // Find quote for this supplier on this product
                      const quote = product.quotes.find(
                        (q) => q.supplierId === sup.id || q.supplierName.toLowerCase() === sup.name.toLowerCase()
                      );

                      if (!quote) {
                        return (
                          <td 
                            key={sup.id} 
                            className="p-3 sm:p-4 text-center border-l border-slate-200 text-slate-300"
                          >
                            -
                          </td>
                        );
                      }

                      const isCheapest = stats.cheapestQuote && stats.cheapestQuote.id === quote.id;
                      const isMostExpensive = stats.expensiveQuote && stats.expensiveQuote.id === quote.id && stats.quoteCount > 1;

                      return (
                        <td 
                          key={sup.id} 
                          className={`p-3 sm:p-4 text-center border-l border-slate-200 transition-colors ${
                            isCheapest ? 'bg-emerald-50/70' : isMostExpensive ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span 
                              className={`font-bold text-xs sm:text-sm ${
                                isCheapest 
                                  ? 'text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md' 
                                  : 'text-slate-800'
                              }`}
                            >
                              {formatRupiah(quote.price)}
                            </span>

                            <span className="text-[10px] text-slate-500 mt-0.5">
                              ~{formatRupiah(quote.pricePerSubUnit || Math.round(quote.price / (product.subUnitCount || 10)))}/{product.subUnitName || 'lbr'}
                            </span>

                            {isCheapest && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 mt-0.5">
                                <Award className="w-3 h-3 text-emerald-600" />
                                Termurah
                              </span>
                            )}

                            {!isCheapest && quote.price > stats.minPrice && (
                              <span className="text-[10px] text-rose-600 mt-0.5 font-medium">
                                +{formatRupiah(quote.price - stats.minPrice)}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Best Price Summary */}
                    <td className="p-3 sm:p-4 text-right border-l border-slate-200 bg-emerald-50/30">
                      {stats.cheapestQuote ? (
                        <div>
                          <span className="font-extrabold text-xs sm:text-sm text-emerald-700">
                            {formatRupiah(stats.minPrice)}
                          </span>
                          <span className="block text-[11px] text-slate-600 truncate max-w-[120px] ml-auto font-medium">
                            {stats.cheapestQuote.supplierName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Difference / Savings Column */}
                    <td className="p-3 sm:p-4 text-right border-l border-slate-200">
                      {stats.difference > 0 ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <TrendingDown className="w-3 h-3" />
                            {stats.savingsPercentage}%
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            Hemat {formatRupiah(stats.difference)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Satu harga</span>
                      )}
                    </td>

                    {/* Quick Add Quote Action */}
                    <td className="p-3 sm:p-4 text-center border-l border-slate-200">
                      <button
                        onClick={() => onAddQuote(product)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Tambah penawaran supplier untuk produk ini"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
          <span>Sorotan Hijau = Penawaran harga terbaik (Termurah)</span>
        </div>
        <p>
          Menampilkan {displayProducts.length} dari {products.length} produk
        </p>
      </div>
    </div>
  );
};
