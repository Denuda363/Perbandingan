import React, { useState, useMemo } from 'react';
import { 
  X, 
  Building2, 
  Package, 
  Layers, 
  Award, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Boxes, 
  Plus, 
  Edit, 
  Trash2, 
  ShoppingCart, 
  Percent, 
  CheckCircle2, 
  AlertCircle,
  Calculator,
  Calendar,
  ArrowRight,
  ArrowDown,
  Repeat,
  Info,
  PackageCheck,
  Check
} from 'lucide-react';
import { Product, SupplierQuote, AppSettings } from '../types';
import { 
  formatRupiah, 
  getProductPriceStats, 
  calculateSellingPrice, 
  getProductUnitConversions, 
  normalizeProductUnits,
  isProductMultiUnit,
  formatProductUnitSummary,
  convertProductQuantity
} from '../utils/formatters';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onAddQuote: (product: Product) => void;
  onEditQuote: (product: Product, quote: SupplierQuote) => void;
  onDeleteQuote: (productId: string, quoteId: string) => void;
  onEditProduct: (product: Product) => void;
  onSimulateOrder: (productId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  settings,
  onAddQuote,
  onEditQuote,
  onDeleteQuote,
  onEditProduct,
  onSimulateOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'units' | 'simulation'>('quotes');
  const [testQty, setTestQty] = useState<number>(10);
  const [testSelectedUnit, setTestSelectedUnit] = useState<string>('');

  // Interactive Unit Converter states
  const [converterQty, setConverterQty] = useState<number>(1);
  const [converterUnit, setConverterUnit] = useState<string>('');

  if (!isOpen || !product) return null;

  const stats = getProductPriceStats(product);
  const quotesSorted = [...product.quotes].sort((a, b) => a.price - b.price);
  const isMulti = isProductMultiUnit(product);
  const productUnits = normalizeProductUnits(product);

  const cheapestSelling = stats.cheapestQuote 
    ? calculateSellingPrice(stats.cheapestQuote.price, settings)
    : null;

  const unitConversions = stats.cheapestQuote && cheapestSelling
    ? getProductUnitConversions(product, stats.cheapestQuote.price, stats.cheapestQuote.sellingPrice || cheapestSelling.sellingPrice, stats.cheapestQuote.unit)
    : getProductUnitConversions(product, 0, 0);

  // Active converter unit fallback (default to smallest unit Level 1)
  const activeConvertUnit = converterUnit || (productUnits[0]?.name || product.defaultUnit);
  const conversionResults = convertProductQuantity(product, activeConvertUnit, converterQty);

  // Selected unit for order simulation fallback
  const activeSimUnit = testSelectedUnit || (productUnits[0]?.name || product.defaultUnit);
  const simTier = productUnits.find(u => u.name.toLowerCase() === activeSimUnit.toLowerCase()) || productUnits[0];
  const simRatio = simTier?.totalRatio || 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="min-w-0 flex-1">
            {/* Unboxed Metadata & Satuan Indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1.5 flex-wrap">
              <span className="font-semibold text-slate-700">{product.category || 'Umum'}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              {product.sku && (
                <>
                  <span className="font-mono text-slate-600">{product.sku}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                </>
              )}
              {product.company ? (
                <span className="text-slate-700 font-medium">{product.company}</span>
              ) : (
                <span>Tanpa Pabrik</span>
              )}
              <span aria-hidden="true" className="text-slate-300">·</span>

              {/* Status Satuan: Tunggal vs Multi Satuan */}
              {isMulti ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Multi-Satuan ({productUnits.length} Tingkat)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                  <Package className="w-3.5 h-3.5 text-blue-700" />
                  <span>Satuan Tunggal ({product.defaultUnit})</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {product.name}
            </h2>

            {product.genericName && (
              <p className="text-xs text-slate-500 mt-1">
                Zat Aktif / Generik: <span className="font-medium text-slate-700">{product.genericName}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onEditProduct(product)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Ubah Obat</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* Key Product Specification Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 block">Kemasan Fisik</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{product.packaging || '-'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Tipe & Struktur Satuan</span>
              <span className="font-bold text-slate-900 mt-0.5 block">
                {isMulti ? `${productUnits.length} Satuan Bertingkat` : `Satuan Tunggal (${product.defaultUnit})`}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Jumlah Penawaran PBF</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{quotesSorted.length} Supplier Aktif</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Margin Standar Apotek</span>
              <span className="font-bold text-emerald-700 mt-0.5 block">+{settings.marginPercent}%</span>
            </div>
          </div>

          {/* VISUAL UNIT HIERARCHY FLOW (Pohon Satuan Bertingkat) */}
          <div className={`p-4 rounded-2xl border ${isMulti ? 'bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border-emerald-200' : 'bg-blue-50/50 border-blue-200'}`}>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/60 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className={`w-4 h-4 ${isMulti ? 'text-emerald-700' : 'text-blue-700'}`} />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {isMulti ? `Hierarki Rantai Multi-Satuan (${productUnits.length} Satuan Bertingkat)` : 'Karakteristik Satuan Produk'}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-600">
                {product.packContent || formatProductUnitSummary(product)}
              </span>
            </div>

            {isMulti ? (
              <div className="space-y-3">
                {/* Visual Step Ladder: Dari Terbesar ke Terkecil */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {productUnits.slice().reverse().map((u, revIdx) => {
                    const originalIdx = productUnits.length - 1 - revIdx;
                    const isLargest = originalIdx === productUnits.length - 1;
                    const isSmallest = originalIdx === 0;

                    return (
                      <div 
                        key={originalIdx} 
                        className={`p-3 rounded-xl border relative flex flex-col justify-between ${
                          isSmallest 
                            ? 'bg-white border-emerald-300 shadow-2xs ring-1 ring-emerald-400/30' 
                            : isLargest 
                              ? 'bg-white border-blue-200 shadow-2xs' 
                              : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isSmallest 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isLargest 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            Tingkat {originalIdx + 1}
                          </span>
                          {isSmallest && (
                            <span className="text-[10px] text-emerald-700 font-bold">
                              Pokok / Eceran
                            </span>
                          )}
                          {isLargest && (
                            <span className="text-[10px] text-blue-700 font-bold">
                              Kemasan Terbesar
                            </span>
                          )}
                        </div>

                        <div className="text-base font-extrabold text-slate-900">
                          {u.name}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1">
                          {isSmallest ? (
                            <span>1 Unit Acuan Dasar</span>
                          ) : (
                            <span>
                              1 {u.name} = {u.content} {productUnits[originalIdx - 1]?.name}
                              <br />
                              <strong className="text-slate-700 font-mono">({u.totalRatio.toLocaleString('id-ID')} {productUnits[0]?.name})</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Produk ini mendukung kalkulasi harga otomatis hingga <strong>{productUnits.length} tingkatan satuan</strong>. Penawaran PBF dapat berupa satuan eceran maupun kemasan besar, dan apotek dapat menjual dalam satuan mana saja secara fleksibel.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block text-sm">1 {product.defaultUnit}</span>
                  <span className="text-slate-500">
                    Produk ini adalah produk satuan tunggal (bukan kemasan bertingkat). Harga beli, PPN, margin, dan harga jual apotek dihitung langsung per <strong>1 {product.defaultUnit}</strong>.
                  </span>
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg shrink-0">
                  Satuan Tunggal
                </span>
              </div>
            )}
          </div>

          {/* Hero Recommendation Box */}
          {stats.cheapestQuote && cheapestSelling ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Rekomendasi PBF Termurah
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {stats.cheapestQuote.supplierName}
                    </span>
                  </div>
                </div>

                {stats.difference > 0 && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold self-start sm:self-center">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Hemat {formatRupiah(stats.difference)} (-{stats.savingsPercentage}%) vs PBF Tertinggi</span>
                  </div>
                )}
              </div>

              {/* Price Details Grid Across All Tiers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[11px] text-slate-500 font-medium block">Modal Beli Termurah (Netto)</span>
                  <div className="text-lg font-mono font-bold text-slate-900 mt-1">
                    {formatRupiah(unitConversions[0]?.costPrice || stats.cheapestQuote.price)}
                    <span className="text-xs font-sans text-slate-500 font-normal ml-1">/ {unitConversions[0]?.name || product.defaultUnit}</span>
                  </div>
                  {unitConversions.length > 1 && (
                    <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                      {unitConversions.slice(1).map((t, idx) => (
                        <div key={idx} className="font-mono text-slate-700">
                          ~{formatRupiah(t.costPrice)} <span className="font-sans text-[10px] text-slate-500">/{t.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[11px] text-emerald-800 font-medium block">Rekomendasi Jual (+{settings.marginPercent}%)</span>
                  <div className="text-lg font-mono font-bold text-emerald-700 mt-1">
                    {formatRupiah(unitConversions[0]?.sellingPrice || cheapestSelling.sellingPrice)}
                    <span className="text-xs font-sans text-slate-500 font-normal ml-1">/ {unitConversions[0]?.name || product.defaultUnit}</span>
                  </div>
                  {unitConversions.length > 1 && (
                    <div className="text-[11px] text-emerald-800 mt-1 space-y-0.5">
                      {unitConversions.slice(1).map((t, idx) => (
                        <div key={idx} className="font-mono font-semibold text-emerald-700">
                          ~{formatRupiah(t.sellingPrice)} <span className="font-sans text-[10px] text-slate-500">/{t.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[11px] text-slate-500 font-medium block">Estimasi Keuntungan Apotek</span>
                  <div className="text-lg font-mono font-bold text-emerald-800 mt-1">
                    +{formatRupiah(unitConversions[0]?.profit || cheapestSelling.profitPerUnit)}
                    <span className="text-xs font-sans text-slate-500 font-normal ml-1">/ {unitConversions[0]?.name || product.defaultUnit}</span>
                  </div>
                  {unitConversions.length > 1 && (
                    <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                      {unitConversions.slice(1).map((t, idx) => (
                        <div key={idx} className="font-mono text-emerald-800 font-bold">
                          +{formatRupiah(t.profit)} <span className="font-sans text-[10px] text-slate-500 font-normal">/{t.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Belum ada penawaran harga supplier yang dimasukkan untuk obat ini.</span>
              </div>
              <button
                type="button"
                onClick={() => onAddQuote(product)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shrink-0 cursor-pointer"
              >
                + Tambah Penawaran
              </button>
            </div>
          )}

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 pb-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('quotes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'quotes'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Komparasi Seluruh Supplier ({quotesSorted.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('units')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'units'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Detail Satuan & Konversi ({productUnits.length} Satuan)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simulation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'simulation'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Simulasi Hitung Order</span>
            </button>
          </div>

          {/* TAB 1: ALL QUOTES BREAKDOWN */}
          {activeTab === 'quotes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Daftar Penawaran PBF Lengkap
                </span>
                <button
                  type="button"
                  onClick={() => onAddQuote(product)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Penawaran PBF</span>
                </button>
              </div>

              {quotesSorted.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Belum ada penawaran supplier.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {quotesSorted.map((q, idx) => {
                    const isCheapest = idx === 0;
                    const diff = q.price - stats.minPrice;
                    const pct = stats.minPrice > 0 ? Math.round((diff / stats.minPrice) * 100) : 0;
                    const qSelling = calculateSellingPrice(q.price, settings);
                    const qConversions = getProductUnitConversions(product, q.price, q.sellingPrice || qSelling.sellingPrice, q.unit);

                    return (
                      <div 
                        key={q.id} 
                        className={`p-3.5 sm:p-4 text-xs transition-colors ${
                          isCheapest ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span 
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                isCheapest ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">
                                  {q.supplierName}
                                </span>
                                {isCheapest && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                    Termurah
                                  </span>
                                )}
                              </div>

                              {/* HNA & Diskon Breakdown */}
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                                {q.hna && <span>HNA: {formatRupiah(q.hna)}</span>}
                                {q.discountPercent !== undefined && q.discountPercent > 0 && (
                                  <span className="text-emerald-700 font-semibold">Diskon: {q.discountPercent}%</span>
                                )}
                                {q.discount1Value !== undefined && q.discount1Value > 0 && (
                                  <span className="text-emerald-700 font-semibold">D1: {q.discount1Type === 'amount' ? formatRupiah(q.discount1Value) : `${q.discount1Value}%`}</span>
                                )}
                                {q.discount2Value !== undefined && q.discount2Value > 0 && (
                                  <span className="text-teal-700 font-semibold">D2: {q.discount2Type === 'amount' ? formatRupiah(q.discount2Value) : `${q.discount2Value}%`}</span>
                                )}
                                <span>PPN: {settings.ppnEnabled ? `+${settings.ppnPercent}%` : 'Non-PPN'}</span>
                                {q.moq && <span>MOQ: {q.moq} {q.unit || product.defaultUnit}</span>}
                                {q.leadTimeDays !== undefined && <span>Kirim: {q.leadTimeDays} Hari</span>}
                              </div>

                              {/* Breakdown per Satuan jika Multi-Satuan */}
                              {qConversions.length > 1 && (
                                <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase">Harga per Satuan:</span>
                                  {qConversions.map((tier, tIdx) => (
                                    <span key={tIdx} className="font-mono text-slate-800 font-medium">
                                      {tier.name}: <strong className="text-slate-900">{formatRupiah(tier.costPrice)}</strong>
                                      {tIdx < qConversions.length - 1 && <span className="text-slate-300 ml-2">·</span>}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {q.notes && (
                                <p className="text-[11px] text-slate-500 mt-1 italic">
                                  Catatan: {q.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Pricing Column & Actions */}
                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="text-left sm:text-right">
                              <span className="font-mono font-bold text-slate-900 text-sm block">
                                {formatRupiah(q.price)}
                                <span className="text-[11px] font-sans text-slate-500 font-normal ml-0.5">/ {q.unit || product.defaultUnit}</span>
                              </span>
                              {!isCheapest && diff > 0 ? (
                                <span className="text-[11px] font-semibold text-rose-600 block">
                                  +{formatRupiah(diff)} (+{pct}%)
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-bold block">
                                  Harga Pokok Terbaik
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 block">
                                Jual Apotek: {formatRupiah(q.sellingPrice || qSelling.sellingPrice)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onEditQuote(product, q)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit penawaran ini"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteQuote(product.id, q.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus penawaran ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UNIT CONVERSIONS & QUICK CONVERTER */}
          {activeTab === 'units' && (
            <div className="space-y-5">
              
              {/* Table of All Units */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Daftar Konversi Satuan & Kalkulasi Margin Apotek</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    Total {unitConversions.length} Satuan Terdaftar
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Tingkat</th>
                        <th className="p-3">Nama Satuan</th>
                        <th className="p-3">Kapasitas / Rasio Isi</th>
                        <th className="p-3 text-right">Modal Beli (Netto)</th>
                        <th className="p-3 text-right">Modal + PPN</th>
                        <th className="p-3 text-right">Rekomendasi Jual</th>
                        <th className="p-3 text-right">Estimasi Laba</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unitConversions.map((tier, idx) => {
                        const isSmallest = idx === 0;
                        const isLargest = idx === unitConversions.length - 1 && unitConversions.length > 1;
                        const costWithPpn = Math.round(tier.costPrice * (settings.ppnEnabled ? (1 + settings.ppnPercent / 100) : 1));

                        return (
                          <tr key={idx} className={`hover:bg-slate-50 ${isSmallest ? 'bg-emerald-50/20' : ''}`}>
                            <td className="p-3 font-medium text-slate-600">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                isSmallest 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : isLargest 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-slate-100 text-slate-700'
                              }`}>
                                Tingkat {tier.level}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-900 text-sm">
                              {tier.name}
                              {isSmallest && <span className="ml-1.5 text-[10px] text-emerald-700 font-normal">(Satuan Pokok)</span>}
                              {isLargest && <span className="ml-1.5 text-[10px] text-blue-700 font-normal">(Kemasan Terbesar)</span>}
                            </td>
                            <td className="p-3 text-slate-600">
                              {tier.description}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(tier.costPrice)}
                            </td>
                            <td className="p-3 text-right font-mono text-purple-700 font-medium">
                              {formatRupiah(costWithPpn)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(tier.sellingPrice)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-800">
                              +{formatRupiah(tier.profit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* INTERACTIVE QUICK UNIT CONVERTER */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3.5">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-700" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Kalkulator Konversi Satuan Cepat
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pilih satuan dan masukkan jumlah untuk melihat ekuivalen dalam semua satuan produk ini secara instan.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">Hitung Konversi:</span>
                  <input
                    type="number"
                    min="1"
                    value={converterQty}
                    onChange={(e) => setConverterQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 px-2.5 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <select
                    value={activeConvertUnit}
                    onChange={(e) => setConverterUnit(e.target.value)}
                    className="px-3 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {productUnits.map((u) => (
                      <option key={u.name} value={u.name}>
                        {u.name} (Tingkat {u.level})
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-slate-500">= Ekuivalen dengan:</span>
                </div>

                {/* Conversion Equivalent Results */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {conversionResults.map((res, rIdx) => {
                    const matchedConv = unitConversions.find(c => c.name.toLowerCase() === res.unitName.toLowerCase());
                    const totalCostVal = (matchedConv?.costPrice || 0) * res.quantity;
                    const totalSellVal = (matchedConv?.sellingPrice || 0) * res.quantity;

                    return (
                      <div key={rIdx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Tingkat {res.level} ({res.unitName})
                        </span>
                        <div className="text-base font-extrabold text-slate-900 font-mono">
                          {res.quantity.toLocaleString('id-ID')} <span className="font-sans text-xs font-medium text-slate-600">{res.unitName}</span>
                        </div>
                        {matchedConv && matchedConv.costPrice > 0 && (
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                            Modal: <span className="font-mono font-bold text-slate-700">{formatRupiah(totalCostVal)}</span>
                            <br />
                            Jual: <span className="font-mono font-bold text-emerald-700">{formatRupiah(totalSellVal)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: ORDER SIMULATION */}
          {activeTab === 'simulation' && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Kalkulator Simulasi Pembelian Produk Ini
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pilih satuan pesanan (Dus, Box, Strip, Tablet, dsb.) dan jumlah kebutuhan untuk membandingkan total biaya belanja antar supplier.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">Jumlah Order:</span>
                  <input
                    type="number"
                    min="1"
                    value={testQty}
                    onChange={(e) => setTestQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 px-2.5 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <select
                    value={activeSimUnit}
                    onChange={(e) => setTestSelectedUnit(e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {productUnits.map((u) => (
                      <option key={u.name} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total Unit Conversion Footnote */}
              {isMulti && (
                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>
                    Pesanan: <strong>{testQty} {activeSimUnit}</strong>
                    {activeSimUnit.toLowerCase() !== productUnits[0].name.toLowerCase() && (
                      <span className="ml-1 text-slate-500 font-mono">
                        (= {(testQty * simRatio).toLocaleString('id-ID')} {productUnits[0].name})
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Konversi Otomatis
                  </span>
                </div>
              )}

              {quotesSorted.length > 0 && (
                <div className="space-y-2 pt-1">
                  {quotesSorted.map((q, idx) => {
                    const qConvs = getProductUnitConversions(product, q.price, q.sellingPrice, q.unit);
                    const matchedTier = qConvs.find(c => c.name.toLowerCase() === activeSimUnit.toLowerCase()) || qConvs[0];
                    const unitPrice = matchedTier ? matchedTier.costPrice : (q.price * simRatio);
                    const totalCost = unitPrice * testQty;

                    const cheapestQuoteConvs = getProductUnitConversions(product, stats.cheapestQuote?.price || 0, stats.cheapestQuote?.sellingPrice, stats.cheapestQuote?.unit);
                    const cheapestMatchedTier = cheapestQuoteConvs.find(c => c.name.toLowerCase() === activeSimUnit.toLowerCase()) || cheapestQuoteConvs[0];
                    const cheapestUnitPrice = cheapestMatchedTier ? cheapestMatchedTier.costPrice : ((stats.cheapestQuote?.price || 0) * simRatio);
                    const cheapestTotal = cheapestUnitPrice * testQty;
                    const diffTotal = totalCost - cheapestTotal;
                    const isCheapest = idx === 0;

                    return (
                      <div 
                        key={q.id} 
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          isCheapest ? 'bg-white border-emerald-300 shadow-2xs' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCheapest ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900">{q.supplierName}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              {formatRupiah(unitPrice)} / {activeSimUnit}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-mono font-bold text-sm block ${isCheapest ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {formatRupiah(totalCost)}
                          </span>
                          {isCheapest ? (
                            <span className="text-[10px] text-emerald-700 font-bold block">
                              Paling Ekonomis
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-600 font-semibold block">
                              Selisih +{formatRupiah(diffTotal)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSimulateOrder(product.id)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buka di Keranjang Order Apotek</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
