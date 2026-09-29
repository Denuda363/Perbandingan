import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Plus, DollarSign, Building2, Layers, Calculator, Trash2, CheckCircle2, ArrowRight, Info, Check } from 'lucide-react';
import { Product, Supplier, ProductUnitTier } from '../types';
import { 
  calculatePharmaPricing, 
  formatRupiah, 
  parseCurrencyInput,
  normalizeProductUnits,
  getProductUnitConversions,
  formatProductUnitSummary
} from '../utils/formatters';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    product: Partial<Product>,
    initialQuote?: {
      supplierName: string;
      price: number;
      hna?: number;
      discountPercent?: number;
      pricePerSubUnit?: number;
      priceWithPpn?: number;
      notes?: string;
      unit?: string;
    }
  ) => void;
  productToEdit?: Product | null;
  suppliers: Supplier[];
}

const COMMON_CATEGORIES = [
  'Analgesik & Antipiretik',
  'Antibiotik',
  'Suplemen & Vitamin',
  'Saluran Pencernaan',
  'Alat Kesehatan & Medis',
  'Antiseptik & Disinfektan',
  'Obat Batuk & Flu',
  'Perawatan Luka',
  'Lainnya',
];

const COMMON_SINGLE_UNITS = ['Botol', 'Tube', 'Pcs', 'Jerigen 1L', 'Jerigen 5L', 'Vial', 'Ampul', 'Sachet', 'Flacon', 'Pot'];
const COMMON_MAIN_UNITS = ['Box', 'Dus', 'Karton', 'Pack', 'Slop'];
const COMMON_SUB_UNITS = ['Strip', 'Lembar', 'Blister', 'Sachet', 'Botol', 'Pcs', 'Tube'];
const COMMON_BASE_UNITS = ['Tablet', 'Kaplet', 'Kapsul', 'Pcs', 'Butir', 'Biji', 'Ml'];

