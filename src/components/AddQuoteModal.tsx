import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  DollarSign, 
  Building2, 
  Calendar, 
  Clock, 
  Boxes, 
  Check, 
  Calculator,
  Search,
  ChevronDown,
  TrendingDown,
  CheckCircle2,
  Percent,
  Plus,
  Minus,
  Sparkles,
  Package,
  Award,
  AlertCircle
} from 'lucide-react';
import { Product, Supplier, SupplierQuote } from '../types';
import { calculatePharmaPricing, formatRupiah, getProductPriceStats } from '../utils/formatters';

interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  selectedProduct?: Product | null;
  quoteToEdit?: SupplierQuote | null;
  onSaveQuote: (productId: string, quote: Partial<SupplierQuote>) => void;
}

export const AddQuoteModal: React.FC<AddQuoteModalProps> = ({
  isOpen,
  onClose,
  products,
  suppliers,
  selectedProduct,
  quoteToEdit,
  onSaveQuote,
}) => {
  const [productId, setProductId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [priceInputMode, setPriceInputMode] = useState<'direct' | 'hna_discount'>('direct');
  
  // Price state values
  const [hna, setHna] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  
  const [unit, setUnit] = useState('');
  const [moq, setMoq] = useState<string>('1');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('1');
  const [notes, setNotes] = useState('');
  const [inStock, setInStock] = useState(true);

  // Search state for product selector
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === productId) || selectedProduct || products[0] || null;
  }, [products, productId, selectedProduct]);

  const subCount = activeProduct?.subUnitCount || 10;
  const subName = activeProduct?.subUnitName || 'lembar';

  useEffect(() => {
    if (selectedProduct) {
      setProductId(selectedProduct.id);
      setUnit(selectedProduct.defaultUnit);
    } else if (products.length > 0) {
      setProductId(products[0].id);
      setUnit(products[0].defaultUnit);
    }

    if (quoteToEdit) {
      setSupplierName(quoteToEdit.supplierName);
      setHna(quoteToEdit.hna ? quoteToEdit.hna.toString() : quoteToEdit.price.toString());
      setDiscountPercent(quoteToEdit.discountPercent !== undefined ? quoteToEdit.discountPercent.toString() : '0');
      setPrice(quoteToEdit.price.toString());
      setUnit(quoteToEdit.unit);
      setMoq((quoteToEdit.moq || 1).toString());
      setLeadTimeDays((quoteToEdit.leadTimeDays || 1).toString());
      setNotes(quoteToEdit.notes || '');
      setInStock(quoteToEdit.inStock !== false);

      // If quote originally had discount, start on hna_discount mode; otherwise direct
      if (quoteToEdit.discountPercent && quoteToEdit.discountPercent > 0) {
        setPriceInputMode('hna_discount');
      } else {
        setPriceInputMode('direct');
      }
    } else {
      setSupplierName(suppliers[0]?.name || '');
      setHna('');
      setDiscountPercent('');
      setPrice('');
      setMoq('1');
      setLeadTimeDays('1');
      setNotes('');
      setInStock(true);
      setPriceInputMode('direct');
    }

    setProductSearchQuery('');
    setIsProductSelectorOpen(false);
  }, [selectedProduct, quoteToEdit, isOpen, products, suppliers]);

  // Pricing calculations
  const parsedHna = parseFloat(hna) || 0;
  const parsedDisk = parseFloat(discountPercent) || 0;
  const parsedPrice = parseFloat(price) || 0;

  const pharmaCalc = calculatePharmaPricing({
    hna: parsedHna,
    discountPercent: parsedDisk,
    hargaJadiBoxInput: parsedPrice > 0 ? parsedPrice : undefined,
    subUnitCount: subCount,
    subUnitName: subName,
  });

  // Filter products for search selector
  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        (p.genericName && p.genericName.toLowerCase().includes(q)) ||
        (p.company && p.company.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.packaging && p.packaging.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    });
  }, [products, productSearchQuery]);

  // When user selects a product from search
  const handleSelectProduct = (prod: Product) => {
    setProductId(prod.id);
    setUnit(prod.defaultUnit);
    setIsProductSelectorOpen(false);
    setProductSearchQuery('');
  };

  // Price change handlers with auto sync
  const handleDirectPriceChange = (val: string) => {
    setPrice(val);
    const numPrice = parseFloat(val) || 0;
    const numHna = parseFloat(hna) || 0;
    if (numHna > 0 && numPrice > 0 && numHna >= numPrice) {
      const calcDisk = parseFloat((((numHna - numPrice) / numHna) * 100).toFixed(2));
      setDiscountPercent(calcDisk.toString());
    }
  };

  const handleHnaChange = (val: string) => {
    setHna(val);
    const numHna = parseFloat(val) || 0;
    const numDisk = parseFloat(discountPercent) || 0;
    if (numHna > 0) {
      const calc = Math.max(0, Math.round(numHna * (1 - numDisk / 100)));
      setPrice(calc > 0 ? calc.toString() : '');
    }
  };

  const handleDiscountChange = (val: string) => {
    setDiscountPercent(val);
    const numDisk = parseFloat(val) || 0;
    const numHna = parseFloat(hna) || 0;
    if (numHna > 0) {
      const calc = Math.max(0, Math.round(numHna * (1 - numDisk / 100)));
      setPrice(calc > 0 ? calc.toString() : '');
    }
  };

  // Quick preset discount buttons (common in pharma procurement)
  const applyQuickDiscount = (pct: number) => {
    const pctStr = pct.toString();
    setDiscountPercent(pctStr);
    const numHna = parseFloat(hna) || 0;
    if (numHna > 0) {
      const calc = Math.max(0, Math.round(numHna * (1 - pct / 100)));
      setPrice(calc.toString());
    }
  };

  // Quick price adjustments (+/-)
  const adjustPriceBy = (delta: number) => {
    const current = parseFloat(price) || (pharmaCalc.hargaJadiBox > 0 ? pharmaCalc.hargaJadiBox : 0);
    const next = Math.max(0, current + delta);
    setPrice(next > 0 ? next.toString() : '');
    const numHna = parseFloat(hna) || 0;
    if (numHna > 0 && next > 0 && numHna >= next) {
      const calcDisk = parseFloat((((numHna - next) / numHna) * 100).toFixed(2));
      setDiscountPercent(calcDisk.toString());
    }
  };

  // Round price to nearest hundred
  const roundPriceToHundred = () => {
    const current = parseFloat(price) || 0;
    if (current > 0) {
      const rounded = Math.round(current / 100) * 100;
      setPrice(rounded.toString());
    }
  };

  // Check competitor price stats
  const competitorStats = useMemo(() => {
    if (!activeProduct) return null;
    return getProductPriceStats(activeProduct);
  }, [activeProduct]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrice = parsedPrice > 0 ? parsedPrice : pharmaCalc.hargaJadiBox;
    if (!productId || !supplierName.trim() || finalPrice <= 0) return;

    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === supplierName.trim().toLowerCase()
    );

    const quoteData: Partial<SupplierQuote> = {
      id: quoteToEdit ? quoteToEdit.id : `q-${Date.now()}`,
      supplierId: matchedSupplier ? matchedSupplier.id : `sup-${Date.now()}`,
      supplierName: supplierName.trim(),
      price: finalPrice,
      hna: parsedHna > 0 ? parsedHna : finalPrice,
      discountPercent: parsedDisk > 0 ? parsedDisk : 0,
      pricePerSubUnit: Math.round(finalPrice / subCount),
      priceWithPpn: Math.round(finalPrice * 1.11),
      unit: unit || activeProduct?.defaultUnit || 'Box',
      moq: parseInt(moq) || 1,
      leadTimeDays: parseInt(leadTimeDays) || 0,
      notes: notes.trim() || undefined,
      inStock,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    onSaveQuote(productId, quoteData);
    onClose();
  };

  // Comparison feedback for user
  const finalEffectivePrice = parsedPrice > 0 ? parsedPrice : pharmaCalc.hargaJadiBox;
  let priceComparisonBadge = null;
  if (competitorStats && competitorStats.quoteCount > 0 && finalEffectivePrice > 0) {
    // If editing existing quote, check against min price of OTHER quotes
    const otherQuotes = quoteToEdit 
      ? (activeProduct?.quotes || []).filter(q => q.id !== quoteToEdit.id)
      : (activeProduct?.quotes || []);

    if (otherQuotes.length > 0) {
      const otherMinPrice = Math.min(...otherQuotes.map(q => q.price));
      const otherCheapestQuote = otherQuotes.find(q => q.price === otherMinPrice);

      if (finalEffectivePrice < otherMinPrice) {
        const diff = otherMinPrice - finalEffectivePrice;
        priceComparisonBadge = (
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2 flex items-center justify-between text-xs text-emerald-900">
            <span className="font-bold flex items-center gap-1">
              <Award className="w-4 h-4 text-emerald-600" />
              Bakal Jadi Harga Termurah!
            </span>
            <span className="font-semibold text-emerald-700">
              Lebih hemat {formatRupiah(diff)} dari {otherCheapestQuote?.supplierName}
            </span>
          </div>
        );
      } else if (finalEffectivePrice > otherMinPrice) {
        const diff = finalEffectivePrice - otherMinPrice;
        priceComparisonBadge = (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 flex items-center justify-between text-xs text-amber-900">
            <span className="font-medium flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Lebih tinggi +{formatRupiah(diff)}
            </span>
            <span className="text-[11px] text-amber-800">
              Termurah saat ini: {formatRupiah(otherMinPrice)} ({otherCheapestQuote?.supplierName})
            </span>
          </div>
        );
      } else {
        priceComparisonBadge = (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-900 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>Sama dengan penawaran termurah saat ini ({formatRupiah(otherMinPrice)})</span>
          </div>
        );
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl w-full sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                {quoteToEdit ? 'Edit Penawaran Harga' : 'Tambah Penawaran Supplier'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {quoteToEdit ? `Mengubah harga dari ${quoteToEdit.supplierName}` : 'Bandingkan penawaran harga antar supplier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 active:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          
          {/* 1. SEARCHABLE PRODUCT SELECTOR */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Pilih Produk Farmasi <span className="text-rose-500">*</span>
              </label>
              {!quoteToEdit && products.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProductSelectorOpen(!isProductSelectorOpen);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isProductSelectorOpen ? 'Tutup Pencarian' : 'Cari Produk Lain'}</span>
                </button>
              )}
            </div>

            {/* Currently Selected Product Card */}
            {activeProduct && (
              <div 
                onClick={() => {
                  if (!quoteToEdit) {
                    setIsProductSelectorOpen(!isProductSelectorOpen);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }}
                className={`p-3 rounded-xl border transition-all ${
                  quoteToEdit
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-white border-slate-300 hover:border-emerald-500 cursor-pointer shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{activeProduct.name}</span>
                      {activeProduct.company && (
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                          {activeProduct.company}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {activeProduct.packaging || activeProduct.defaultUnit} • {activeProduct.packContent || `1 Box = ${subCount} ${subName}`}
                    </p>
                  </div>

                  {!quoteToEdit && (
                    <div className="shrink-0 text-emerald-700">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isProductSelectorOpen ? 'rotate-180' : ''}`} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SEARCH DROPDOWN POPUP */}
            {isProductSelectorOpen && !quoteToEdit && (
              <div className="border border-emerald-300 rounded-xl bg-white shadow-xl p-2.5 space-y-2 z-20">
                {/* Search input field */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Ketik nama obat (cth: Paracetamol), pabrik, kemasan..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                  />
                  {productSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setProductSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtered list */}
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Tidak ditemukan produk dengan kata kunci "{productSearchQuery}"
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const stats = getProductPriceStats(p);
                      const isSelected = p.id === productId;

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className={`p-2.5 text-xs flex items-center justify-between gap-2 hover:bg-emerald-50/60 cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50 font-bold' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">{p.name}</span>
                              {p.company && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-medium">
                                  {p.company}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {p.packaging || p.defaultUnit} • {p.packContent || `1 Box = ${p.subUnitCount || 10} lembar`}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            {stats.minPrice > 0 ? (
                              <span className="text-emerald-700 font-bold block text-[11px]">
                                Mulai {formatRupiah(stats.minPrice)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Belum ada harga</span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {p.quotes.length} vendor
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. SUPPLIER / VENDOR SELECTION */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nama Supplier / PBF Vendor <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                list="supplier-options-list"
                placeholder="Contoh: PT Kinariya atau PT Aman Farma"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <datalist id="supplier-options-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            {/* Quick Supplier Chips for Mobile */}
            {suppliers.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                  Pilihan Cepat:
                </span>
                {suppliers.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSupplierName(s.name)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 border ${
                      supplierName.toLowerCase() === s.name.toLowerCase()
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. HIGH USABILITY PRICE EDITOR */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3.5">
            
            {/* Mode Switcher: Harga Jadi Langsung VS Hitung HNA & Diskon */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-700" />
                <span>Input & Edit Harga Penawaran</span>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center bg-white/90 border border-amber-200 rounded-lg p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPriceInputMode('direct')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    priceInputMode === 'direct'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Harga Jadi Langsung
                </button>
                <button
                  type="button"
                  onClick={() => setPriceInputMode('hna_discount')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    priceInputMode === 'hna_discount'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  HNA & Diskon %
                </button>
              </div>
            </div>

            {/* TAB 1: HARGA JADI LANGSUNG (Paling Sering & Praktis) */}
            {priceInputMode === 'direct' ? (
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-900">
                      HARGA JADI (per {unit || activeProduct?.defaultUnit || 'Box'}) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-emerald-700 font-bold">
                      {parsedPrice > 0 ? formatRupiah(parsedPrice) : ''}
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      required
                      inputMode="numeric"
                      min="1"
                      step="100"
                      placeholder="9500"
                      value={price}
                      onChange={(e) => handleDirectPriceChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-lg sm:text-xl font-extrabold text-slate-900 border-2 border-emerald-500 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Quick Step Adjustment Buttons for Mobile */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Pintasan Tambah / Kurang Cepat:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => adjustPriceBy(1000)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg cursor-pointer transition-colors"
                    >
                      +1.000
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustPriceBy(5000)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg cursor-pointer transition-colors"
                    >
                      +5.000
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustPriceBy(10000)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg cursor-pointer transition-colors"
                    >
                      +10.000
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustPriceBy(-1000)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg cursor-pointer transition-colors"
                    >
                      -1.000
                    </button>
                    <button
                      type="button"
                      onClick={roundPriceToHundred}
                      className="px-2.5 py-1 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg cursor-pointer transition-colors"
                    >
                      Bulatkan
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: HITUNG DARI HNA & DISKON % (Formula Farmasi) */
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* HNA */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">
                        HNA (Harga Netto Apotek)
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {parsedHna > 0 ? formatRupiah(parsedHna) : ''}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="100"
                        placeholder="11000"
                        value={hna}
                        onChange={(e) => handleHnaChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Diskon % */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">
                        Diskon Supplier (%)
                      </label>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {parsedDisk > 0 ? `-${parsedDisk}%` : ''}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="13.64"
                        value={discountPercent}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 text-sm font-extrabold text-emerald-700 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Discount Presets */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Pilihan Diskon Populer:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0, 5, 10, 13.64, 15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyQuickDiscount(pct)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          Math.abs(parsedDisk - pct) < 0.01
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculated Result Box */}
                <div className="pt-2 border-t border-slate-150 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Hasil Harga Jadi:</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {formatRupiah(pharmaCalc.hargaJadiBox)}
                  </span>
                </div>
              </div>
            )}

            {/* LIVE AUTOMATIC CALCULATION BREAKDOWN */}
            <div className="bg-white border border-amber-200/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Rincian Kalkulasi Farmasi:</span>
                <span>{activeProduct?.packContent || `1 Box = ${subCount} ${subName}`}</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Harga Jadi Box</span>
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                    {formatRupiah(finalEffectivePrice)}
                  </span>
                </div>

                <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <span className="block text-[9px] uppercase font-bold text-blue-700">Per {subName}</span>
                  <span className="font-extrabold text-xs sm:text-sm text-blue-900">
                    {formatRupiah(Math.round(finalEffectivePrice / subCount))}
                  </span>
                </div>

                <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
                  <span className="block text-[9px] uppercase font-bold text-purple-700">+ PPN 11%</span>
                  <span className="font-extrabold text-xs sm:text-sm text-purple-950">
                    {formatRupiah(Math.round(finalEffectivePrice * 1.11))}
                  </span>
                </div>

                <div className="hidden sm:block bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span className="block text-[9px] uppercase font-bold text-amber-700">Diskon</span>
                  <span className="font-extrabold text-xs sm:text-sm text-amber-900">
                    {parsedDisk > 0 ? `${parsedDisk}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* Instant Comparison Feedback */}
              {priceComparisonBadge}
            </div>

          </div>

          {/* 4. MOQ, LEAD TIME & SATUAN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Min. Order (MOQ)
              </label>
              <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setMoq(Math.max(1, (parseInt(moq) || 1) - 1).toString())}
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-base"
                >
                  -
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  className="w-full text-center text-xs sm:text-sm font-bold text-slate-900 py-2 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setMoq(((parseInt(moq) || 0) + 1).toString())}
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-base"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Lead Time (Hari Kirim)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white font-medium h-10"
              />
            </div>
          </div>

          {/* 5. STATUS STOK & CATATAN */}
          <div className="space-y-3 pt-1">
            {/* Stock checkbox toggle */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                id="stock-toggle"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="text-xs text-slate-900 font-bold block">
                  Stok Barang Ready (Bukan Indent)
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Bisa segera dipesan untuk pengadaan apotek / klinik
                </span>
              </div>
            </label>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Catatan Penawaran / Ketentuan Pembayaran (TOP)
              </label>
              <input
                type="text"
                placeholder="Contoh: Tempo 30 hari, gratis ongkir min order 10 box"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Modal Footer - Sticky & High Touch */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={finalEffectivePrice <= 0 || !supplierName.trim()}
              className="flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {quoteToEdit ? 'Simpan Perubahan Harga' : 'Simpan Penawaran'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
