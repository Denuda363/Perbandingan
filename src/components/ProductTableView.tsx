import React, { useState } from 'react';
import { 
  Building2, 
  Layers, 
  PackageCheck, 
  Award, 
  TrendingDown, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Edit, 
  Trash2, 
  ShoppingCart, 
  Boxes, 
  Clock, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Product, SupplierQuote, AppSettings } from '../types';
import { 
  formatRupiah, 
  getProductPriceStats, 
  calculateSellingPrice, 
  getProductUnitConversions, 
  normalizeProductUnits,
  isProductMultiUnit,
  formatProductUnitSummary
} from '../utils/formatters';

interface ProductTableViewProps {
  products: Product[];
  settings: AppSettings;
  onAddQuote: (product: Product) => void;
  onEditQuote: (product: Product, quote: SupplierQuote) => void;
  onDeleteQuote: (productId: string, quoteId: string) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onSimulateOrder: (productId: string) => void;
  onViewDetail?: (product: Product) => void;
}

export const ProductTableView: React.FC<ProductTableViewProps> = ({
  products,
  settings,
  onAddQuote,
  onEditQuote,
  onDeleteQuote,
  onEditProduct,
  onDeleteProduct,
  onSimulateOrder,
  onViewDetail,
}) => {
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    products.forEach((p) => {
      next[p.id] = true;
    });
    setExpandedProductIds(next);
  };

  const collapseAll = () => {
    setExpandedProductIds({});
  };

  const allExpanded = products.length > 0 && products.every((p) => expandedProductIds[p.id]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Subheader & Bulk Controls */}
      <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Tabel Ringkas Produk ({products.length})
          </span>
          <span className="text-[11px] text-slate-500 hidden md:inline">
            • Klik baris untuk melihat rincian seluruh penawaran supplier
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={allExpanded ? collapseAll : expandAll}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            {allExpanded ? 'Tutup Semua Rincian' : 'Buka Semua Rincian'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-4 min-w-[220px]">Produk & Pabrik</th>
              <th className="py-3 px-4 min-w-[150px]">Satuan / Kemasan</th>
              <th className="py-3 px-4 min-w-[180px]">Supplier Termurah (Modal)</th>
              <th className="py-3 px-4 min-w-[170px]">Harga Jual (+Margin)</th>
              <th className="py-3 px-4 min-w-[130px]">Selisih Hemat</th>
              <th className="py-3 px-3 text-center min-w-[100px]">Vendor</th>
              <th className="py-3 px-4 text-right min-w-[140px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {products.map((product, idx) => {
              const stats = getProductPriceStats(product);
              const isExpanded = !!expandedProductIds[product.id];
              const cheapestSelling = stats.cheapestQuote ? calculateSellingPrice(stats.cheapestQuote.price, settings) : null;
              const bestConversions = stats.cheapestQuote && cheapestSelling
                ? getProductUnitConversions(product, stats.cheapestQuote.price, stats.cheapestQuote.sellingPrice || cheapestSelling.sellingPrice, stats.cheapestQuote.unit)
                : [];
              const isMulti = isProductMultiUnit(product);
              const productUnits = normalizeProductUnits(product);

              return (
                <React.Fragment key={product.id}>
                  <tr 
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      isExpanded ? 'bg-emerald-50/20' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                    }`}
                    onClick={() => toggleExpand(product.id)}
                  >
                    {/* Expand icon */}
                    <td className="py-3 px-3 text-center text-slate-400">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(product.id);
                        }}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                        title={isExpanded ? 'Sembunyikan rincian' : 'Lihat penawaran'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-700" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Product Name & Pabrik */}
                    <td className="py-3 px-4">
                      <div 
                        onClick={(e) => {
                          if (onViewDetail) {
                            e.stopPropagation();
                            onViewDetail(product);
                          }
                        }}
                        className="font-bold text-slate-900 text-sm leading-snug hover:text-emerald-700 transition-colors"
                        title="Klik untuk rincian lengkap"
                      >
                        {product.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 mt-0.5">
                        {product.company && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            {product.company}
                          </span>
                        )}
                        {product.sku && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                            {product.sku}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Satuan & Kemasan */}
                    <td className="py-3 px-4">
                      {isMulti && productUnits.length > 1 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                              Multi ({productUnits.length} Satuan)
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {productUnits[0]?.name}
                              <span className="text-[10px] text-emerald-700 font-normal ml-0.5">(Pokok)</span>
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-600">
                            {productUnits.map(u => u.name).join(' → ')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            1 {productUnits[productUnits.length - 1]?.name} = {productUnits[productUnits.length - 1]?.totalRatio.toLocaleString('id-ID')} {productUnits[0]?.name}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                              Tunggal
                            </span>
                            <span className="font-semibold text-slate-800 text-xs">
                              {product.defaultUnit}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            1 Satuan (Non-Pecahan)
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Best Supplier & Modal */}
                    <td className="py-3 px-4">
                      {stats.cheapestQuote && bestConversions.length > 0 ? (
                        <div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                            <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[140px]" title={stats.cheapestQuote.supplierName}>
                              {stats.cheapestQuote.supplierName}
                            </span>
                          </div>
                          <div className="mt-0.5">
                            {bestConversions.length <= 1 ? (
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {formatRupiah(bestConversions[0]?.costPrice || stats.cheapestQuote.price)}
                                <span className="text-[10px] text-slate-500 font-sans ml-0.5">/{bestConversions[0]?.name || product.defaultUnit}</span>
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                {bestConversions.map((tier, tIdx) => (
                                  <div key={tIdx} className={`font-mono text-xs ${tIdx === 0 ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                    {formatRupiah(tier.costPrice)} <span className="text-[10px] text-slate-500 font-sans">/{tier.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Belum ada penawaran</span>
                      )}
                    </td>

                    {/* Harga Jual (+Margin) */}
                    <td className="py-3 px-4">
                      {stats.cheapestQuote && bestConversions.length > 0 ? (
                        <div>
                          {bestConversions.length <= 1 ? (
                            <span className="font-mono font-black text-emerald-700 text-sm">
                              {formatRupiah(bestConversions[0]?.sellingPrice || cheapestSelling?.sellingPrice || 0)}
                              <span className="text-[10px] text-slate-500 font-sans ml-0.5">/{bestConversions[0]?.name || product.defaultUnit}</span>
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {bestConversions.map((tier, tIdx) => (
                                <div key={tIdx} className={`font-mono text-xs ${tIdx === 0 ? 'font-black text-emerald-700' : 'font-semibold text-emerald-800'}`}>
                                  {formatRupiah(tier.sellingPrice)} <span className="text-[10px] text-slate-500 font-sans">/{tier.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                            +{settings.marginPercent}% margin
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Selisih Hemat */}
                    <td className="py-3 px-4">
                      {stats.difference > 0 ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <TrendingDown className="w-3 h-3 text-emerald-600" />
                            Hemat {stats.savingsPercentage}%
                          </span>
                          <span className="block font-mono text-[11px] text-slate-500 mt-0.5">
                            {formatRupiah(stats.difference)}
                          </span>
                        </div>
                      ) : stats.quoteCount >= 2 ? (
                        <span className="text-slate-400 text-[11px]">Harga sama</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">1 vendor</span>
                      )}
                    </td>

                    {/* Vendor Count */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        stats.quoteCount >= 2 
                          ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                          : stats.quoteCount === 1 
                          ? 'bg-slate-100 text-slate-700' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {stats.quoteCount} Vendor
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {onViewDetail && (
                          <button
                            type="button"
                            onClick={() => onViewDetail(product)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer border border-slate-200"
                            title="Lihat Detail Lengkap & Simulasi"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onAddQuote(product)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium transition-colors cursor-pointer border border-emerald-200"
                          title="Tambah Penawaran Supplier"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSimulateOrder(product.id)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors cursor-pointer border border-blue-200"
                          title="Simulasi Order Produk Ini"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer border border-slate-200"
                          title="Edit Master Produk"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(product.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium transition-colors cursor-pointer border border-rose-200"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Quote Detail Drawer */}
                  {isExpanded && (
                    <tr className="bg-slate-50/70 border-b border-slate-200">
                      <td colSpan={8} className="p-4 sm:p-5">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-150 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Boxes className="w-4 h-4 text-emerald-600" />
                              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                                Daftar Lengkap Penawaran Supplier untuk {product.name} ({product.quotes.length})
                              </h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => onAddQuote(product)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Penawaran</span>
                            </button>
                          </div>

                          {product.quotes.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs">
                              Belum ada penawaran harga supplier untuk produk ini.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {product.quotes.map((quote) => {
                                const isCheapest = stats.cheapestQuote?.id === quote.id;
                                const quoteSelling = calculateSellingPrice(quote.price, settings);
                                const quoteConversions = getProductUnitConversions(product, quote.price, quote.sellingPrice || quoteSelling.sellingPrice, quote.unit);

                                return (
                                  <div
                                    key={quote.id}
                                    className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                                      isCheapest
                                        ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                                        : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-slate-900 text-sm truncate" title={quote.supplierName}>
                                          {quote.supplierName}
                                        </span>
                                        {isCheapest && (
                                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.2 rounded shrink-0">
                                            Termurah
                                          </span>
                                        )}
                                      </div>

                                      {/* Modal and Sell Price */}
                                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                        <div className="flex items-baseline justify-between">
                                          <span className="text-slate-500 font-medium">Modal Beli:</span>
                                          {quoteConversions.length <= 1 ? (
                                            <span className="font-mono font-bold text-slate-900">
                                              {formatRupiah(quoteConversions[0]?.costPrice || quote.price)}
                                              <span className="text-[10px] text-slate-500 font-sans ml-0.5">/{quoteConversions[0]?.name || product.defaultUnit}</span>
                                            </span>
                                          ) : (
                                            <div className="text-right space-y-0.5">
                                              {quoteConversions.map((qc, qIdx) => (
                                                <span key={qIdx} className={`font-mono block text-[11px] ${qIdx === 0 ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                                  {formatRupiah(qc.costPrice)}
                                                  <span className="text-[10px] text-slate-500 font-sans ml-0.5">/{qc.name}</span>
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                                          <span className="text-emerald-700 font-medium">Harga Jual:</span>
                                          {quoteConversions.length <= 1 ? (
                                            <span className="font-mono font-black text-emerald-800">
                                              {formatRupiah(quoteConversions[0]?.sellingPrice || quoteSelling.sellingPrice)}
                                              <span className="text-[10px] text-slate-500 font-sans ml-0.5">/{quoteConversions[0]?.name || product.defaultUnit}</span>
                                            </span>
                                          ) : (
                                            <div className="text-right space-y-0.5">
                                              {quoteConversions.map((qc, qIdx) => (
                                                <span key={qIdx} className={`font-mono block text-[11px] ${qIdx === 0 ? 'font-black text-emerald-700' : 'font-semibold text-emerald-800'}`}>
                                                  {formatRupiah(qc.sellingPrice)}
                                                  <span className="text-[10px] text-slate-500 font-sans ml-0.5">/{qc.name}</span>
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Discounts & Details */}
                                      {(quote.discount1Value || quote.discount2Value || quote.moq || quote.leadTimeDays !== undefined) && (
                                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500">
                                          {quote.discount1Value !== undefined && quote.discount1Value > 0 && (
                                            <span className="bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                                              D1: -{quote.discount1Value}{quote.discount1Type === 'percent' ? '%' : ''}
                                            </span>
                                          )}
                                          {quote.discount2Value !== undefined && quote.discount2Value > 0 && (
                                            <span className="bg-teal-100 text-teal-800 font-bold px-1 rounded">
                                              D2: -{quote.discount2Value}{quote.discount2Type === 'percent' ? '%' : ''}
                                            </span>
                                          )}
                                          {quote.moq && (
                                            <span>Min: {quote.moq}</span>
                                          )}
                                          {quote.leadTimeDays !== undefined && (
                                            <span>Kirim: {quote.leadTimeDays} hari</span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => onEditQuote(product, quote)}
                                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer flex items-center gap-1"
                                      >
                                        <Edit className="w-3 h-3 text-slate-500" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeleteQuote(product.id, quote.id)}
                                        className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium transition-colors cursor-pointer flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-500" />
                                        <span>Hapus</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
