import React from 'react';
import { Package, Truck, Tag, TrendingDown, ArrowUpRight } from 'lucide-react';
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
      
      {/* Metric 1: Total Katalog Produk */}
      <div 
        id="stat-total-products" 
        className="bg-white p-4 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Produk
          </span>
          <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
            {products.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            <strong className="text-slate-700 font-semibold">{productsWithSavings}</strong> produk &ge; 2 vendor
          </p>
        </div>
      </div>

      {/* Metric 2: Jaringan Supplier PBF */}
      <div 
        id="stat-total-suppliers" 
        className="bg-white p-4 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            PBF Terdaftar
          </span>
          <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
            {suppliers.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            <strong className="text-slate-700 font-semibold">{totalQuotes}</strong> penawaran harga aktif
          </p>
        </div>
      </div>

      {/* Metric 3: Akumulasi Selisih Beli */}
      <div 
        id="stat-potential-savings" 
        className="bg-white p-4 sm:p-4.5 rounded-2xl border border-emerald-200/90 shadow-2xs flex flex-col justify-between bg-emerald-50/20"
      >
        <div className="flex items-center justify-between text-emerald-800">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Akumulasi Selisih
          </span>
          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <p className="text-xl sm:text-2xl font-bold text-emerald-800 tracking-tight font-mono">
            {formatRupiah(totalPotentialUnitSavings)}
          </p>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
            Potensi hemat per 1 unit belanja
          </p>
        </div>
      </div>

      {/* Metric 4: Rekor Efisiensi Penghematan */}
      <div 
        id="stat-top-saving" 
        className="bg-white p-4 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hemat Tertinggi
          </span>
          <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
            {highestPercentageSaving > 0 ? `-${highestPercentageSaving}%` : '0%'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[180px]" title={bestSavingProduct || 'Bandingkan vendor'}>
            {bestSavingProduct ? `Pada ${bestSavingProduct}` : 'Bandingkan vendor'}
          </p>
        </div>
      </div>

    </div>
  );
};
