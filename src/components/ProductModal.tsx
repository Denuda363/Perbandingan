import React, { useState, useEffect } from 'react';
import { X, Package, Plus, DollarSign, Building2, Layers, Calculator } from 'lucide-react';
import { Product, Supplier } from '../types';
import { calculatePharmaPricing, formatRupiah } from '../utils/formatters';

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

const COMMON_UNITS = ['Box', 'Strip', 'Botol', 'Pcs', 'Jerigen 1L', 'Jerigen 5L', 'Sachet', 'Vial', 'Ampul'];

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
  const [subUnitCount, setSubUnitCount] = useState<number>(10);
  const [subUnitName, setSubUnitName] = useState('lembar');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [defaultUnit, setDefaultUnit] = useState('Box');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');

  // Initial quote state (for new products)
  const [hasInitialQuote, setHasInitialQuote] = useState(false);
  const [quoteSupplier, setQuoteSupplier] = useState('');
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
      setSubUnitCount(productToEdit.subUnitCount || 10);
      setSubUnitName(productToEdit.subUnitName || 'lembar');
      setCategory(productToEdit.category);
      setDefaultUnit(productToEdit.defaultUnit);
      setSku(productToEdit.sku || '');
      setDescription(productToEdit.description || '');
      setHasInitialQuote(false);
    } else {
      setName('');
      setGenericName('');
      setCompany('');
      setPackaging('');
      setPackContent('');
      setSubUnitCount(10);
      setSubUnitName('lembar');
      setCategory(COMMON_CATEGORIES[0]);
      setDefaultUnit('Box');
      setSku('');
      setDescription('');
      setHasInitialQuote(false);
      setQuoteSupplier(suppliers[0]?.name || '');
      setQuoteHna('');
      setQuoteDiscount('');
      setQuotePrice('');
      setQuoteNotes('');
    }
  }, [productToEdit, isOpen, suppliers]);

  // Live calculation for initial quote
  const parsedHna = parseFloat(quoteHna) || 0;
  const parsedDisk = parseFloat(quoteDiscount) || 0;
  const parsedPrice = parseFloat(quotePrice) || 0;

  const pharmaCalc = calculatePharmaPricing({
    hna: parsedHna,
    discountPercent: parsedDisk,
    hargaJadiBoxInput: parsedPrice > 0 ? parsedPrice : undefined,
    subUnitCount: subUnitCount > 0 ? subUnitCount : 10,
    subUnitName: subUnitName || 'lembar',
  });

  const handleHnaChange = (val: string) => {
    setQuoteHna(val);
    const numHna = parseFloat(val) || 0;
    const numDisk = parseFloat(quoteDiscount) || 0;
    if (numHna > 0) {
      const calc = Math.max(0, Math.round(numHna * (1 - numDisk / 100)));
      setQuotePrice(calc > 0 ? calc.toString() : '');
    }
  };

  const handleDiskChange = (val: string) => {
    setQuoteDiscount(val);
    const numDisk = parseFloat(val) || 0;
    const numHna = parseFloat(quoteHna) || 0;
    if (numHna > 0) {
      const calc = Math.max(0, Math.round(numHna * (1 - numDisk / 100)));
      setQuotePrice(calc > 0 ? calc.toString() : '');
    }
  };

  const handlePriceChange = (val: string) => {
    setQuotePrice(val);
    const numPrice = parseFloat(val) || 0;
    const numHna = parseFloat(quoteHna) || 0;
    if (numHna > 0 && numPrice > 0 && numHna >= numPrice) {
      const calcDisk = parseFloat((((numHna - numPrice) / numHna) * 100).toFixed(2));
      setQuoteDiscount(calcDisk.toString());
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const safeCount = subUnitCount > 0 ? subUnitCount : 10;
    const computedPackContent = packContent.trim() || `1 ${defaultUnit} = ${safeCount} ${subUnitName || 'lembar'}`;

    const productData: Partial<Product> = {
      name: name.trim(),
      genericName: genericName.trim() || undefined,
      company: company.trim() || undefined,
      packaging: packaging.trim() || undefined,
      packContent: computedPackContent,
      subUnitCount: safeCount,
      subUnitName: subUnitName.trim() || 'lembar',
      category,
      defaultUnit,
      sku: sku.trim() || undefined,
      description: description.trim() || undefined,
    };

    let initialQuote;
    const finalBoxPrice = parsedPrice > 0 ? parsedPrice : pharmaCalc.hargaJadiBox;
    if (!productToEdit && hasInitialQuote && quoteSupplier.trim() && finalBoxPrice > 0) {
      initialQuote = {
        supplierName: quoteSupplier.trim(),
        price: finalBoxPrice,
        hna: parsedHna > 0 ? parsedHna : finalBoxPrice,
        discountPercent: parsedDisk > 0 ? parsedDisk : 0,
        pricePerSubUnit: Math.round(finalBoxPrice / safeCount),
        priceWithPpn: Math.round(finalBoxPrice * 1.11),
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
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

            {/* Konversi Pecahan */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  Jumlah Satuan Kecil
                </label>
                <input
                  type="number"
                  min="1"
                  value={subUnitCount}
                  onChange={(e) => setSubUnitCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  Nama Satuan Kecil
                </label>
                <input
                  type="text"
                  placeholder="lembar / strip / tablet / pcs"
                  value={subUnitName}
                  onChange={(e) => setSubUnitName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  Satuan Pembelian Utama
                </label>
                <select
                  value={defaultUnit}
                  onChange={(e) => setDefaultUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
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
                        type="number"
                        min="0"
                        step="100"
                        placeholder="11000"
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
                        type="number"
                        min="0"
                        step="100"
                        placeholder="9500"
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
                    <div className="grid grid-cols-5 gap-1 text-center font-mono text-[11px] min-w-[340px]">
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="block text-[9px] font-sans font-semibold text-slate-500">HNA</span>
                        <span className="font-bold text-slate-700">{formatRupiah(pharmaCalc.hna)}</span>
                      </div>
                      <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200">
                        <span className="block text-[9px] font-sans font-semibold text-emerald-700">DISK</span>
                        <span className="font-bold text-emerald-700">{pharmaCalc.discountPercent}%</span>
                      </div>
                      <div className="bg-blue-50 p-1.5 rounded border border-blue-200">
                        <span className="block text-[9px] font-sans font-semibold text-blue-700">HARGA JADI ({subUnitName || 'lembar'})</span>
                        <span className="font-bold text-blue-800">{formatRupiah(pharmaCalc.hargaJadiLembar)}</span>
                      </div>
                      <div className="bg-amber-100 p-1.5 rounded border border-amber-300">
                        <span className="block text-[9px] font-sans font-bold text-amber-900">HARGA JADI (box)</span>
                        <span className="font-bold text-amber-950">{formatRupiah(pharmaCalc.hargaJadiBox)}</span>
                      </div>
                      <div className="bg-purple-50 p-1.5 rounded border border-purple-200">
                        <span className="block text-[9px] font-sans font-semibold text-purple-700">HARGA JADI +PPN</span>
                        <span className="font-bold text-purple-800">{formatRupiah(pharmaCalc.hargaJadiPlusPpn)}</span>
                      </div>
                    </div>
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
