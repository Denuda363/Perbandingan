import React, { useState } from 'react';
import { 
  Award, 
  TrendingDown, 
  TrendingUp,
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
  Tag,
  Eye,
  Calculator,
  Percent,
  Package
} from 'lucide-react';
import { Product, SupplierQuote, AppSettings, DEFAULT_APP_SETTINGS } from '../types';
import { 
  formatRupiah, 
  getProductPriceStats, 
  calculateSellingPrice,
  normalizeProductUnits,
  isProductMultiUnit,
  getProductUnitConversions,
  formatProductUnitSummary
} from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  settings?: AppSettings;
  onAddQuote: (product: Product) => void;
  onEditQuote: (product: Product, quote: SupplierQuote) => void;
  onDeleteQuote: (productId: string, quoteId: string) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onSimulateOrder: (productId: string) => void;
  onViewDetail?: (product: Product) => void;
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
  onViewDetail,
}) => {
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [cardTab, setCardTab] = useState<'quotes' | 'conversions' | 'calculator'>('quotes');
  const [inlineQty, setInlineQty] = useState<number>(5);
  const [calculatorUnit, setCalculatorUnit] = useState<string>('');

  const stats = getProductPriceStats(product);
  const quotesSorted = [...product.quotes].sort((a, b) => a.price - b.price);
  
  // Decide how many quotes to show collapsed vs expanded
  const displayedQuotes = showAllQuotes ? quotesSorted : quotesSorted.slice(0, 3);
  const hasMoreQuotes = quotesSorted.length > 3;

  const productUnits = normalizeProductUnits(product);
  const isMulti = isProductMultiUnit(product);

  const cheapestSelling = stats.cheapestQuote 
    ? calculateSellingPrice(stats.cheapestQuote.price, settings)
    : null;

  const bestConversions = stats.cheapestQuote && cheapestSelling
    ? getProductUnitConversions(product, stats.cheapestQuote.price, stats.cheapestQuote.sellingPrice || cheapestSelling.sellingPrice, stats.cheapestQuote.unit)
    : getProductUnitConversions(product, 0, 0);

  const activeCalcUnit = calculatorUnit || (productUnits[0]?.name || product.defaultUnit);
  const calcTier = productUnits.find(u => u.name.toLowerCase() === activeCalcUnit.toLowerCase()) || productUnits[0];
  const calcRatio = calcTier?.totalRatio || 1;

  return (
    <div 
      id={`product-card-${product.id}`}
      className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between overflow-hidden"
    >
      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Zero-Pill Unboxed Metadata Line */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5 flex-wrap">
              <span className="text-slate-700 font-semibold">{product.category || 'Umum'}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              {product.sku && (
                <>
                  <span className="font-mono text-slate-500">{product.sku}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                </>
              )}
              {product.company ? (
                <span className="text-slate-600 truncate max-w-[160px] sm:max-w-xs">{product.company}</span>
              ) : (
                <span className="text-slate-400">Tanpa Pabrik</span>
              )}
            </div>

            {/* Product Title */}
            <h3 
              onClick={() => onViewDetail && onViewDetail(product)}
              className="text-base sm:text-lg font-bold text-slate-900 leading-snug hover:text-emerald-700 transition-colors cursor-pointer"
              title="Klik untuk melihat rincian lengkap"
            >
              {product.name}
            </h3>

            {/* Active Substance / Generic */}
            {product.genericName && (
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Zat Aktif: <span className="font-medium text-slate-700">{product.genericName}</span>
              </p>
            )}

            {/* Packaging & Unit Hierarchy */}
            <div className="flex items-center gap-2 text-xs mt-2 flex-wrap">
              {product.packaging && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Kemasan: <strong>{product.packaging}</strong></span>
                </span>
              )}
              {isMulti ? (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Multi-Satuan ({productUnits.length} Tingkat: {productUnits.map(u => u.name).join(' → ')})</span>
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Satuan Tunggal ({product.defaultUnit})</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Kebab Menu */}
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
                  className="fixed inset-0 z-20" 
                  onClick={() => setShowActionMenu(false)} 
                />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                  {onViewDetail && (
                    <button
                      onClick={() => {
                        setShowActionMenu(false);
                        onViewDetail(product);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-medium"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Rincian Lengkap Obat</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      onEditProduct(product);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-medium"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Data Obat</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      onAddQuote(product);
                    }}
                    className="w-full text-left px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tambah Penawaran PBF</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      onDeleteProduct(product.id);
                    }}
                    className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Produk</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Hero Best Deal / Recommendation Box */}
        {stats.cheapestQuote && cheapestSelling ? (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 shadow-2xs space-y-3">
            
            {/* Top Line: Supplier Termurah & Hemat Tag */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                  <Award className="w-3 h-3 text-emerald-700" />
                  PBF Termurah
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {stats.cheapestQuote.supplierName}
                </span>
              </div>

              {stats.difference > 0 && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0">
                  <TrendingDown className="w-3 h-3 text-emerald-600" />
                  <span>Hemat {formatRupiah(stats.difference)} (-{stats.savingsPercentage}%)</span>
                </span>
              )}
            </div>

            {/* Split Metrics: Modal Beli vs Harga Jual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Modal Beli */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    Modal Beli Terbaik (Netto)
                  </span>
                  
                  {bestConversions.length <= 1 ? (
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-lg font-bold text-slate-900 font-mono">
                        {formatRupiah(bestConversions[0]?.costPrice || stats.cheapestQuote.price)}
                      </span>
                      <span className="text-xs text-slate-500 font-sans">
                        / {bestConversions[0]?.name || stats.cheapestQuote.unit || product.defaultUnit}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                          {formatRupiah(bestConversions[0].costPrice)}
                        </span>
                        <span className="text-xs text-slate-500 font-sans">
                          / {bestConversions[0].name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-slate-600">
                        {bestConversions.slice(1).map((tier, tIdx) => (
                          <span key={tIdx} className="text-xs font-mono font-medium text-slate-700">
                            ~{formatRupiah(tier.costPrice)} <span className="text-[10px] text-slate-500 font-sans">/{tier.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span>Satuan Pokok</span>
                  <span className="font-semibold text-slate-700">{bestConversions[0]?.name || product.defaultUnit}</span>
                </div>
              </div>

              {/* Harga Jual Apotek */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      Rekomendasi Jual (+{settings.marginPercent}%)
                    </span>
                  </div>

                  <div className="mt-1">
                    {bestConversions.length <= 1 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-emerald-700 font-mono">
                          {formatRupiah(cheapestSelling.sellingPrice)}
                        </span>
                        <span className="text-xs text-slate-500 font-sans">
                          / {bestConversions[0]?.name || stats.cheapestQuote.unit || product.defaultUnit}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono">
                            {formatRupiah(bestConversions[0].sellingPrice)}
                          </span>
                          <span className="text-xs text-slate-500 font-sans">
                            / {bestConversions[0].name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {bestConversions.slice(1).map((tier, tIdx) => (
                            <span key={tIdx} className="text-xs font-mono font-medium text-emerald-800">
                              ~{formatRupiah(tier.sellingPrice)} <span className="text-[10px] text-slate-500 font-sans">/{tier.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-emerald-800 mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span>Estimasi Laba</span>
                  <span className="font-bold text-emerald-700 font-mono">+{formatRupiah(cheapestSelling.profitPerUnit)}</span>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="mt-3.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Belum ada penawaran harga supplier untuk obat ini.</span>
          </div>
        )}
      </div>

      {/* Card Body: Interactive Tabs (Quotes List / Multi-Units / Quick Calculator) */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean Segmented Tab Switcher */}
          <div className="flex items-center justify-between gap-1 mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCardTab('quotes')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  cardTab === 'quotes'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                PBF ({quotesSorted.length})
              </button>
              {bestConversions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCardTab('conversions')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    cardTab === 'conversions'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Satuan ({bestConversions.length})
                </button>
              )}
              {quotesSorted.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCardTab('calculator')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    cardTab === 'calculator'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Hitung cepat total belanja"
                >
                  Kalkulator Qty
                </button>
              )}
            </div>

            {quotesSorted.length > 1 && (
              <span className="text-[11px] text-slate-400 font-mono">
                Rata: {formatRupiah(stats.avgPrice)}
              </span>
            )}
          </div>

          {/* TAB 1: QUOTES BREAKDOWN */}
          {cardTab === 'quotes' && (
            quotesSorted.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-400">
                  Belum ada penawaran. Klik "+ Supplier" di bawah untuk memasukkan data penawaran PBF.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedQuotes.map((quote, idx) => {
                  const isCheapest = idx === 0;
                  const priceDiffFromCheapest = quote.price - stats.minPrice;
                  const pctFromCheapest = stats.minPrice > 0 
                    ? Math.round((priceDiffFromCheapest / stats.minPrice) * 100) 
                    : 0;

                  const quoteSelling = calculateSellingPrice(quote.price, settings);
                  const quoteSellingPrice = quote.sellingPrice || quoteSelling.sellingPrice;
                  const quoteConversions = getProductUnitConversions(product, quote.price, quoteSellingPrice, quote.unit);

                  return (
                    <div
                      key={quote.id}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        isCheapest
                          ? 'bg-emerald-50/50 border-emerald-300/80 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Supplier Name and Rank Badge */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {quote.supplierName}
                            </span>
                            {isCheapest && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                Termurah
                              </span>
                            )}
                          </div>

                          {/* HNA and Discount Info */}
                          {(quote.hna || quote.discountPercent || quote.discount1Value || quote.discount2Value) ? (
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 flex-wrap">
                              {quote.hna && (
                                <span>HNA: <strong className="font-mono text-slate-700">{formatRupiah(quote.hna)}</strong></span>
                              )}
                              {quote.discountPercent !== undefined && quote.discountPercent > 0 && (
                                <span className="text-emerald-700 font-semibold">Disc: {quote.discountPercent}%</span>
                              )}
                              {quote.discount1Value !== undefined && quote.discount1Value > 0 && (
                                <span className="text-emerald-700 font-semibold">
                                  D1: {quote.discount1Type === 'amount' ? formatRupiah(quote.discount1Value) : `${quote.discount1Value}%`}
                                </span>
                              )}
                              {quote.discount2Value !== undefined && quote.discount2Value > 0 && (
                                <span className="text-teal-700 font-semibold">
                                  D2: {quote.discount2Type === 'amount' ? formatRupiah(quote.discount2Value) : `${quote.discount2Value}%`}
                                </span>
                              )}
                            </div>
                          ) : null}

                          {/* MOQ & Lead time */}
                          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-1 flex-wrap">
                            {quote.moq && (
                              <span className="flex items-center gap-1">
                                <Boxes className="w-3 h-3 text-slate-400" />
                                Min: {quote.moq} {quote.unit || product.defaultUnit}
                              </span>
                            )}
                            {quote.leadTimeDays !== undefined && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {quote.leadTimeDays === 0 ? 'Ready / Same Day' : `${quote.leadTimeDays} Hari`}
                              </span>
                            )}
                            {quote.notes && (
                              <span className="truncate max-w-[160px] text-slate-500">
                                • {quote.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pricing Column */}
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Modal Beli
                          </span>
                          <span className={`font-mono font-bold text-sm sm:text-base block ${isCheapest ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {formatRupiah(quoteConversions[0]?.costPrice || quote.price)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            / {quoteConversions[0]?.name || quote.unit || product.defaultUnit}
                          </span>

                          {quote.unit && quoteConversions.length > 1 && quote.unit.toLowerCase() !== quoteConversions[0]?.name.toLowerCase() && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              ({formatRupiah(quote.price)}/{quote.unit})
                            </span>
                          )}

                          {!isCheapest && priceDiffFromCheapest > 0 && (
                            <span className="text-[10px] font-semibold text-rose-600 block mt-0.5">
                              +{formatRupiah(priceDiffFromCheapest)} (+{pctFromCheapest}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selling price preview & quote action row */}
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs gap-2">
                        <div className="text-[11px] text-slate-500">
                          Jual Apotek: <strong className="text-emerald-800 font-mono">{formatRupiah(quoteConversions[0]?.sellingPrice || quoteSellingPrice)}</strong>
                          <span className="text-[10px] text-slate-500 ml-0.5 font-sans">
                            /{quoteConversions[0]?.name || quote.unit || product.defaultUnit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditQuote(product, quote)}
                            className="text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            type="button"
                            onClick={() => onDeleteQuote(product.id, quote.id)}
                            className="text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {hasMoreQuotes && (
                  <button
                    type="button"
                    onClick={() => setShowAllQuotes(!showAllQuotes)}
                    className="w-full py-2 text-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50/40 hover:bg-emerald-50 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    {showAllQuotes ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Sembunyikan Sebagian</span>
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
            )
          )}

          {/* TAB 2: UNIT CONVERSIONS TABLE */}
          {cardTab === 'conversions' && bestConversions.length > 0 && (
            <div className="space-y-2 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs shadow-2xs">
              <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span>Konversi {bestConversions.length} Satuan</span>
                <span className="text-[10px] text-slate-500 font-normal">Dari Pokok hingga Kemasan Terbesar</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50/60 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-2">Tingkat & Satuan</th>
                    <th className="p-2">Rasio / Isi</th>
                    <th className="p-2 text-right">Modal</th>
                    <th className="p-2 text-right">Jual</th>
                    <th className="p-2 text-right">Laba</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {bestConversions.map((tier, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-900">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-mono">T{tier.level}</span>
                          <span>{tier.name}</span>
                          {idx === 0 && <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1 rounded">Pokok</span>}
                          {idx === bestConversions.length - 1 && bestConversions.length > 1 && (
                            <span className="text-[9px] font-bold text-blue-800 bg-blue-100 px-1 rounded">Terbesar</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-slate-500 text-[11px]">
                        {idx === 0 ? '1 Unit Pokok' : `@${tier.content} ${productUnits[idx - 1]?.name || bestConversions[0].name} (Total: ${tier.totalRatio.toLocaleString('id-ID')} ${bestConversions[0].name})`}
                      </td>
                      <td className="p-2 text-right font-mono font-medium text-slate-800">
                        {formatRupiah(tier.costPrice)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(tier.sellingPrice)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">
                        +{formatRupiah(tier.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: INLINE QUANTITY CALCULATOR WITH MULTI-UNIT SELECTOR */}
          {cardTab === 'calculator' && (
            <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-slate-700">Jumlah Pembelian:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={inlineQty}
                    onChange={(e) => setInlineQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 px-2 py-0.5 text-center font-bold bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <select
                    value={activeCalcUnit}
                    onChange={(e) => setCalculatorUnit(e.target.value)}
                    className="px-2 py-0.5 text-xs font-bold border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {productUnits.map((u) => (
                      <option key={u.name} value={u.name}>
                        {u.name} (T{u.level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isMulti && activeCalcUnit.toLowerCase() !== productUnits[0].name.toLowerCase() && (
                <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
                  <span>Ekuivalen: <strong>{(inlineQty * calcRatio).toLocaleString('id-ID')} {productUnits[0].name}</strong></span>
                  <span className="text-emerald-700 font-semibold">1 {activeCalcUnit} = {calcRatio} {productUnits[0].name}</span>
                </div>
              )}

              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                {quotesSorted.map((q, idx) => {
                  const qConvs = getProductUnitConversions(product, q.price, q.sellingPrice, q.unit);
                  const matchedConv = qConvs.find(c => c.name.toLowerCase() === activeCalcUnit.toLowerCase());
                  const unitPrice = matchedConv ? matchedConv.costPrice : (q.price * calcRatio);
                  const cost = unitPrice * inlineQty;

                  const cheapestQuoteConvs = getProductUnitConversions(product, stats.cheapestQuote?.price || 0, stats.cheapestQuote?.sellingPrice, stats.cheapestQuote?.unit);
                  const cheapestMatchedConv = cheapestQuoteConvs.find(c => c.name.toLowerCase() === activeCalcUnit.toLowerCase());
                  const cheapestUnitPrice = cheapestMatchedConv ? cheapestMatchedConv.costPrice : ((stats.cheapestQuote?.price || 0) * calcRatio);
                  const cheapestCost = cheapestUnitPrice * inlineQty;
                  const diff = cost - cheapestCost;
                  const isCheapest = idx === 0;

                  return (
                    <div 
                      key={q.id}
                      className={`p-2 rounded-lg flex items-center justify-between ${
                        isCheapest ? 'bg-emerald-100/70 font-semibold text-emerald-950' : 'bg-white text-slate-800 border border-slate-200/70'
                      }`}
                    >
                      <div className="min-w-0 truncate pr-2">
                        <span className="font-bold">{q.supplierName}</span>
                        {isCheapest && <span className="ml-1 text-[10px] text-emerald-800 font-bold">👑 Termurah</span>}
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {formatRupiah(unitPrice)} / {activeCalcUnit}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold">{formatRupiah(cost)}</span>
                        {!isCheapest && diff > 0 && (
                          <span className="block text-[10px] text-rose-600 font-normal">
                            +{formatRupiah(diff)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Card Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <button
            id={`btn-add-quote-${product.id}`}
            type="button"
            onClick={() => onAddQuote(product)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors cursor-pointer min-h-[40px]"
            title="Tambah penawaran supplier PBF baru"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Supplier</span>
          </button>

          {onViewDetail && (
            <button
              type="button"
              onClick={() => onViewDetail(product)}
              className="inline-flex items-center justify-center gap-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer min-h-[40px]"
              title="Lihat detail spesifikasi dan komparasi lengkap"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Detail</span>
            </button>
          )}

          <button
            id={`btn-simulate-${product.id}`}
            type="button"
            onClick={() => onSimulateOrder(product.id)}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-xl transition-colors cursor-pointer min-h-[40px]"
            title="Buka simulasi order"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-700" />
            <span>Simulasi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
