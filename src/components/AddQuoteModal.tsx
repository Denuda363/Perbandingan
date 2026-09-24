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
  TrendingUp,
  CheckCircle2,
  Percent,
  Plus,
  Minus,
  Sparkles,
  Package,
  Award,
  AlertCircle,
  Receipt,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Product, Supplier, SupplierQuote, AppSettings, DEFAULT_APP_SETTINGS, DiscountType, MarginType } from '../types';
import { calculateMarginFormula, formatRupiah, getProductPriceStats } from '../utils/formatters';

interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  selectedProduct?: Product | null;
  quoteToEdit?: SupplierQuote | null;
  onSaveQuote: (productId: string, quote: Partial<SupplierQuote>) => void;
  settings?: AppSettings;
}

export const AddQuoteModal: React.FC<AddQuoteModalProps> = ({
  isOpen,
  onClose,
  products,
  suppliers,
  selectedProduct,
  quoteToEdit,
  onSaveQuote,
  settings = DEFAULT_APP_SETTINGS,
}) => {
  const [productId, setProductId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [priceInputMode, setPriceInputMode] = useState<'formula' | 'direct'>('formula');
  
  // Formula inputs: (Modal - diskon 1 - diskon 2 + ppn) + margin
  const [modalCost, setModalCost] = useState<string>('');
  
  // Diskon 1 (% atau Rp)
  const [discount1Value, setDiscount1Value] = useState<string>('');
  const [discount1Type, setDiscount1Type] = useState<DiscountType>('percent');
  
  // Diskon 2 (% atau Rp)
  const [discount2Value, setDiscount2Value] = useState<string>('');
  const [discount2Type, setDiscount2Type] = useState<DiscountType>('percent');

  // PPN
  const [ppnEnabled, setPpnEnabled] = useState<boolean>(true);
  const [ppnPercent, setPpnPercent] = useState<number>(settings.ppnPercent || 11);

  // Margin (% atau Rp)
  const [marginValue, setMarginValue] = useState<string>('25');
  const [marginType, setMarginType] = useState<MarginType>('percent');

  // Direct price (for direct mode)
  const [directPrice, setDirectPrice] = useState<string>('');

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
      
      const baseCost = quoteToEdit.hna ? quoteToEdit.hna : quoteToEdit.price;
      setModalCost(baseCost > 0 ? baseCost.toString() : '');
      
      // Diskon 1
      if (quoteToEdit.discount1Value !== undefined) {
        setDiscount1Value(quoteToEdit.discount1Value.toString());
        setDiscount1Type(quoteToEdit.discount1Type || 'percent');
      } else if (quoteToEdit.discountPercent !== undefined && quoteToEdit.discountPercent > 0) {
        setDiscount1Value(quoteToEdit.discountPercent.toString());
        setDiscount1Type('percent');
      } else {
        setDiscount1Value('');
        setDiscount1Type('percent');
      }

      // Diskon 2
      if (quoteToEdit.discount2Value !== undefined) {
        setDiscount2Value(quoteToEdit.discount2Value.toString());
        setDiscount2Type(quoteToEdit.discount2Type || 'percent');
      } else {
        setDiscount2Value('');
        setDiscount2Type('percent');
      }

      // PPN
      setPpnEnabled(settings.ppnEnabled !== false);
      setPpnPercent(settings.ppnPercent || 11);

      // Margin
      if (quoteToEdit.marginValue !== undefined) {
        setMarginValue(quoteToEdit.marginValue.toString());
        setMarginType(quoteToEdit.marginType || 'percent');
      } else {
        setMarginValue(settings.marginType === 'amount' ? settings.marginAmountValue.toString() : settings.marginPercent.toString());
        setMarginType(settings.marginType || 'percent');
      }

      setDirectPrice(quoteToEdit.price.toString());
      setUnit(quoteToEdit.unit);
      setMoq((quoteToEdit.moq || 1).toString());
      setLeadTimeDays((quoteToEdit.leadTimeDays || 1).toString());
      setNotes(quoteToEdit.notes || '');
      setInStock(quoteToEdit.inStock !== false);

      // Start on formula mode
      setPriceInputMode('formula');
    } else {
      setSupplierName(suppliers[0]?.name || '');
      setModalCost('');
      setDiscount1Value(settings.defaultDiscount1Value > 0 ? settings.defaultDiscount1Value.toString() : '');
      setDiscount1Type(settings.defaultDiscount1Type || 'percent');
      setDiscount2Value(settings.defaultDiscount2Value > 0 ? settings.defaultDiscount2Value.toString() : '');
      setDiscount2Type(settings.defaultDiscount2Type || 'percent');
      setPpnEnabled(settings.ppnEnabled);
      setPpnPercent(settings.ppnPercent || 11);
      setMarginValue(settings.marginType === 'amount' ? settings.marginAmountValue.toString() : settings.marginPercent.toString());
      setMarginType(settings.marginType || 'percent');
      setDirectPrice('');
      setMoq('1');
      setLeadTimeDays('1');
      setNotes('');
      setInStock(true);
      setPriceInputMode('formula');
    }

    setProductSearchQuery('');
    setIsProductSelectorOpen(false);
  }, [selectedProduct, quoteToEdit, isOpen, products, suppliers, settings]);

  // Pricing calculations using the user's formula: (Modal - diskon 1 - diskon 2 + ppn) + margin
  const parsedModal = parseFloat(modalCost) || 0;
  const parsedD1Val = parseFloat(discount1Value) || 0;
  const parsedD2Val = parseFloat(discount2Value) || 0;
  const parsedMarginVal = parseFloat(marginValue) || 0;
  const parsedDirect = parseFloat(directPrice) || 0;

  const formulaCalc = useMemo(() => {
    const effectiveBaseModal = priceInputMode === 'formula' ? parsedModal : parsedDirect;

    return calculateMarginFormula({
      modal: effectiveBaseModal,
      discount1Value: priceInputMode === 'formula' ? parsedD1Val : 0,
      discount1Type,
      discount2Value: priceInputMode === 'formula' ? parsedD2Val : 0,
      discount2Type,
      ppnPercent,
      ppnEnabled,
      marginValue: parsedMarginVal,
      marginType,
      roundingOption: settings.roundingOption,
      subUnitCount: subCount,
      subUnitName: subName,
    });
  }, [
    priceInputMode,
    parsedModal,
    parsedDirect,
    parsedD1Val,
    discount1Type,
    parsedD2Val,
    discount2Type,
    ppnPercent,
    ppnEnabled,
    parsedMarginVal,
    marginType,
    settings.roundingOption,
    subCount,
    subName,
  ]);

  // Effective net purchase cost per box
  const finalEffectiveNetPrice = priceInputMode === 'formula'
    ? (parsedModal > 0 ? formulaCalc.netCostAfterDiscounts : 0)
    : parsedDirect;

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

  const handleSelectProduct = (prod: Product) => {
    setProductId(prod.id);
    setUnit(prod.defaultUnit);
    setIsProductSelectorOpen(false);
    setProductSearchQuery('');
  };

  // Quick discount presets
  const applyQuickD1 = (val: number, type: DiscountType) => {
    setDiscount1Type(type);
    setDiscount1Value(val.toString());
  };

  const applyQuickD2 = (val: number, type: DiscountType) => {
    setDiscount2Type(type);
    setDiscount2Value(val.toString());
  };

  const applyQuickMargin = (val: number, type: MarginType) => {
    setMarginType(type);
    setMarginValue(val.toString());
  };

  // Competitor stats
  const competitorStats = useMemo(() => {
    if (!activeProduct) return null;
    return getProductPriceStats(activeProduct);
  }, [activeProduct]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !supplierName.trim() || finalEffectiveNetPrice <= 0) return;

    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === supplierName.trim().toLowerCase()
    );

    const quoteData: Partial<SupplierQuote> = {
      id: quoteToEdit ? quoteToEdit.id : `q-${Date.now()}`,
      supplierId: matchedSupplier ? matchedSupplier.id : `sup-${Date.now()}`,
      supplierName: supplierName.trim(),
      price: finalEffectiveNetPrice, // Modal bersih setelah diskon
      hna: parsedModal > 0 ? parsedModal : finalEffectiveNetPrice,
      discount1Type,
      discount1Value: parsedD1Val,
      discountPercent: discount1Type === 'percent' ? parsedD1Val : 0,
      discount2Type,
      discount2Value: parsedD2Val,
      netCostAfterDiscounts: formulaCalc.netCostAfterDiscounts,
      priceWithPpn: formulaCalc.costWithPpn,
      marginType,
      marginValue: parsedMarginVal,
      marginAmount: formulaCalc.marginAmount,
      sellingPrice: formulaCalc.sellingPrice,
      pricePerSubUnit: formulaCalc.costPerSubUnit,
      sellingPricePerSubUnit: formulaCalc.sellingPricePerSubUnit,
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

  // Price comparison feedback
  let priceComparisonBadge = null;
  if (competitorStats && competitorStats.quoteCount > 0 && finalEffectiveNetPrice > 0) {
    const otherQuotes = quoteToEdit 
      ? (activeProduct?.quotes || []).filter(q => q.id !== quoteToEdit.id)
      : (activeProduct?.quotes || []);

    if (otherQuotes.length > 0) {
      const otherMinPrice = Math.min(...otherQuotes.map(q => q.price));
      const otherCheapestQuote = otherQuotes.find(q => q.price === otherMinPrice);

      if (finalEffectiveNetPrice < otherMinPrice) {
        const diff = otherMinPrice - finalEffectiveNetPrice;
        priceComparisonBadge = (
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 flex items-center justify-between text-xs text-emerald-900">
            <span className="font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              Bakal Jadi Penawaran Termurah!
            </span>
            <span className="font-bold text-emerald-700 font-mono">
              Hemat {formatRupiah(diff)} dari {otherCheapestQuote?.supplierName}
            </span>
          </div>
        );
      } else if (finalEffectiveNetPrice > otherMinPrice) {
        const diff = finalEffectiveNetPrice - otherMinPrice;
        priceComparisonBadge = (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-900">
            <span className="font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Lebih tinggi +{formatRupiah(diff)}
            </span>
            <span className="text-[11px] text-amber-800">
              Termurah: {formatRupiah(otherMinPrice)} ({otherCheapestQuote?.supplierName})
            </span>
          </div>
        );
      } else {
        priceComparisonBadge = (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-900 flex items-center gap-1.5">
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
        className="bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-emerald-300 flex items-center justify-center shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  {quoteToEdit ? 'Edit Penawaran Harga Supplier' : 'Tambah Penawaran Supplier'}
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 px-2 py-0.2 rounded-full">
                  Rumus Margin
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-mono mt-0.5">
                (Modal − Diskon 1 − Diskon 2 + PPN) + Margin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
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

            {/* Quick Supplier Chips */}
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

          {/* 3. METODE PERHITUNGAN: (Modal - Diskon 1 - Diskon 2 + PPN) + Margin */}
          <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-300/80 rounded-2xl p-3.5 sm:p-4 space-y-3.5">
            
            {/* Mode Selector */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-700" />
                <span>Metode Perhitungan Harga:</span>
              </div>

              <div className="flex items-center bg-white border border-emerald-300 rounded-lg p-0.5 text-xs font-semibold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPriceInputMode('formula')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    priceInputMode === 'formula'
                      ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rumus: (Modal − D1 − D2 + PPN) + Margin
                </button>
                <button
                  type="button"
                  onClick={() => setPriceInputMode('direct')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    priceInputMode === 'direct'
                      ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Harga Jadi Langsung
                </button>
              </div>
            </div>

            {/* TAB 1: FORMULA MODE */}
            {priceInputMode === 'formula' ? (
              <div className="space-y-4 bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-200/90 shadow-2xs">
                
                {/* 1. Modal Pokok / HNA */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>1. Modal Dasar / HNA (per {unit || activeProduct?.defaultUnit || 'Box'})</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      {parsedModal > 0 ? formatRupiah(parsedModal) : ''}
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
                      placeholder="Contoh: 100000"
                      value={modalCost}
                      onChange={(e) => setModalCost(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-base sm:text-lg font-bold text-slate-900 border-2 border-slate-300 focus:border-emerald-600 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* 2. Diskon 1 & Diskon 2 Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  
                  {/* Diskon 1 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        2. Diskon 1 (Reguler)
                      </label>
                      
                      {/* Toggle % or Rp */}
                      <div className="inline-flex bg-white rounded-md p-0.5 border border-slate-300 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setDiscount1Type('percent')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            discount1Type === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscount1Type('amount')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            discount1Type === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          Rp
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      {discount1Type === 'amount' && (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          Rp
                        </span>
                      )}
                      <input
                        type="number"
                        step={discount1Type === 'percent' ? '0.1' : '500'}
                        min="0"
                        placeholder="0"
                        value={discount1Value}
                        onChange={(e) => setDiscount1Value(e.target.value)}
                        className={`w-full py-1.5 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          discount1Type === 'amount' ? 'pl-8 pr-3' : 'pl-3 pr-8'
                        }`}
                      />
                      {discount1Type === 'percent' && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      )}
                    </div>

                    {/* Presets D1 */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {discount1Type === 'percent'
                        ? [0, 5, 10, 15, 20].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => applyQuickD1(pct, 'percent')}
                              className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                                parsedD1Val === pct ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))
                        : [1000, 2500, 5000, 10000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => applyQuickD1(amt, 'amount')}
                              className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                                parsedD1Val === amt ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                              }`}
                            >
                              {formatRupiah(amt)}
                            </button>
                          ))}
                    </div>

                    {formulaCalc.discount1Amount > 0 && (
                      <div className="text-[11px] text-emerald-800 font-semibold text-right">
                        Potongan: −{formatRupiah(formulaCalc.discount1Amount)}
                      </div>
                    )}
                  </div>

                  {/* Diskon 2 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        3. Diskon 2 (Tambahan / Cash)
                      </label>
                      
                      {/* Toggle % or Rp */}
                      <div className="inline-flex bg-white rounded-md p-0.5 border border-slate-300 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setDiscount2Type('percent')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            discount2Type === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscount2Type('amount')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            discount2Type === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          Rp
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      {discount2Type === 'amount' && (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          Rp
                        </span>
                      )}
                      <input
                        type="number"
                        step={discount2Type === 'percent' ? '0.1' : '500'}
                        min="0"
                        placeholder="0"
                        value={discount2Value}
                        onChange={(e) => setDiscount2Value(e.target.value)}
                        className={`w-full py-1.5 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          discount2Type === 'amount' ? 'pl-8 pr-3' : 'pl-3 pr-8'
                        }`}
                      />
                      {discount2Type === 'percent' && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      )}
                    </div>

                    {/* Presets D2 */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {discount2Type === 'percent'
                        ? [0, 1.5, 2, 2.5, 5].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => applyQuickD2(pct, 'percent')}
                              className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                                parsedD2Val === pct ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))
                        : [1000, 2000, 3000, 5000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => applyQuickD2(amt, 'amount')}
                              className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                                parsedD2Val === amt ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                              }`}
                            >
                              {formatRupiah(amt)}
                            </button>
                          ))}
                    </div>

                    {formulaCalc.discount2Amount > 0 && (
                      <div className="text-[11px] text-emerald-800 font-semibold text-right">
                        Potongan: −{formatRupiah(formulaCalc.discount2Amount)}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. PPN & Margin Keuntungan Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-slate-200">
                  
                  {/* PPN Toggle & Value */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>4. Pajak PPN</span>
                      </label>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ppnEnabled}
                          onChange={(e) => setPpnEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ml-1.5 text-[11px] font-bold text-slate-700">
                          {ppnEnabled ? 'Aktif' : '0%'}
                        </span>
                      </label>
                    </div>

                    {ppnEnabled ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={ppnPercent}
                            onChange={(e) => setPpnPercent(parseFloat(e.target.value) || 0)}
                            className="w-full py-1.5 pl-3 pr-8 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            %
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-amber-700 font-bold">
                          +{formatRupiah(formulaCalc.ppnAmount)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic py-1">
                        Bebas PPN (Non-Faktur Pajak)
                      </p>
                    )}
                  </div>

                  {/* Margin Apotek (% / Rp) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>5. Margin Keuntungan</span>
                      </label>

                      {/* Toggle % or Rp */}
                      <div className="inline-flex bg-white rounded-md p-0.5 border border-slate-300 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setMarginType('percent')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            marginType === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarginType('amount')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            marginType === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          Rp
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      {marginType === 'amount' && (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          Rp
                        </span>
                      )}
                      <input
                        type="number"
                        step={marginType === 'percent' ? '0.5' : '1000'}
                        min="0"
                        placeholder="25"
                        value={marginValue}
                        onChange={(e) => setMarginValue(e.target.value)}
                        className={`w-full py-1.5 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          marginType === 'amount' ? 'pl-8 pr-3' : 'pl-3 pr-8'
                        }`}
                      />
                      {marginType === 'percent' && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      )}
                    </div>

                    {/* Presets Margin */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {marginType === 'percent'
                        ? [15, 20, 25, 30].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => applyQuickMargin(pct, 'percent')}
                              className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                                parsedMarginVal === pct ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))
                        : [5000, 10000, 15000, 20000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => applyQuickMargin(amt, 'amount')}
                              className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                                parsedMarginVal === amt ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-600'
                              }`}
                            >
                              {formatRupiah(amt)}
                            </button>
                          ))}
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              /* TAB 2: DIRECT PRICE MODE */
              <div className="space-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-200/90 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-900">
                      Harga Jadi Beli Langsung (per {unit || activeProduct?.defaultUnit || 'Box'}) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      {parsedDirect > 0 ? formatRupiah(parsedDirect) : ''}
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
                      placeholder="Contoh: 9500"
                      value={directPrice}
                      onChange={(e) => setDirectPrice(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-base sm:text-lg font-bold text-slate-900 border-2 border-emerald-500 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LIVE DYNAMIC BREAKDOWN CARD (THE RUMUS VIEW) */}
            <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 shadow-inner space-y-3 border border-emerald-500/30">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                <span className="font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  Rincian Hasil Rumus Margin
                </span>
                <span className="text-[11px] text-slate-400">
                  {activeProduct?.packContent || `1 Box = ${subCount} ${subName}`}
                </span>
              </div>

              {/* Step By Step Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                {/* 1. Modal Bersih */}
                <div className="bg-white/10 p-2 rounded-lg border border-white/10">
                  <span className="block text-[9px] uppercase font-bold text-slate-300">
                    Modal Bersih (Net)
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-white font-mono">
                    {formatRupiah(formulaCalc.netCostAfterDiscounts)}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    ~{formatRupiah(formulaCalc.costPerSubUnit)}/{subName}
                  </span>
                </div>

                {/* 2. Total Diskon */}
                <div className="bg-emerald-950/70 p-2 rounded-lg border border-emerald-500/30">
                  <span className="block text-[9px] uppercase font-bold text-emerald-300">
                    Total Diskon (D1+D2)
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-emerald-400 font-mono">
                    −{formatRupiah(formulaCalc.totalDiscountAmount)}
                  </span>
                  <span className="block text-[10px] text-emerald-300/80">
                    {formulaCalc.modal > 0 ? `${((formulaCalc.totalDiscountAmount / formulaCalc.modal) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>

                {/* 3. Modal + PPN */}
                <div className="bg-purple-950/70 p-2 rounded-lg border border-purple-500/30">
                  <span className="block text-[9px] uppercase font-bold text-purple-300">
                    Modal + PPN
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-purple-200 font-mono">
                    {formatRupiah(formulaCalc.costWithPpn)}
                  </span>
                  <span className="block text-[10px] text-purple-300/80">
                    +PPN {formulaCalc.ppnPercent}%
                  </span>
                </div>

                {/* 4. Rekomendasi Jual */}
                <div className="bg-amber-950/70 p-2 rounded-lg border border-amber-500/30">
                  <span className="block text-[9px] uppercase font-bold text-amber-300">
                    Harga Jual Rekomendasi
                  </span>
                  <span className="font-black text-xs sm:text-sm text-amber-300 font-mono">
                    {formatRupiah(formulaCalc.sellingPrice)}
                  </span>
                  <span className="block text-[10px] text-amber-200/90 font-bold">
                    ~{formatRupiah(formulaCalc.sellingPricePerSubUnit)}/{subName}
                  </span>
                </div>
              </div>

              {/* Equation banner */}
              <div className="p-2.5 bg-black/40 rounded-lg border border-white/10 text-[11px] font-mono text-emerald-300/90 overflow-x-auto whitespace-nowrap">
                {formulaCalc.formulaString}
              </div>

              {/* Comparison Feedback */}
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

          {/* Modal Footer */}
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
              disabled={finalEffectiveNetPrice <= 0 || !supplierName.trim()}
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
