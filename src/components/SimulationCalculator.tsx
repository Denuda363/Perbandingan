import React, { useState } from 'react';
import { 
  Calculator, 
  ShoppingCart, 
  TrendingDown, 
  Award, 
  Printer, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Building2,
  Check
} from 'lucide-react';
import { Product, Supplier } from '../types';
import { formatRupiah, getProductPriceStats } from '../utils/formatters';

interface SimulationCalculatorProps {
  products: Product[];
  suppliers: Supplier[];
}

export const SimulationCalculator: React.FC<SimulationCalculatorProps> = ({
  products,
  suppliers,
}) => {
  // State: map of productId -> quantity to buy
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.slice(0, 4).forEach((p) => {
      initial[p.id] = 10; // default 10 units
    });
    return initial;
  });

  const handleQtyChange = (productId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, qty),
    }));
  };

  const handleReset = () => {
    const reset: Record<string, number> = {};
    products.slice(0, 3).forEach((p) => {
      reset[p.id] = 10;
    });
    setQuantities(reset);
  };

  const handleSelectAll = (qty: number) => {
    const all: Record<string, number> = {};
    products.forEach((p) => {
      all[p.id] = qty;
    });
    setQuantities(all);
  };

  // Selected products list (qty > 0)
  const selectedProducts = products.filter((p) => (quantities[p.id] || 0) > 0);

  // 1. Calculate Optimized Split Order (Buy each item from its cheapest supplier)
  let optimizedTotalCost = 0;
  let worstTotalCost = 0;
  
  const optimizedBreakdown = selectedProducts.map((p) => {
    const qty = quantities[p.id] || 0;
    const stats = getProductPriceStats(p);
    const itemCheapestCost = (stats.cheapestQuote?.price || 0) * qty;
    const itemExpensiveCost = (stats.expensiveQuote?.price || stats.cheapestQuote?.price || 0) * qty;
    
    optimizedTotalCost += itemCheapestCost;
    worstTotalCost += itemExpensiveCost;

    return {
      product: p,
      qty,
      bestQuote: stats.cheapestQuote,
      totalCost: itemCheapestCost,
      worstCost: itemExpensiveCost,
      savings: itemExpensiveCost - itemCheapestCost,
    };
  });

  const totalSaved = worstTotalCost - optimizedTotalCost;
  const savingsPct = worstTotalCost > 0 ? Math.round((totalSaved / worstTotalCost) * 100) : 0;

  // 2. Calculate Single-Supplier Totals (What if buyer prefers buying everything from 1 vendor?)
  const singleSupplierTotals = suppliers.map((sup) => {
    let total = 0;
    let fulfilledCount = 0;
    const itemsDetail: { productName: string; price: number; subtotal: number }[] = [];

    selectedProducts.forEach((p) => {
      const quote = p.quotes.find(
        (q) => q.supplierId === sup.id || q.supplierName.toLowerCase() === sup.name.toLowerCase()
      );
      if (quote) {
        const qty = quantities[p.id] || 0;
        const subtotal = quote.price * qty;
        total += subtotal;
        fulfilledCount++;
        itemsDetail.push({ productName: p.name, price: quote.price, subtotal });
      }
    });

    return {
      supplier: sup,
      total,
      fulfilledCount,
      totalRequested: selectedProducts.length,
      isComplete: fulfilledCount === selectedProducts.length && selectedProducts.length > 0,
      itemsDetail,
    };
  }).filter((s) => s.fulfilledCount > 0).sort((a, b) => {
    // prioritize complete orders, then lowest total
    if (a.isComplete && !b.isComplete) return -1;
    if (!a.isComplete && b.isComplete) return 1;
    return a.total - b.total;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Kalkulator Simulasi Pembelian & Penghematan
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Masukkan estimasi jumlah barang yang ingin dipesan untuk melihat total biaya, supplier termurah, dan penghematan langsung.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleSelectAll(20)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            Pilih Semua (20 unit)
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekomendasi PO</span>
          </button>
        </div>
      </div>

      {/* Result Cards: Savings Summary */}
      {selectedProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Total Biaya Teroptimasi */}
          <div className="bg-white p-5 rounded-xl border border-emerald-300 bg-linear-to-br from-white to-emerald-50/60 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Total Biaya Termurah (Split)
              </span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 mt-2">
              {formatRupiah(optimizedTotalCost)}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              Beli setiap barang dari supplier termurah masing-masing.
            </p>
          </div>

          {/* Card 2: Penghematan */}
          <div className="bg-white p-5 rounded-xl border border-blue-200 bg-linear-to-br from-white to-blue-50/50 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Total Uang Yang Dihemat
              </span>
              <TrendingDown className="w-4 h-4 text-blue-600 stroke-[2.5]" />
            </div>
            <p className="text-2xl font-extrabold text-blue-700 mt-2">
              {formatRupiah(totalSaved)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Hemat <span className="font-bold">{savingsPct}%</span> dibanding opsi harga termahal ({formatRupiah(worstTotalCost)}).
            </p>
          </div>

          {/* Card 3: Total Produk & Item */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Rangkuman Pesanan
              </span>
              <ShoppingCart className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">
              {selectedProducts.length} Produk
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Total kuantiti:{' '}
              <span className="font-bold text-slate-700">
                {Object.values(quantities).reduce((a, b) => a + (b || 0), 0)} unit
              </span>
            </p>
          </div>

        </div>
      )}

      {/* Main Simulation Table: Items & Quantities */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Daftar Produk & Jumlah Rencana Pembelian
          </h3>
          <span className="text-xs text-slate-500">
            Atur kuantiti di bawah ini
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3 sm:p-4 min-w-[200px]">Nama Produk</th>
                <th className="p-3 sm:p-4 w-[130px] text-center">Jumlah Pembelian</th>
                <th className="p-3 sm:p-4 min-w-[160px]">Supplier Pilihan (Termurah)</th>
                <th className="p-3 sm:p-4 min-w-[120px] text-right">Harga Satuan</th>
                <th className="p-3 sm:p-4 min-w-[130px] text-right">Subtotal Biaya</th>
                <th className="p-3 sm:p-4 min-w-[120px] text-right text-emerald-800">Potensi Hemat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {products.map((p) => {
                const qty = quantities[p.id] || 0;
                const stats = getProductPriceStats(p);
                const subtotal = (stats.cheapestQuote?.price || 0) * qty;
                const itemSavings = stats.difference * qty;

                return (
                  <tr 
                    key={p.id} 
                    className={`hover:bg-slate-50 transition-colors ${qty > 0 ? 'bg-white' : 'bg-slate-50/40 text-slate-400'}`}
                  >
                    <td className="p-3 sm:p-4">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.category} • Satuan: {p.defaultUnit}
                      </p>
                    </td>

                    {/* Quantity Input */}
                    <td className="p-3 sm:p-4 text-center">
                      <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(p.id, qty - 1)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => handleQtyChange(p.id, parseInt(e.target.value) || 0)}
                          className="w-14 text-center text-xs font-bold text-slate-900 py-1 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleQtyChange(p.id, qty + 1)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Supplier Name */}
                    <td className="p-3 sm:p-4">
                      {stats.cheapestQuote ? (
                        <div>
                          <span className="font-semibold text-slate-900">
                            {stats.cheapestQuote.supplierName}
                          </span>
                          {stats.quoteCount > 1 && (
                            <span className="block text-[10px] text-emerald-700 font-medium">
                              🏆 Menang dari {stats.quoteCount} supplier
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Belum ada harga</span>
                      )}
                    </td>

                    {/* Unit Price */}
                    <td className="p-3 sm:p-4 text-right">
                      {stats.cheapestQuote ? (
                        <span className="font-semibold text-slate-800">
                          {formatRupiah(stats.cheapestQuote.price)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Subtotal */}
                    <td className="p-3 sm:p-4 text-right">
                      <span className={`font-bold ${qty > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                        {formatRupiah(subtotal)}
                      </span>
                    </td>

                    {/* Item Savings */}
                    <td className="p-3 sm:p-4 text-right">
                      {itemSavings > 0 ? (
                        <div>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {formatRupiah(itemSavings)}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            ({stats.savingsPercentage}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison: What if Order from a Single Supplier? */}
      {selectedProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="mb-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              Perbandingan Jika Membeli Dari 1 Supplier Sekaligus
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kadang pembelian disatukan ke 1 vendor untuk menghemat ongkos kirim atau administrasi PO. Berikut total biayanya:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {singleSupplierTotals.map((item, index) => {
              const diffFromOptimized = item.total - optimizedTotalCost;
              const isBestSingle = index === 0 && item.isComplete;

              return (
                <div
                  key={item.supplier.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isBestSingle
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {item.supplier.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {item.fulfilledCount} dari {item.totalRequested} produk tersedia
                      </p>
                    </div>
                    {isBestSingle && (
                      <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">
                        Vendor Tunggal Terbaik
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/80">
                    <p className="text-xs text-slate-500">Total Faktur:</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      {formatRupiah(item.total)}
                    </p>

                    {item.isComplete ? (
                      <div className="mt-1 text-[11px]">
                        {diffFromOptimized === 0 ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Sama dengan opsi termurah
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            +{formatRupiah(diffFromOptimized)} lebih tinggi dari opsi split
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-block mt-1 text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-medium">
                        Perlu split: {item.totalRequested - item.fulfilledCount} produk tidak disediakan
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
  );
};
