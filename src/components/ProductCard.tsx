import React, { useState } from 'react';
import { 
  Award, 
  TrendingDown, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  ShoppingCart, 
  Clock, 
  Boxes, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Building2,
  Layers,
  PackageCheck,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Product, SupplierQuote, AppSettings, DEFAULT_APP_SETTINGS } from '../types';
import { formatRupiah, getProductPriceStats, calculateSellingPrice } from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  settings?: AppSettings;
  onAddQuote: (product: Product) => void;
  onEditQuote: (product: Product, quote: SupplierQuote) => void;
  onDeleteQuote: (productId: string, quoteId: string) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onSimulateOrder: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  settings = DEFAULT_APP_SETTINGS,
  onAddQuote,
  onEditQuote,
  onDeleteQuote,
  onEditProduct,
  onDeleteProduct,
  onSimulateOrder,
}) => {
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const stats = getProductPriceStats(product);
  const quotesSorted = [...product.quotes].sort((a, b) => a.price - b.price);
  
  // Decide how many quotes to show collapsed vs expanded
  const displayedQuotes = showAllQuotes ? quotesSorted : quotesSorted.slice(0, 3);
  const hasMoreQuotes = quotesSorted.length > 3;

  const subCount = product.subUnitCount || 10;
  const subName = product.subUnitName || 'lembar';

  const cheapestSelling = stats.cheapestQuote 
    ? calculateSellingPrice(stats.cheapestQuote.price, settings)
    : null;

  return (
    <div 
      id={`product-card-${product.id}`}
      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden"
    >
      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {product.category || 'Umum'}
              </span>
              {product.sku && (
                <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                  {product.sku}
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {product.name}
            </h3>

            {/* Company / Pabrik Produk */}
            {product.company && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{product.company}</span>
              </div>
            )}

            {/* Kemasan & Isi Kemasan Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {product.packaging && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[11px] font-medium border border-blue-200/70">
                  <Layers className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>Kemasan: <strong>{product.packaging}</strong></span>
                </div>
              )}

              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200/70">
                <PackageCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Isi: <strong>{product.packContent || `1 ${product.defaultUnit || 'Box'} = ${subCount} ${subName}`}</strong></span>
              </div>
            </div>

            {product.genericName && (
              <p className="text-[11px] text-slate-500 mt-1.5 italic">
                Zat Aktif: {product.genericName}
              </p>
            )}
          </div>

          {/* Action Menu (Desktop / Touch) */}
          <div className="relative shrink-0">
            <button
              id={`btn-menu-${product.id}`}
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Pilihan Produk"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActionMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowActionMenu(false)} 
                />
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 text-xs">
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      onEditProduct(product);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Data Produk</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      onAddQuote(product);
                    }}
                    className="w-full text-left px-3 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tambah Penawaran</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      onDeleteProduct(product.id);
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Produk</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Highlight Best Deal Section */}
        {stats.cheapestQuote && cheapestSelling ? (
          <div className="mt-3.5 p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200/90 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    <Award className="w-3 h-3 text-emerald-700" />
                    Supplier Termurah
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {stats.cheapestQuote.supplierName}
                  </span>
                </div>
                
                {/* Modal Beli */}
                <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-slate-500 font-semibold">Modal Beli:</span>
                  <span className="text-base sm:text-lg font-bold text-slate-800">
                    {formatRupiah(stats.cheapestQuote.price)}
                  </span>
                  <span className="text-xs text-slate-500">
                    / {stats.cheapestQuote.unit || product.defaultUnit}
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    ~{formatRupiah(stats.cheapestQuote.pricePerSubUnit || Math.round(stats.cheapestQuote.price / subCount))} / {subName}
                  </span>
                </div>
              </div>

              {stats.difference > 0 && (
                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-full">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span>Hemat {stats.savingsPercentage}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Selisih {formatRupiah(stats.difference)}
                  </p>
                </div>
              )}
            </div>

            {/* Rekomendasi Harga Jual (+ Margin) */}
            <div className="mt-2.5 pt-2.5 border-t border-emerald-200/70 flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 bg-white/90 p-2.5 rounded-lg border border-emerald-100">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-700" />
                    Harga Jual (+{settings.marginPercent}% Margin):
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                  <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                    {formatRupiah(cheapestSelling.sellingPrice)}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    / {stats.cheapestQuote.unit || product.defaultUnit}
                  </span>
                  <span className="text-[11px] text-emerald-800 bg-emerald-100/90 font-bold px-1.5 py-0.5 rounded">
                    ~{formatRupiah(Math.round(cheapestSelling.sellingPrice / subCount))} / {subName}
                  </span>
                </div>
              </div>

              <div className="text-left xs:text-right text-[11px] shrink-0">
                <span className="text-slate-600">Estimasi Laba: </span>
                <span className="font-extrabold text-emerald-700">+{formatRupiah(cheapestSelling.profitPerUnit)}</span>
                <p className="text-[10px] text-slate-400">
                  {settings.ppnEnabled ? `(PPN ${settings.ppnPercent}% aktif)` : '(Non-PPN)'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Belum ada penawaran harga supplier untuk produk ini.</span>
          </div>
        )}
      </div>

      {/* Supplier Comparison List */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Perbandingan Supplier ({quotesSorted.length})
            </span>
            {quotesSorted.length > 1 && (
              <span className="text-[11px] text-slate-400">
                Rata-rata: {formatRupiah(stats.avgPrice)}
              </span>
            )}
          </div>

          {quotesSorted.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-400">
                Klik tombol di bawah untuk memasukkan penawaran harga supplier pertama.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedQuotes.map((quote, idx) => {
                const isCheapest = idx === 0;
                const isMostExpensive = idx === quotesSorted.length - 1 && quotesSorted.length > 1;
                const priceDiffFromCheapest = quote.price - stats.minPrice;
                const pctFromCheapest = stats.minPrice > 0 
                  ? Math.round((priceDiffFromCheapest / stats.minPrice) * 100) 
                  : 0;

                const lembarPrice = quote.pricePerSubUnit || Math.round(quote.price / subCount);
                const quoteSelling = calculateSellingPrice(quote.price, settings);

                return (
                  <div
                    key={quote.id}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      isCheapest
                        ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {quote.supplierName}
                          </span>
                          {isCheapest && (
                            <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                              Best Deal
                            </span>
                          )}
                          {isMostExpensive && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                              Tertinggi
                            </span>
                          )}
                        </div>

                        {/* Pharma Breakdown: HNA & DISK if entered */}
                        {(quote.hna || quote.discountPercent) ? (
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            {quote.hna && (
                              <span className="text-slate-500">
                                HNA: <span className="font-mono text-slate-700">{formatRupiah(quote.hna)}</span>
                              </span>
                            )}
                            {quote.discountPercent !== undefined && quote.discountPercent > 0 && (
                              <span className="text-emerald-700 font-bold bg-emerald-100/70 px-1 rounded">
                                Diskon {quote.discountPercent}%
                              </span>
                            )}
                          </div>
                        ) : null}

                        {/* Price per sub-unit and +PPN */}
                        <div className="flex items-center gap-2.5 text-[11px] mt-1.5 text-slate-600 flex-wrap">
                          <span className="text-blue-700 font-semibold">
                            {formatRupiah(lembarPrice)} / {subName}
                          </span>
                          <span className="text-slate-300">•</span>
                          {settings.ppnEnabled ? (
                            <span className="text-purple-700 font-medium">
                              +PPN {settings.ppnPercent}%: <strong>{formatRupiah(quoteSelling.costWithPpn)}</strong>
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">
                              Non-PPN
                            </span>
                          )}
                        </div>

                        {/* Extra Quote Details: MOQ, lead time, notes */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                          {quote.moq && (
                            <span className="flex items-center gap-1" title="Minimum Order Quantity">
                              <Boxes className="w-3 h-3 text-slate-400" />
                              Min: {quote.moq} {quote.unit || product.defaultUnit}
                            </span>
                          )}
                          {quote.leadTimeDays !== undefined && (
                            <span className="flex items-center gap-1" title="Estimasi waktu kirim">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {quote.leadTimeDays === 0 ? 'Ready/Same day' : `${quote.leadTimeDays} Hari`}
                            </span>
                          )}
                          {quote.notes && (
                            <span className="text-slate-600 truncate max-w-[180px]" title={quote.notes}>
                              • {quote.notes}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing column with difference */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block font-semibold">MODAL BELI</span>
                        <p className={`font-extrabold text-base ${isCheapest ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {formatRupiah(quote.price)}
                        </p>
                        {!isCheapest && priceDiffFromCheapest > 0 && (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1 py-0.2 rounded inline-block mt-0.5">
                            +{formatRupiah(priceDiffFromCheapest)} ({pctFromCheapest > 0 ? `+${pctFromCheapest}%` : ''})
                          </span>
                        )}
                        {quote.lastUpdated && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {quote.lastUpdated}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Prominent Selling Price Row (+ Margin %) */}
                    <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between flex-wrap gap-1.5 bg-emerald-50/50 -mx-3 -mb-3 px-3 py-2 rounded-b-xl">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-700" />
                          Harga Jual (+{settings.marginPercent}%):
                        </span>
                        <span className="text-xs font-black text-emerald-800 font-mono">
                          {formatRupiah(quoteSelling.sellingPrice)}
                        </span>
                        <span className="text-[10px] text-slate-600 font-medium">
                          (~{formatRupiah(Math.round(quoteSelling.sellingPrice / subCount))}/{subName})
                        </span>
                      </div>

                      <div className="text-[11px] text-emerald-800 font-semibold">
                        Laba: <span className="font-bold text-emerald-700">+{formatRupiah(quoteSelling.profitPerUnit)}</span>
                      </div>
                    </div>

                    {/* Action buttons per quote */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-end gap-2 text-xs">
                      <button
                        onClick={() => onEditQuote(product, quote)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium cursor-pointer transition-colors flex items-center gap-1"
                        title="Ubah harga atau data penawaran"
                      >
                        <Edit className="w-3 h-3 text-slate-500" />
                        <span>Edit Harga</span>
                      </button>
                      <button
                        onClick={() => onDeleteQuote(product.id, quote.id)}
                        className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 font-medium cursor-pointer transition-colors flex items-center gap-1"
                        title="Hapus penawaran dari vendor ini"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {hasMoreQuotes && (
                <button
                  onClick={() => setShowAllQuotes(!showAllQuotes)}
                  className="w-full py-2 text-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  {showAllQuotes ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Tampilkan Lebih Sedikit</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Lihat {quotesSorted.length - 3} Penawaran Lainnya</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
          <button
            id={`btn-add-quote-${product.id}`}
            onClick={() => onAddQuote(product)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer min-h-[42px]"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Supplier</span>
          </button>

          <button
            id={`btn-simulate-${product.id}`}
            onClick={() => onSimulateOrder(product.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded-lg transition-colors cursor-pointer min-h-[42px]"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Simulasi Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};