interface EditableUnitTier {
  name: string;
  content: number; // isi per level sebelumnya (level 1 content = 1)
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  suppliers,
}) => {
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [company, setCompany] = useState('');
  const [packaging, setPackaging] = useState('');
  const [packContent, setPackContent] = useState('');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');

  // UNIT CONFIGURATION STATE
  // Mode: 'single' (1 satuan saja) vs 'multi' (> 1 satuan)
  const [unitMode, setUnitMode] = useState<'single' | 'multi'>('multi');
  const [singleUnit, setSingleUnit] = useState('Botol');
  const [unitTiers, setUnitTiers] = useState<EditableUnitTier[]>([
    { name: 'Lembar', content: 1 },
    { name: 'Box', content: 10 },
  ]);

  // Initial quote state (for new products)
  const [hasInitialQuote, setHasInitialQuote] = useState(false);
  const [quoteSupplier, setQuoteSupplier] = useState('');
  const [quoteTargetUnit, setQuoteTargetUnit] = useState<'smallest' | 'second'>('smallest');
  const [quoteHna, setQuoteHna] = useState<string>('');
  const [quoteDiscount, setQuoteDiscount] = useState<string>('');
  const [quotePrice, setQuotePrice] = useState<string>('');
  const [quoteNotes, setQuoteNotes] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setGenericName(productToEdit.genericName || '');
      setCompany(productToEdit.company || '');
      setPackaging(productToEdit.packaging || '');
      setPackContent(productToEdit.packContent || '');
      setCategory(productToEdit.category);
      setSku(productToEdit.sku || '');
      setDescription(productToEdit.description || '');
      setHasInitialQuote(false);

      // Determine unit mode and tiers from product data
      if (productToEdit.hasMultiUnits === false || (productToEdit.units && productToEdit.units.length === 1)) {
        setUnitMode('single');
        setSingleUnit(productToEdit.defaultUnit || productToEdit.units?.[0]?.name || 'Botol');
        setUnitTiers([
          { name: 'Lembar', content: 1 },
          { name: 'Box', content: 10 },
        ]);
      } else {
        setUnitMode('multi');
        const normUnits = normalizeProductUnits(productToEdit);
        if (normUnits && normUnits.length >= 2) {
          setUnitTiers(normUnits.map((u) => ({
            name: u.name,
            content: u.content || 1,
          })));
          setSingleUnit(normUnits[0]?.name || 'Botol');
        } else {
          setUnitTiers([
            { name: productToEdit.subUnitName || 'Lembar', content: 1 },
            { name: productToEdit.defaultUnit || 'Box', content: productToEdit.subUnitCount || 10 },
          ]);
          setSingleUnit('Botol');
        }
      }
    } else {
      setName('');
      setGenericName('');
      setCompany('');
      setPackaging('');
      setPackContent('');
      setCategory(COMMON_CATEGORIES[0]);
      setSku('');
      setDescription('');
      setHasInitialQuote(false);
      setQuoteSupplier(suppliers[0]?.name || '');
      setQuoteTargetUnit('smallest');
      setQuoteHna('');
      setQuoteDiscount('');
      setQuotePrice('');
      setQuoteNotes('');
      setUnitMode('multi');
      setSingleUnit('Botol');
      setUnitTiers([
        { name: 'Lembar', content: 1 },
        { name: 'Box', content: 10 },
      ]);
    }
  }, [productToEdit, isOpen, suppliers]);

  // Derived normalized units
  const activeProductUnits: ProductUnitTier[] = useMemo(() => {
    if (unitMode === 'single') {
      const sName = singleUnit.trim() || 'Botol';
      return [{ name: sName, content: 1, totalRatio: 1, level: 1 }];
    }

    let runningRatio = 1;
    return unitTiers.map((t, idx) => {
      const level = idx + 1;
      const content = level === 1 ? 1 : Math.max(1, t.content || 1);
      runningRatio = level === 1 ? 1 : runningRatio * content;
      return {
        name: (t.name || (level === 1 ? 'Lembar' : 'Box')).trim(),
        content,
        totalRatio: runningRatio,
        level,
      };
    });
  }, [unitMode, singleUnit, unitTiers]);

  // Auto-computed pack content description
  const autoPackContent = useMemo(() => {
    if (unitMode === 'single') {
      return `1 ${singleUnit.trim() || 'Botol'}`;
    }
    if (activeProductUnits.length === 2) {
      return `1 ${activeProductUnits[1].name} = ${activeProductUnits[1].content} ${activeProductUnits[0].name} (Satuan Utama: ${activeProductUnits[0].name})`;
    }
    if (activeProductUnits.length === 3) {
      const u0 = activeProductUnits[0];
      const u1 = activeProductUnits[1];
      const u2 = activeProductUnits[2];
      return `1 ${u2.name} = ${u2.content} ${u1.name} (${u2.totalRatio} ${u0.name}) (Satuan Utama: ${u0.name})`;
    }
    if (activeProductUnits.length >= 4) {
      const u0 = activeProductUnits[0];
      const middle = activeProductUnits.slice(1).map(u => `${u.content} ${u.name}`).join(' @ ');
      const last = activeProductUnits[activeProductUnits.length - 1];
      return `1 ${last.name} = ${middle} (Total: ${last.totalRatio} ${u0.name}) (Satuan Utama: ${u0.name})`;
    }
    return `1 ${activeProductUnits[0]?.name || 'Lembar'}`;
  }, [unitMode, singleUnit, activeProductUnits]);

  // Handler to add a tier (up to 4 tiers)
  const handleAddTier = () => {
    if (unitTiers.length >= 4) return;
    const defaultNames = ['Box', 'Strip', 'Tablet', 'Biji'];
    const defaultContents = [1, 10, 10, 1];
    const nextIdx = unitTiers.length;
    setUnitTiers((prev) => [
      ...prev,
      { 
        name: defaultNames[nextIdx] || 'Satuan Eceran', 
        content: defaultContents[nextIdx] || 10 
      },
    ]);
  };

  // Handler to remove tier
  const handleRemoveTier = (idx: number) => {
    if (unitTiers.length <= 2) return;
    setUnitTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateTierName = (idx: number, newName: string) => {
    setUnitTiers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], name: newName };
      return copy;
    });
  };

  const handleUpdateTierContent = (idx: number, newContent: number) => {
    setUnitTiers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], content: Math.max(1, newContent || 1) };
      return copy;
    });
  };

  // Live calculation for initial quote
  const parsedHna = parseCurrencyInput(quoteHna);
  const parsedDisk = parseFloat(quoteDiscount) || 0;
  const parsedPrice = parseCurrencyInput(quotePrice);

  const mainSubCount = unitMode === 'multi' && activeProductUnits.length > 1
    ? activeProductUnits[1].totalRatio
    : 1;
  const mainSubName = unitMode === 'multi' && activeProductUnits.length > 1
    ? activeProductUnits[1].name
    : (activeProductUnits[0]?.name || 'Satuan');

  const pharmaCalc = calculatePharmaPricing({
    hna: parsedHna,
    discountPercent: parsedDisk,
    hargaJadiBoxInput: parsedPrice > 0 ? parsedPrice : undefined,
    subUnitCount: mainSubCount,
    subUnitName: mainSubName,
  });

  const handleHnaChange = (val: string) => {
    setQuoteHna(val);
    const numHna = parseCurrencyInput(val);
    const numDisk = parseFloat(quoteDiscount) || 0;
    if (numHna > 0) {
      const calc = Math.max(0, Math.round(numHna * (1 - numDisk / 100)));
      setQuotePrice(calc > 0 ? calc.toString() : '');
    }
  };

  const handleDiskChange = (val: string) => {
    setQuoteDiscount(val);
    const numDisk = parseFloat(val) || 0;
    const numHna = parseCurrencyInput(quoteHna);
    if (numHna > 0) {
      const calc = Math.max(0, Math.round(numHna * (1 - numDisk / 100)));
      setQuotePrice(calc > 0 ? calc.toString() : '');
    }
  };

  const handlePriceChange = (val: string) => {
    setQuotePrice(val);
    const numPrice = parseCurrencyInput(val);
    const numHna = parseCurrencyInput(quoteHna);
    if (numHna > 0 && numPrice > 0 && numHna >= numPrice) {
      const calcDisk = parseFloat((((numHna - numPrice) / numHna) * 100).toFixed(2));
      setQuoteDiscount(calcDisk.toString());
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const mainUnit = unitMode === 'single'
      ? (singleUnit.trim() || 'Botol')
      : (unitTiers[0]?.name.trim() || 'Box');

    const computedPackContent = packContent.trim() || autoPackContent;

    const subCount = unitMode === 'multi' && activeProductUnits.length > 1
      ? activeProductUnits[1].content
      : 1;

    const subName = unitMode === 'multi' && activeProductUnits.length > 1
      ? activeProductUnits[1].name
      : mainUnit;

    const productData: Partial<Product> = {
      name: name.trim(),
      genericName: genericName.trim() || undefined,
      company: company.trim() || undefined,
      packaging: packaging.trim() || undefined,
      packContent: computedPackContent,
      hasMultiUnits: unitMode === 'multi',
      units: activeProductUnits,
      subUnitCount: subCount,
      subUnitName: subName,
      category,
      defaultUnit: mainUnit,
      sku: sku.trim() || undefined,
      description: description.trim() || undefined,
    };

    let initialQuote;
    const finalPrice = parsedPrice > 0 
      ? parsedPrice 
      : (pharmaCalc.hargaJadiBox > 0 ? pharmaCalc.hargaJadiBox : parsedHna);
    if (!productToEdit && hasInitialQuote && quoteSupplier.trim() && finalPrice > 0) {
      const smallestUnitName = activeProductUnits[0]?.name || 'Satuan';

      initialQuote = {
        supplierName: quoteSupplier.trim(),
        price: finalPrice,
        hna: parsedHna > 0 ? parsedHna : finalPrice,
        discountPercent: parsedDisk > 0 ? parsedDisk : 0,
        pricePerSubUnit: finalPrice,
        priceWithPpn: Math.round(finalPrice * 1.11),
        unit: smallestUnitName,
        notes: quoteNotes.trim() || undefined,
      };
    }

    onSave(productData, initialQuote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {productToEdit ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Lengkapi Company produk, kemasan, isi, dan detail harga
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Nama Produk */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Produk <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Paracetamol 500mg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Company Produk / Pabrik & Zat Aktif */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Produk / Pabrik (Produsen)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Contoh: PT Kimia Farma Tbk, Kalbe, Sanbe"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Zat Aktif / Generik (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Paracetamol, Amoxicillin"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* SPESIFIKASI KEMASAN & ISI (REQUEST USER) */}
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              <span>Detail Kemasan & Isi Produk</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Kemasan */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kemasan <span className="text-slate-400 font-normal">(Contoh: Tablet 10 x 10, Strip 10 x 10)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tablet 10 x 10"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              {/* Isi Kemasan Teks */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Keterangan Isi <span className="text-slate-400 font-normal">(Contoh: 1 box = 10 lembar)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1 box = 10 lembar"
                  value={packContent}
                  onChange={(e) => setPackContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            {/* ======================================================== */}
            {/* KONFIGURASI SATUAN PRODUK (1 SATUAN vs LEBIH DARI 1 SATUAN) */}
            {/* ======================================================== */}
            <div className="bg-slate-50/90 rounded-xl p-3.5 sm:p-4 border border-slate-200/90 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                <div>
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Konfigurasi Satuan & Konversi Harga</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tiap produk bisa memiliki hanya 1 satuan atau lebih dari 1 satuan dengan isi acuan konversi harga.
                  </p>
                </div>

                {/* Mode Selector Toggle */}
                <div className="inline-flex bg-white p-1 rounded-xl border border-slate-300 shadow-2xs self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setUnitMode('single')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      unitMode === 'single'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>1 Satuan Saja</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitMode('multi')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      unitMode === 'multi'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>Multi-Satuan (&gt;1)</span>
                  </button>
                </div>
              </div>

              {/* OPSI 1: HANYA 1 SATUAN */}
              {unitMode === 'single' && (
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Nama Satuan Produk:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: Botol, Tube, Pcs, Jerigen 1L, Vial"
                        value={singleUnit}
                        onChange={(e) => setSingleUnit(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                      />
                    </div>

                    {/* Chips Satuan Populer */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-medium mr-1">Pilihan Cepat:</span>
                      {COMMON_SINGLE_UNITS.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setSingleUnit(u)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border cursor-pointer transition-colors ${
                            singleUnit === u
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      Produk ini menggunakan <strong>1 satuan ({singleUnit || 'Satuan'})</strong> tanpa pembagian pecahan. Harga beli dan harga jual apotek dihitung langsung per <strong>1 {singleUnit || 'Satuan'}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* OPSI 2: LEBIH DARI 1 SATUAN (MULTI-SATUAN BERTINGKAT) */}
              {unitMode === 'multi' && (
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    {/* Tier 1: Satuan Utama (Satuan Terkecil) */}
                    <div className="bg-white p-3.5 rounded-xl border-2 border-emerald-300/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                          Satuan Utama (Satuan Terkecil)
                        </span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                          Acuan Dasar Perhitungan
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Satuan terkecil adalah satuan utama (contoh: Lembar, Strip, Tablet, Kapsul, Pcs).
                      </p>
                      <input
                        type="text"
                        placeholder="Contoh: Lembar, Strip, Tablet, Kapsul"
                        value={unitTiers[0]?.name || ''}
                        onChange={(e) => handleUpdateTierName(0, e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {COMMON_SUB_UNITS.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleUpdateTierName(0, u)}
                            className={`text-[10px] px-2 py-0.5 rounded-md border cursor-pointer transition-colors ${
                              unitTiers[0]?.name === u
                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tier 2: Satuan Kedua (Kemasan Berisi Satuan Utama) */}
                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                          Satuan Kedua (Kemasan Berisi Satuan Utama)
                        </span>
                        <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                          Harga Dikonversi dari Satuan Terkecil
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Nama Satuan Kedua</label>
                          <input
                            type="text"
                            placeholder="Box / Dus / Pack"
                            value={unitTiers[1]?.name || ''}
                            onChange={(e) => handleUpdateTierName(1, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">
                            Isi ({unitTiers[0]?.name || 'Lembar'} per {unitTiers[1]?.name || 'Box'})
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={unitTiers[1]?.content || 10}
                            onChange={(e) => handleUpdateTierContent(1, parseInt(e.target.value) || 1)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      {/* Info Box Contoh Konversi */}
                      <div className="p-2.5 bg-blue-50/80 border border-blue-200/90 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                        <div className="font-bold flex items-center gap-1">
                          <span>1 {unitTiers[1]?.name || 'Box'} = {unitTiers[1]?.content || 10} {unitTiers[0]?.name || 'Lembar'}</span>
                        </div>
                        <p className="text-[10px] text-blue-700 mt-0.5">
                          Harga 1 {unitTiers[1]?.name || 'Box'} dihitung otomatis: <strong>{unitTiers[1]?.content || 10} × Harga {unitTiers[0]?.name || 'Lembar'}</strong>.
                          <br />
                          <em>Misal: Satuan kecil {unitTiers[0]?.name || 'Lembar'} = Rp 1.000, maka 1 {unitTiers[1]?.name || 'Box'} = Rp {(1000 * (unitTiers[1]?.content || 10)).toLocaleString('id-ID')}.</em>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {COMMON_MAIN_UNITS.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleUpdateTierName(1, u)}
                            className={`text-[10px] px-2 py-0.5 rounded-md border cursor-pointer transition-colors ${
                              unitTiers[1]?.name === u
                                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tier 3 & Seterusnya (Satuan Pecahan Berikutnya) */}
                    {unitTiers.slice(2).map((tier, tierOffset) => {
                      const tierIdx = tierOffset + 2;
                      const levelNum = tierIdx + 1;
                      const prevTier = unitTiers[tierIdx - 1];

                      return (
                        <div key={tierIdx} className="bg-white p-3 rounded-xl border border-purple-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                                {levelNum}
                              </span>
                              Satuan Tingkat {levelNum} ({tier.name || `Pecahan ${levelNum - 1}`})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTier(tierIdx)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              title={`Hapus satuan tingkat ${levelNum}`}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">
                                Isi per {prevTier?.name || 'Satuan Sebelumnya'}
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={tier.content || 1}
                                onChange={(e) => handleUpdateTierContent(tierIdx, parseInt(e.target.value) || 1)}
                                className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Nama Satuan</label>
                              <input
                                type="text"
                                placeholder="Tablet / Kapsul / Kaplet"
                                value={tier.name || ''}
                                onChange={(e) => handleUpdateTierName(tierIdx, e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {COMMON_BASE_UNITS.map((u) => (
                              <button
                                key={u}
                                type="button"
                                onClick={() => handleUpdateTierName(tierIdx, u)}
                                className={`text-[10px] px-2 py-0.5 rounded-md border cursor-pointer transition-colors ${
                                  tier.name === u
                                    ? 'bg-purple-600 text-white border-purple-600 font-bold'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {u}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Tombol Tambah Tingkat jika belum 4 tingkat */}
                    {unitTiers.length < 4 && (
                      <button
                        type="button"
                        onClick={handleAddTier}
                        className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambah Satuan Pecahan Berikutnya (Contoh: {unitTiers.length === 2 ? 'Tablet/Kapsul per Strip' : 'Biji/Butir/Ml'})</span>
                      </button>
                    )}
                  </div>

                  {/* Formula Preview Banner & Live Calculation */}
                  <div className="bg-emerald-950 text-white rounded-xl p-3 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Acuan Konversi Harga Otomatis:
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-100">
                      {autoPackContent}
                    </div>

                    {/* Live price conversion sample */}
                    {parsedPrice > 0 && (
                      <div className="pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                        {activeProductUnits.map((u, uIdx) => (
                          <div key={uIdx} className="bg-white/10 p-2 rounded-lg">
                            <span className="block text-[9px] uppercase font-sans text-slate-300">
                              Harga per {u.name}
                            </span>
                            <span className="font-black text-amber-300">
                              {formatRupiah(Math.round(parsedPrice / u.totalRatio))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Kategori & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Produk
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU / Kode Barang (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: PCT-500-BX"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
            </div>
          </div>

          {/* Deskripsi / Catatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Indikasi (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Keterangan singkat tentang produk..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Optional: Add first supplier quotation immediately if new product */}
          {!productToEdit && (
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasInitialQuote}
                  onChange={(e) => setHasInitialQuote(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800">
                  + Langsung masukkan penawaran harga pertama dari supplier (HNA, Diskon, Harga Jadi)
                </span>
              </label>

              {hasInitialQuote && (
                <div className="mt-3 p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama Supplier / PBF
                    </label>
                    <input
                      type="text"
                      list="existing-suppliers-list"
                      placeholder="Pilih atau ketik nama supplier (misal: PT Kinariya atau PT Aman Farma)"
                      value={quoteSupplier}
                      onChange={(e) => setQuoteSupplier(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                    />
                    <datalist id="existing-suppliers-list">
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Pricing Inputs: HNA, DISK %, HARGA JADI BOX */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                        HNA (Rp)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 11000 atau 11.000"
                        value={quoteHna}
                        onChange={(e) => handleHnaChange(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                        DISK (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="13.64"
                        value={quoteDiscount}
                        onChange={(e) => handleDiskChange(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-emerald-700 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-800 mb-0.5">
                        HARGA JADI (box)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 9500"
                        value={quotePrice}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border-2 border-emerald-500 rounded-lg bg-white font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Live Pharma Price Summary Table Matching User Image */}
                  <div className="bg-white border border-amber-300 rounded-lg p-2.5 text-xs overflow-x-auto">
                    <div className="text-[10px] font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                      <Calculator className="w-3 h-3 text-amber-700" />
                      <span>Hasil Perhitungan Otomatis:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center font-mono text-[11px] min-w-[340px]">
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="block text-[9px] font-sans font-semibold text-slate-500">HNA</span>
                        <span className="font-bold text-slate-700">{formatRupiah(pharmaCalc.hna)}</span>
                      </div>
                      <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200">
                        <span className="block text-[9px] font-sans font-semibold text-emerald-700">DISK</span>
                        <span className="font-bold text-emerald-700">{pharmaCalc.discountPercent}%</span>
                      </div>
                      <div className="bg-amber-100 p-1.5 rounded border border-amber-300">
                        <span className="block text-[9px] font-sans font-bold text-amber-900">
                          HARGA JADI ({activeProductUnits[0]?.name || 'Utama'})
                        </span>
                        <span className="font-bold text-amber-950">{formatRupiah(pharmaCalc.hargaJadiBox)}</span>
                      </div>
                      <div className="bg-purple-50 p-1.5 rounded border border-purple-200">
                        <span className="block text-[9px] font-sans font-semibold text-purple-700">HARGA JADI +PPN</span>
                        <span className="font-bold text-purple-800">{formatRupiah(pharmaCalc.hargaJadiPlusPpn)}</span>
                      </div>
                    </div>

                    {/* Breakdown per Satuan Turunan jika multi-satuan */}
                    {unitMode === 'multi' && activeProductUnits.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-amber-200 flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="text-[10px] font-bold text-slate-600">Konversi Satuan:</span>
                        {activeProductUnits.slice(1).map((tier, tIdx) => (
                          <span key={tIdx} className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
                            ~{formatRupiah(Math.round((parsedPrice > 0 ? parsedPrice : pharmaCalc.hargaJadiBox) * tier.totalRatio))} / {tier.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Catatan Penawaran (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Minimal 5 box, tempo 30 hari"
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {productToEdit ? 'Simpan Perubahan' : 'Simpan Produk'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
