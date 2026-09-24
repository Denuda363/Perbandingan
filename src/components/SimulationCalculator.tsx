import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  ShoppingCart, 
  TrendingDown, 
  TrendingUp,
  Award, 
  Printer, 
  RotateCcw, 
  Plus, 
  Minus,
  Trash2, 
  Building2,
  Check,
  Receipt,
  Layers,
  Search,
  Sparkles,
  ArrowRight,
  Info,
  Sliders,
  DollarSign
} from 'lucide-react';
import { Product, Supplier, AppSettings, DEFAULT_APP_SETTINGS, DiscountType, MarginType } from '../types';
import { formatRupiah, getProductPriceStats, calculateSellingPrice, calculateMarginFormula } from '../utils/formatters';

interface SimulationCalculatorProps {
  products: Product[];
  suppliers: Supplier[];
  settings?: AppSettings;
}

export const SimulationCalculator: React.FC<SimulationCalculatorProps> = ({
  products,
  suppliers,
  settings = DEFAULT_APP_SETTINGS,
}) => {
  // Main view mode in simulation: 'formula' (Rumus Margin) or 'basket' (Keranjang PO)
  const [subMode, setSubMode] = useState<'formula' | 'basket'>('formula');

  // FORMULA SIMULATION STATE
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  const stats = useMemo(() => {
    if (!activeProduct) return null;
    return getProductPriceStats(activeProduct);
  }, [activeProduct]);

  // Pricing inputs for the formula mode
  const [modalCost, setModalCost] = useState<number>(() => {
    const p = products[0];
    const s = p ? getProductPriceStats(p) : null;
    return s?.cheapestQuote?.hna || s?.cheapestQuote?.price || 100000;
  });

  const [d1Type, setD1Type] = useState<DiscountType>('percent');
  const [d1Val, setD1Val] = useState<number>(10);

  const [d2Type, setD2Type] = useState<DiscountType>('amount');
  const [d2Val, setD2Val] = useState<number>(2000);

  const [ppnActive, setPpnActive] = useState<boolean>(settings.ppnEnabled !== false);
  const [ppnRate, setPpnRate] = useState<number>(settings.ppnPercent || 11);

  const [marginKind, setMarginKind] = useState<MarginType>(settings.marginType || 'percent');
  const [marginVal, setMarginVal] = useState<number>(() => {
    return settings.marginType === 'amount' ? settings.marginAmountValue : settings.marginPercent;
  });

  const subCount = activeProduct?.subUnitCount || 10;
  const subName = activeProduct?.subUnitName || 'lembar';

  // Handler when selecting a product in Formula mode
  const handleProductPick = (prod: Product) => {
    setSelectedProductId(prod.id);
    const pStats = getProductPriceStats(prod);
    const bestQ = pStats.cheapestQuote;
    if (bestQ) {
      setModalCost(bestQ.hna || bestQ.price);
      if (bestQ.discount1Value !== undefined) {
        setD1Val(bestQ.discount1Value);
        setD1Type(bestQ.discount1Type || 'percent');
      } else if (bestQ.discountPercent) {
        setD1Val(bestQ.discountPercent);
        setD1Type('percent');
      } else {
        setD1Val(0);
      }

      if (bestQ.discount2Value !== undefined) {
        setD2Val(bestQ.discount2Value);
        setD2Type(bestQ.discount2Type || 'percent');
      } else {
        setD2Val(0);
      }

      if (bestQ.marginValue !== undefined) {
        setMarginVal(bestQ.marginValue);
        setMarginKind(bestQ.marginType || 'percent');
      }
    }
  };

  // Run the user's requested formula: (Modal - diskon 1 - diskon 2 + ppn) + margin
  const formulaResult = useMemo(() => {
    return calculateMarginFormula({
      modal: modalCost,
      discount1Value: d1Val,
      discount1Type: d1Type,
      discount2Value: d2Val,
      discount2Type: d2Type,
      ppnPercent: ppnRate,
      ppnEnabled: ppnActive,
      marginValue: marginVal,
      marginType: marginKind,
      roundingOption: settings.roundingOption,
      subUnitCount: subCount,
      subUnitName: subName,
    });
  }, [
    modalCost,
    d1Val,
    d1Type,
    d2Val,
    d2Type,
    ppnRate,
    ppnActive,
    marginVal,
    marginKind,
    settings.roundingOption,
    subCount,
    subName,
  ]);

  // BASKET SIMULATION STATE
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.slice(0, 4).forEach((p) => {
      initial[p.id] = 10;
    });
    return initial;
  });

  const handleQtyChange = (productId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, qty),
    }));
  };

  const handleResetBasket = () => {
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

  const selectedProducts = products.filter((p) => (quantities[p.id] || 0) > 0);

  let optimizedTotalCost = 0;
  let worstTotalCost = 0;
  
  const optimizedBreakdown = selectedProducts.map((p) => {
    const qty = quantities[p.id] || 0;
    const pStats = getProductPriceStats(p);
    const itemCheapestCost = (pStats.cheapestQuote?.price || 0) * qty;
    const itemExpensiveCost = (pStats.expensiveQuote?.price || pStats.cheapestQuote?.price || 0) * qty;
    
    optimizedTotalCost += itemCheapestCost;
    worstTotalCost += itemExpensiveCost;

    return {
      product: p,
      qty,
      bestQuote: pStats.cheapestQuote,
      totalCost: itemCheapestCost,
    };
  });

  const totalSavings = worstTotalCost - optimizedTotalCost;
  const savingsPct = worstTotalCost > 0 ? Math.round((totalSavings / worstTotalCost) * 100) : 0;

  // Single supplier breakdown
  const singleSupplierTotals = suppliers.map((sup) => {
    let total = 0;
    let fulfilledCount = 0;
    const missingProducts: Product[] = [];

    selectedProducts.forEach((p) => {
      const qty = quantities[p.id] || 0;
      const quote = p.quotes.find((q) => q.supplierId === sup.id || q.supplierName === sup.name);

      if (quote) {
        total += quote.price * qty;
        fulfilledCount++;
      } else {
        const pStats = getProductPriceStats(p);
        total += (pStats.cheapestQuote?.price || 0) * qty;
        missingProducts.push(p);
      }
    });

    return {
      supplier: sup,
      total,
      fulfilledCount,
      totalRequested: selectedProducts.length,
      isComplete: fulfilledCount === selectedProducts.length,
      missingProducts,
    };
  }).sort((a, b) => a.total - b.total);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Mode Toggle */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Calculator className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Simulasi Perhitungan Harga & Margin Apotek
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 font-mono mt-0.5">
                (Modal − Diskon 1 − Diskon 2 + PPN) + Margin
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex bg-black/30 p-1 rounded-xl border border-white/10 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubMode('formula')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subMode === 'formula'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Kalkulator Rumus Margin</span>
          </button>
          <button
            type="button"
            onClick={() => setSubMode('basket')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subMode === 'basket'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Simulasi Keranjang PO ({selectedProducts.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-MODE 1: KALKULATOR RUMUS MARGIN LENGKAP              */}
      {/* ========================================================= */}
      {subMode === 'formula' && (
        <div className="space-y-6">
          
          {/* Product Quick Selector Chips */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                Pilih Produk dari Katalog untuk Uji Rumus:
              </label>
              {activeProduct && (
                <span className="text-xs text-slate-500 font-medium">
                  {activeProduct.packaging || activeProduct.defaultUnit} • {activeProduct.packContent || `1 Box = ${subCount} ${subName}`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {products.map((p) => {
                const isSelected = p.id === selectedProductId;
                const pStats = getProductPriceStats(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProductPick(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 text-left cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block">{p.name}</span>
                    <span className={`text-[10px] block font-mono ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {pStats.minPrice > 0 ? `Termurah: ${formatRupiah(pStats.minPrice)}` : 'Belum ada harga'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Formula Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Interactive Inputs (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Input Komponen Rumus
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Fleksibel % atau Rp
                </span>
              </div>

              {/* 1. Modal Dasar / HNA */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-900">
                    1. Modal Pokok / HNA (per {activeProduct?.defaultUnit || 'Box'}):
                  </label>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {formatRupiah(modalCost)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={modalCost}
                    onChange={(e) => setModalCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-10 pr-4 py-2.5 text-base sm:text-lg font-black text-slate-900 border-2 border-slate-200 focus:border-emerald-500 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none transition-all font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {[10000, 25000, 50000, 100000, 250000, 500000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setModalCost(preset)}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border cursor-pointer ${
                        modalCost === preset
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {formatRupiah(preset)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Diskon 1 & Diskon 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                
                {/* Diskon 1 */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      2. Diskon 1 (Reguler)
                    </label>
                    <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-300 text-xs">
                      <button
                        type="button"
                        onClick={() => setD1Type('percent')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                          d1Type === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setD1Type('amount')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                          d1Type === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        Rp
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    {d1Type === 'amount' && (
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                    )}
                    <input
                      type="number"
                      step={d1Type === 'percent' ? '0.5' : '1000'}
                      min="0"
                      value={d1Val}
                      onChange={(e) => setD1Val(parseFloat(e.target.value) || 0)}
                      className={`w-full py-2 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                        d1Type === 'amount' ? 'pl-8 pr-3' : 'pl-3 pr-8'
                      }`}
                    />
                    {d1Type === 'percent' && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    )}
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {d1Type === 'percent'
                      ? [0, 5, 10, 13.64, 15, 20].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => { setD1Type('percent'); setD1Val(p); }}
                            className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                              d1Val === p && d1Type === 'percent' ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {p}%
                          </button>
                        ))
                      : [1000, 2500, 5000, 10000].map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => { setD1Type('amount'); setD1Val(a); }}
                            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                              d1Val === a && d1Type === 'amount' ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {formatRupiah(a)}
                          </button>
                        ))}
                  </div>

                  <div className="text-[11px] text-emerald-800 font-semibold text-right">
                    Potongan: −{formatRupiah(formulaResult.discount1Amount)}
                  </div>
                </div>

                {/* Diskon 2 */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      3. Diskon 2 (Cash / Tambahan)
                    </label>
                    <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-300 text-xs">
                      <button
                        type="button"
                        onClick={() => setD2Type('percent')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                          d2Type === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setD2Type('amount')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                          d2Type === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        Rp
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    {d2Type === 'amount' && (
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                    )}
                    <input
                      type="number"
                      step={d2Type === 'percent' ? '0.5' : '500'}
                      min="0"
                      value={d2Val}
                      onChange={(e) => setD2Val(parseFloat(e.target.value) || 0)}
                      className={`w-full py-2 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                        d2Type === 'amount' ? 'pl-8 pr-3' : 'pl-3 pr-8'
                      }`}
                    />
                    {d2Type === 'percent' && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    )}
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {d2Type === 'percent'
                      ? [0, 1.5, 2, 2.5, 5].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => { setD2Type('percent'); setD2Val(p); }}
                            className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                              d2Val === p && d2Type === 'percent' ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {p}%
                          </button>
                        ))
                      : [1000, 2000, 3000, 5000].map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => { setD2Type('amount'); setD2Val(a); }}
                            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                              d2Val === a && d2Type === 'amount' ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {formatRupiah(a)}
                          </button>
                        ))}
                  </div>

                  <div className="text-[11px] text-emerald-800 font-semibold text-right">
                    Potongan: −{formatRupiah(formulaResult.discount2Amount)}
                  </div>
                </div>

              </div>

              {/* 3. PPN & Margin Apotek */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                
                {/* PPN */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                      <span>4. Pajak PPN</span>
                    </label>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ppnActive}
                        onChange={(e) => setPpnActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="ml-1.5 text-[11px] font-bold text-slate-700">
                        {ppnActive ? 'Aktif' : '0%'}
                      </span>
                    </label>
                  </div>

                  {ppnActive ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={ppnRate}
                          onChange={(e) => setPpnRate(parseFloat(e.target.value) || 0)}
                          className="w-full py-1.5 pl-3 pr-8 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                      <span className="text-xs font-mono text-purple-700 font-bold">
                        +{formatRupiah(formulaResult.ppnAmount)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-1">
                      Faktur Bebas Pajak PPN (0%)
                    </p>
                  )}
                </div>

                {/* Margin */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>5. Margin Keuntungan</span>
                    </label>

                    <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-300 text-xs">
                      <button
                        type="button"
                        onClick={() => setMarginKind('percent')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                          marginKind === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarginKind('amount')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                          marginKind === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        Rp
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    {marginKind === 'amount' && (
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                    )}
                    <input
                      type="number"
                      step={marginKind === 'percent' ? '0.5' : '1000'}
                      min="0"
                      value={marginVal}
                      onChange={(e) => setMarginVal(parseFloat(e.target.value) || 0)}
                      className={`w-full py-1.5 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                        marginKind === 'amount' ? 'pl-8 pr-3' : 'pl-3 pr-8'
                      }`}
                    />
                    {marginKind === 'percent' && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    {marginKind === 'percent'
                      ? [15, 20, 25, 30, 35].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => { setMarginKind('percent'); setMarginVal(p); }}
                            className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                              marginVal === p && marginKind === 'percent' ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {p}%
                          </button>
                        ))
                      : [5000, 10000, 15000, 20000].map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => { setMarginKind('amount'); setMarginVal(a); }}
                            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                              marginVal === a && marginKind === 'amount' ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {formatRupiah(a)}
                          </button>
                        ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column: Visual Formula Breakdown & Selling Price Result (5 cols) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-emerald-500/30">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                      Rincian Rumus Step-by-Step
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-300">
                    1 Box = {subCount} {subName}
                  </span>
                </div>

                {/* Calculation Flow */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>1. Modal Dasar / HNA:</span>
                    <span className="font-mono font-bold text-white">{formatRupiah(formulaResult.modal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span>2. − Diskon 1 ({formulaResult.discount1Type === 'percent' ? `${formulaResult.discount1Value}%` : 'Rp'}):</span>
                    <span className="font-mono text-emerald-400 font-bold">−{formatRupiah(formulaResult.discount1Amount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span>3. − Diskon 2 ({formulaResult.discount2Type === 'percent' ? `${formulaResult.discount2Value}%` : 'Rp'}):</span>
                    <span className="font-mono text-emerald-400 font-bold">−{formatRupiah(formulaResult.discount2Amount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-emerald-200 font-bold pt-1.5 border-t border-white/10">
                    <span>Modal Beli Bersih (Net):</span>
                    <span className="font-mono text-white text-sm">{formatRupiah(formulaResult.netCostAfterDiscounts)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span>4. + PPN ({formulaResult.ppnPercent}%):</span>
                    <span className="font-mono text-purple-300">+{formatRupiah(formulaResult.ppnAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-cyan-200 font-semibold pt-1 border-t border-white/10">
                    <span>Total Modal + PPN:</span>
                    <span className="font-mono text-cyan-300">{formatRupiah(formulaResult.costWithPpn)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span>5. + Margin ({formulaResult.marginType === 'percent' ? `${formulaResult.marginValue}%` : formatRupiah(formulaResult.marginValue)}):</span>
                    <span className="font-mono text-amber-300 font-bold">+{formatRupiah(formulaResult.marginAmount)}</span>
                  </div>
                </div>

                {/* Formula Text */}
                <div className="p-3 bg-black/50 rounded-xl border border-white/10 text-[11px] font-mono text-emerald-300/90 leading-relaxed overflow-x-auto">
                  {formulaResult.formulaString}
                </div>
              </div>

              {/* Final Selling Price Callout Card */}
              <div className="mt-5 pt-4 border-t border-white/10 bg-emerald-950/80 p-4 rounded-xl border border-emerald-500/40">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs uppercase font-extrabold text-emerald-200 tracking-wider block">
                      Rekomendasi Harga Jual:
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono block mt-1">
                      {formatRupiah(formulaResult.sellingPrice)}
                    </span>
                    <span className="text-xs text-emerald-300 font-medium">
                      per {activeProduct?.defaultUnit || 'Box'}
                    </span>
                  </div>

                  <div className="text-right bg-black/40 p-2.5 rounded-lg border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Per {subName}</span>
                    <span className="text-base font-bold text-white font-mono block">
                      {formatRupiah(formulaResult.sellingPricePerSubUnit)}
                    </span>
                    <span className="text-[10px] text-emerald-300">
                      Laba: +{formatRupiah(formulaResult.profitPerSubUnit)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100">
                  <span>Estimasi Laba Kotor per Box:</span>
                  <span className="font-bold text-white font-mono">
                    +{formatRupiah(formulaResult.profitPerUnit)} ({formulaResult.profitPercentage}%)
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Supplier Quotes Comparison Table for the active product using this formula */}
          {activeProduct && activeProduct.quotes.length > 0 && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Perbandingan Penawaran Supplier untuk {activeProduct.name}</span>
                </h4>
                <span className="text-xs text-slate-500">
                  {activeProduct.quotes.length} Supplier Tersedia
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Supplier</th>
                      <th className="py-2.5 px-3">Modal Awal</th>
                      <th className="py-2.5 px-3">Diskon 1</th>
                      <th className="py-2.5 px-3">Diskon 2</th>
                      <th className="py-2.5 px-3">Modal Beli Net</th>
                      <th className="py-2.5 px-3">+ PPN</th>
                      <th className="py-2.5 px-3">Rekomendasi Jual</th>
                      <th className="py-2.5 px-3">Per {subName}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeProduct.quotes.map((q, idx) => {
                      const isCheapest = stats?.cheapestQuote?.id === q.id;
                      const qSelling = calculateSellingPrice(q.price, settings, {
                        discount1Value: q.discount1Value,
                        discount1Type: q.discount1Type,
                        discount2Value: q.discount2Value,
                        discount2Type: q.discount2Type,
                        marginValue: q.marginValue,
                        marginType: q.marginType,
                      });

                      return (
                        <tr key={q.id} className={isCheapest ? 'bg-emerald-50/50 font-semibold' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3 flex items-center gap-1.5">
                            <span className="text-slate-900 font-bold">{q.supplierName}</span>
                            {isCheapest && (
                              <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                                Termurah
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {formatRupiah(q.hna || q.price)}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-700">
                            {q.discount1Value ? (q.discount1Type === 'amount' ? formatRupiah(q.discount1Value) : `${q.discount1Value}%`) : (q.discountPercent ? `${q.discountPercent}%` : '0%')}
                          </td>
                          <td className="py-2.5 px-3 text-teal-700">
                            {q.discount2Value ? (q.discount2Type === 'amount' ? formatRupiah(q.discount2Value) : `${q.discount2Value}%`) : '0%'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {formatRupiah(q.price)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-purple-700">
                            {formatRupiah(q.priceWithPpn || qSelling.costWithPpn)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-extrabold text-emerald-800">
                            {formatRupiah(q.sellingPrice || qSelling.sellingPrice)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            ~{formatRupiah(q.sellingPricePerSubUnit || Math.round((q.sellingPrice || qSelling.sellingPrice) / subCount))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-MODE 2: SIMULASI KERANJANG PENGADAAN (MULTI PRODUK)  */}
      {/* ========================================================= */}
      {subMode === 'basket' && (
        <div className="space-y-6">
          {/* Header Controls for Basket */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Daftar Produk Rencana Pemesanan (PO)
              </h3>
              <p className="text-xs text-slate-500">
                Tentukan jumlah kuantiti (box) obat yang ingin Anda order ke supplier
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleSelectAll(10)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Pilih Semua (10 Box)
              </button>
              <button
                type="button"
                onClick={handleResetBasket}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Product Items in Basket */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-150">
            {products.map((p) => {
              const qty = quantities[p.id] || 0;
              const pStats = getProductPriceStats(p);
              const bestQuote = pStats.cheapestQuote;
              const subtotal = (bestQuote?.price || 0) * qty;

              return (
                <div
                  key={p.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    qty > 0 ? 'bg-emerald-50/20' : 'bg-white'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                      {p.company && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                          {p.company}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.packaging || p.defaultUnit} • Termurah: {bestQuote ? `${formatRupiah(bestQuote.price)} (${bestQuote.supplierName})` : 'Belum ada harga'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    {/* Qty Stepper */}
                    <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(p.id, qty - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
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
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right min-w-[110px]">
                      <span className="text-[10px] text-slate-400 block font-semibold">Subtotal Termurah:</span>
                      <span className="text-sm font-extrabold text-slate-900 font-mono">
                        {formatRupiah(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Results Comparison for Multi-Item PO */}
          {selectedProducts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Option A: Split PO (Smart Optimization) */}
              <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-5 shadow-lg space-y-4 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-300" />
                    <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-200">
                      Opsi 1: Split Order Cerdas (Termurah)
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    Rekomendasi Sistem
                  </span>
                </div>

                <div>
                  <span className="text-xs text-emerald-100/80 block">Total Faktur Modal Beli:</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                    {formatRupiah(optimizedTotalCost)}
                  </span>
                  {totalSavings > 0 && (
                    <div className="text-xs text-emerald-200 mt-1 flex items-center gap-1 font-semibold">
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                      <span>Hemat {formatRupiah(totalSavings)} ({savingsPct}%) dibanding opsi termahal</span>
                    </div>
                  )}
                </div>

                <div className="bg-black/30 rounded-xl p-3 space-y-2 border border-white/10 text-xs">
                  <span className="font-bold text-slate-300 block text-[11px] uppercase">Rincian Split ke Supplier:</span>
                  {optimizedBreakdown.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-slate-200">
                      <span>{item.qty}x {item.product.name} ({item.bestQuote?.supplierName}):</span>
                      <span className="font-mono text-emerald-300 font-bold">{formatRupiah(item.totalCost)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Option B: Single Supplier Comparison */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-700" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Opsi 2: Order ke Satu Vendor Saja
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Praktis 1 Surat Jalan
                  </span>
                </div>

                <div className="space-y-2.5">
                  {singleSupplierTotals.slice(0, 4).map((sup, idx) => {
                    const diff = sup.total - optimizedTotalCost;
                    return (
                      <div key={sup.supplier.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{sup.supplier.name}</span>
                          <span className="text-[11px] text-slate-500">
                            {sup.isComplete ? 'Menyediakan semua item' : `${sup.fulfilledCount}/${sup.totalRequested} item tersedia`}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            {formatRupiah(sup.total)}
                          </span>
                          {diff > 0 ? (
                            <span className="text-[10px] text-amber-700 font-semibold">
                              +{formatRupiah(diff)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold">
                              Sama dengan split termurah
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};
