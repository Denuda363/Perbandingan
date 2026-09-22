import React, { useState, useEffect } from 'react';
import { X, DollarSign, Building2, Calendar, Clock, Boxes, Check, Calculator } from 'lucide-react';
import { Product, Supplier, SupplierQuote } from '../types';
import { calculatePharmaPricing, formatRupiah } from '../utils/formatters';

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
  const [hna, setHna] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [unit, setUnit] = useState('');
  const [moq, setMoq] = useState<string>('1');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('1');
  const [notes, setNotes] = useState('');
  const [inStock, setInStock] = useState(true);

  const activeProduct = products.find((p) => p.id === productId) || selectedProduct;
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
    } else {
      setSupplierName(suppliers[0]?.name || '');
      setHna('');
      setDiscountPercent('');
      setPrice('');
      setMoq('1');
      setLeadTimeDays('1');
      setNotes('');
      setInStock(true);
    }
  }, [selectedProduct, quoteToEdit, isOpen, products, suppliers]);

  // When product changes in dropdown, update default unit
  const handleProductSelect = (id: string) => {
    setProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setUnit(prod.defaultUnit);
    }
  };

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

  const handleHnaChange = (val: string) => {
    setHna(val);
    const numHna = parseFloat(val) || 0;
    const numDisk = parseFloat(discountPercent) || 0;
    if (numHna > 0) {
      const calc = Math.max(0, Math.round(numHna * (1 - numDisk / 100)));
      setPrice(calc > 0 ? calc.toString() : '');
    }
  };

  const handleDiskChange = (val: string) => {
    setDiscountPercent(val);
    const numDisk = parseFloat(val) || 0;
    const numHna = parseFloat(hna) || 0;
    if (numHna > 0) {
      const calc = Math.max(0, Math.round(numHna * (1 - numDisk / 100)));
      setPrice(calc > 0 ? calc.toString() : '');
    }
  };

  const handlePriceChange = (val: string) => {
    setPrice(val);
    const numPrice = parseFloat(val) || 0;
    const numHna = parseFloat(hna) || 0;
    if (numHna > 0 && numPrice > 0 && numHna >= numPrice) {
      const calcDisk = parseFloat((((numHna - numPrice) / numHna) * 100).toFixed(2));
      setDiscountPercent(calcDisk.toString());
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {quoteToEdit ? 'Edit Penawaran Harga' : 'Input Penawaran Supplier'}
              </h3>
              {activeProduct?.company && (
                <p className="text-xs text-slate-500">
                  {activeProduct.name} ({activeProduct.company})
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Target Product */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Produk Yang Ditawarkan <span className="text-rose-500">*</span>
            </label>
            <select
              disabled={!!selectedProduct && !!quoteToEdit}
              value={productId}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-medium"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.company ? `(${p.company})` : ''} - {p.packaging || p.defaultUnit}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Supplier / PBF Vendor <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              list="supplier-options-list"
              placeholder="Contoh: PT Kinariya atau PT Aman Farma"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <datalist id="supplier-options-list">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          {/* PHARMA PRICING: HNA, DISK, HARGA JADI BOX */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-amber-700" />
              <span>Skema Harga Farmasi (HNA, Diskon, Harga Jadi)</span>
            </div>

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
                  value={hna}
                  onChange={(e) => handleHnaChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
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
                  value={discountPercent}
                  onChange={(e) => handleDiskChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-emerald-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-900 mb-0.5">
                  HARGA JADI (box) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="100"
                  placeholder="9500"
                  value={price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border-2 border-emerald-500 rounded-lg bg-white font-extrabold text-slate-900"
                />
              </div>
            </div>

            {/* Live Calculation Grid */}
            <div className="bg-white border border-amber-300 rounded-lg p-2.5 text-xs">
              <div className="text-[10px] font-semibold text-slate-500 mb-1">
                Kalkulasi Otomatis (Kemasan: {activeProduct?.packContent || `1 Box = ${subCount} ${subName}`}):
              </div>
              <div className="grid grid-cols-5 gap-1 text-center font-mono text-[11px]">
                <div className="bg-slate-50 p-1 rounded border border-slate-200">
                  <span className="block text-[8px] font-sans text-slate-500">HNA</span>
                  <span className="font-bold text-slate-700">{formatRupiah(pharmaCalc.hna)}</span>
                </div>
                <div className="bg-emerald-50 p-1 rounded border border-emerald-200">
                  <span className="block text-[8px] font-sans text-emerald-700">DISK</span>
                  <span className="font-bold text-emerald-700">{pharmaCalc.discountPercent}%</span>
                </div>
                <div className="bg-blue-50 p-1 rounded border border-blue-200">
                  <span className="block text-[8px] font-sans text-blue-700">HARGA JADI ({subName})</span>
                  <span className="font-bold text-blue-800">{formatRupiah(pharmaCalc.hargaJadiLembar)}</span>
                </div>
                <div className="bg-amber-100 p-1 rounded border border-amber-300">
                  <span className="block text-[8px] font-sans font-bold text-amber-900">HARGA JADI (box)</span>
                  <span className="font-bold text-amber-950">{formatRupiah(pharmaCalc.hargaJadiBox)}</span>
                </div>
                <div className="bg-purple-50 p-1 rounded border border-purple-200">
                  <span className="block text-[8px] font-sans text-purple-700">+PPN 11%</span>
                  <span className="font-bold text-purple-800">{formatRupiah(pharmaCalc.hargaJadiPlusPpn)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MOQ & Lead Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Min. Order (MOQ)
              </label>
              <input
                type="number"
                min="1"
                placeholder="1"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lead Time (Hari)
              </label>
              <input
                type="number"
                min="0"
                placeholder="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Status Stok */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="stock-toggle"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="stock-toggle" className="text-xs text-slate-700 font-medium cursor-pointer">
              Stok Tersedia / Ready (Bukan Indent)
            </label>
          </div>

          {/* Catatan / Syarat Khusus */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Penawaran / Syarat Pembayaran
            </label>
            <input
              type="text"
              placeholder="Contoh: Tempo 30 hari, gratis ongkir min order 10 box"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>

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
              {quoteToEdit ? 'Simpan Perubahan' : 'Simpan Penawaran'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
