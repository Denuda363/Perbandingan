import React from 'react';
import { Package, Truck, Tag, TrendingDown, Sparkles } from 'lucide-react';
import { Product, Supplier } from '../types';
import { formatRupiah, getProductPriceStats } from '../utils/formatters';

interface SummaryStatsProps {
  products: Product[];
  suppliers: Supplier[];
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ products, suppliers }) => {
  const totalQuotes = products.reduce((sum, p) => sum + p.quotes.length, 0);

  // Calculate total potential unit savings if choosing cheapest vs expensive
  let totalPotentialUnitSavings = 0;
  let productsWithSavings = 0;
  let highestPercentageSaving = 0;
  let bestSavingProduct = '';

  products.forEach((p) => {
    const stats = getProductPriceStats(p);
    if (stats.quoteCount >= 2 && stats.difference > 0) {
      totalPotentialUnitSavings += stats.difference;
      productsWithSavings++;
      if (stats.savingsPercentage > highestPercentageSaving) {
        highestPercentageSaving = stats.savingsPercentage;
        bestSavingProduct = p.name;
      }
    }
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      
      {/* Stat 1: Total Produk */}
      <div 
        id="stat-total-products" 
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between"
      >
        <div>
          <p className="text-xs font-medium text-slate-500">Total Produk</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            {products.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 inline-block">
            {productsWithSavings} produk memiliki &ge; 2 vendor
          </span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5" />
        </div>
      </div>

      {/* Stat 2: Total Supplier */}
      <div 
        id="stat-total-suppliers" 
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between"
      >
        <div>
          <p className="text-xs font-medium text-slate-500">Supplier Terhubung</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            {suppliers.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 inline-block">
            {totalQuotes} penawaran harga aktif
          </span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5" />
        </div>
      </div>

      {/* Stat 3: Total Potensi Hemat Satuan */}
      <div 
        id="stat-potential-savings" 
        className="bg-white p-4 rounded-xl border border-emerald-200 bg-linear-to-br from-white to-emerald-50/40 shadow-xs flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold text-emerald-800">Akumulasi Selisih</p>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">
            {formatRupiah(totalPotentialUnitSavings)}
          </p>
          <span className="text-[11px] text-emerald-600 mt-0.5 inline-block font-medium">
            Potensi hemat per 1 unit pembelian
          </span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <TrendingDown className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>

      {/* Stat 4: Rekor Diskon / Efisiensi */}
      <div 
        id="stat-top-saving" 
        className="bg-white p-4 rounded-xl border border-amber-200 bg-linear-to-br from-white to-amber-50/40 shadow-xs flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold text-amber-800">Hemat Maksimal</p>
            <Sparkles className="w-3 h-3 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-900 mt-0.5">
            Hingga {highestPercentageSaving}%
          </p>
          <span className="text-[11px] text-amber-700 mt-0.5 block truncate max-w-[140px] font-medium" title={bestSavingProduct}>
            {bestSavingProduct || 'Bandingkan vendor'}
          </span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Tag className="w-5 h-5" />
        </div>
      </div>

    </div>
  );
};
