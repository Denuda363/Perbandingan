import { Product, SupplierQuote, AppSettings, DEFAULT_APP_SETTINGS, ProductUnitTier } from '../types';

export function formatRupiah(value: number): string {
  if (isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

/**
 * Mengonversi input harga/modal (baik berupa angka langsung, string angka,
 * ataupun teks dengan pemisah ribuan seperti "100.000" atau "100,000")
 * menjadi angka murni tanpa error validasi.
 * Nilai yang dicantumkan langsung dipakai sebagai modal dasar.
 */
export function parseCurrencyInput(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  const trimmed = value.toString().trim();
  if (!trimmed) return 0;

  // Hapus karakter selain digit, titik, koma, minus
  let cleaned = trimmed.replace(/[^0-9.,-]/g, '');
  if (!cleaned) return 0;

  // Format ribuan Indonesia e.g. "150.000" atau "150.000,50"
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.') && !cleaned.includes(',')) {
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    const parts = cleaned.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }

  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

export interface MarginFormulaInput {
  modal: number; // Modal Dasar / HNA / Harga Pokok (Rupiah)
  discount1Value?: number; // Nilai Diskon 1 (bisa % atau Rp)
  discount1Type?: 'percent' | 'amount'; // Tipe Diskon 1: '%' atau 'amount' (Rp)
  discount2Value?: number; // Nilai Diskon 2 (bisa % atau Rp)
  discount2Type?: 'percent' | 'amount'; // Tipe Diskon 2: '%' atau 'amount' (Rp)
  ppnPercent?: number; // Tarif PPN (misal: 11 atau 12)
  ppnEnabled?: boolean; // PPN diaktifkan atau tidak (default true)
  marginValue?: number; // Nilai Margin (bisa % atau Rp)
  marginType?: 'percent' | 'amount'; // Tipe Margin: '%' atau 'amount' (Rp)
  roundingOption?: 'none' | 'hundred' | 'thousand';
  subUnitCount?: number; // Jumlah pecahan per box (contoh: 10 lembar/strip)
  subUnitName?: string; // Nama satuan pecahan (contoh: 'lembar')
}

export interface MarginFormulaResult {
  modal: number;
  
  // Diskon 1
  discount1Type: 'percent' | 'amount';
  discount1Value: number;
  discount1Amount: number; // Potongan rupiah dari Diskon 1
  subtotalAfterD1: number; // Modal - D1
  
  // Diskon 2
  discount2Type: 'percent' | 'amount';
  discount2Value: number;
  discount2Amount: number; // Potongan rupiah dari Diskon 2
  totalDiscountAmount: number; // D1 + D2
  
  // Modal Bersih
  netCostAfterDiscounts: number; // (Modal - diskon 1 - diskon 2)
  
  // PPN
  ppnPercent: number;
  ppnEnabled: boolean;
  ppnAmount: number;
  costWithPpn: number; // (Modal - diskon 1 - diskon 2 + ppn)
  
  // Margin
  marginType: 'percent' | 'amount';
  marginValue: number;
  marginAmount: number; // Nilai rupiah margin keuntungan
  
  // Hasil Akhir: (Modal - diskon 1 - diskon 2 + ppn) + margin
  rawSellingPrice: number;
  sellingPrice: number; // Harga jual setelah pembulatan kasir
  profitPerUnit: number; // Laba kotor per Box
  profitPercentage: number; // Persentase laba terhadap modal yang dibayar
  
  // Satuan pecahan kecil (lembar / strip)
  subUnitCount: number;
  subUnitName: string;
  costPerSubUnit: number; // Modal per lembar setelah diskon
  costWithPpnPerSubUnit: number; // Modal + PPN per lembar
  sellingPricePerSubUnit: number; // Harga jual per lembar
  profitPerSubUnit: number; // Laba per lembar
  
  // Ringkasan rumus teks
  formulaString: string;
}

/**
 * Rumus Resmi Perhitungan Margin:
 * (Modal - diskon 1 - diskon 2 + ppn) + margin
 * Dimana diskon 1 dan diskon 2 dapat berupa % bisa juga Rp
 * Margin juga dapat berupa % atau Rp
 */
export function calculateMarginFormula(params: MarginFormulaInput): MarginFormulaResult {
  const modal = Math.max(0, params.modal || 0);
  const subCount = params.subUnitCount && params.subUnitCount > 0 ? params.subUnitCount : 10;
  const subName = params.subUnitName || 'lembar';

  // 1. Diskon 1 (bisa % atau Rp)
  const d1Type = params.discount1Type || 'percent';
  const d1Val = Math.max(0, params.discount1Value || 0);
  let d1Amount = 0;
  if (d1Type === 'percent') {
    d1Amount = Math.round(modal * (d1Val / 100));
  } else {
    d1Amount = Math.min(modal, Math.round(d1Val));
  }
  const subtotalAfterD1 = Math.max(0, modal - d1Amount);

  // 2. Diskon 2 (bisa % atau Rp)
  // Untuk diskon bertingkat % apotek, diskon 2 dihitung dari sisa setelah diskon 1
  const d2Type = params.discount2Type || 'percent';
  const d2Val = Math.max(0, params.discount2Value || 0);
  let d2Amount = 0;
  if (d2Type === 'percent') {
    d2Amount = Math.round(subtotalAfterD1 * (d2Val / 100));
  } else {
    d2Amount = Math.min(subtotalAfterD1, Math.round(d2Val));
  }

  const totalDiscountAmount = d1Amount + d2Amount;
  // Modal setelah diskon: (Modal - diskon 1 - diskon 2)
  const netCostAfterDiscounts = Math.max(0, modal - totalDiscountAmount);

  // 3. PPN (+ ppn)
  const ppnEnabled = params.ppnEnabled !== false;
  const ppnPercent = ppnEnabled ? Math.max(0, params.ppnPercent !== undefined ? params.ppnPercent : 11) : 0;
  const ppnAmount = ppnEnabled ? Math.round(netCostAfterDiscounts * (ppnPercent / 100)) : 0;

  // (Modal - diskon 1 - diskon 2 + ppn)
  const costWithPpn = netCostAfterDiscounts + ppnAmount;

  // 4. Margin (+ margin, bisa % atau Rp)
  const mType = params.marginType || 'percent';
  const mVal = Math.max(0, params.marginValue !== undefined ? params.marginValue : 25);
  let marginAmount = 0;
  if (mType === 'percent') {
    marginAmount = Math.round(costWithPpn * (mVal / 100));
  } else {
    marginAmount = Math.round(mVal);
  }

  // ((Modal - diskon 1 - diskon 2 + ppn) + margin)
  const rawSellingPrice = costWithPpn + marginAmount;
  let finalSellingPrice = Math.round(rawSellingPrice);

  if (params.roundingOption === 'hundred') {
    finalSellingPrice = Math.ceil(finalSellingPrice / 100) * 100;
  } else if (params.roundingOption === 'thousand') {
    finalSellingPrice = Math.ceil(finalSellingPrice / 1000) * 1000;
  }

  const profitPerUnit = finalSellingPrice - costWithPpn;
  const profitPercentage = costWithPpn > 0 ? parseFloat(((profitPerUnit / costWithPpn) * 100).toFixed(1)) : 0;

  const costPerSubUnit = Math.round(netCostAfterDiscounts / subCount);
  const costWithPpnPerSubUnit = Math.round(costWithPpn / subCount);
  const sellingPricePerSubUnit = Math.round(finalSellingPrice / subCount);
  const profitPerSubUnit = sellingPricePerSubUnit - costWithPpnPerSubUnit;

  const d1Formatted = d1Type === 'percent' ? `${d1Val}% (-${formatRupiah(d1Amount)})` : `-${formatRupiah(d1Amount)}`;
  const d2Formatted = d2Type === 'percent' ? `${d2Val}% (-${formatRupiah(d2Amount)})` : `-${formatRupiah(d2Amount)}`;
  const marginFormatted = mType === 'percent' ? `+${mVal}% (+${formatRupiah(marginAmount)})` : `+${formatRupiah(marginAmount)}`;

  const formulaString = `(${formatRupiah(modal)} - D1:${d1Formatted} - D2:${d2Formatted} + PPN:${formatRupiah(ppnAmount)}) + Margin:${marginFormatted} = ${formatRupiah(finalSellingPrice)}`;

  return {
    modal,
    discount1Type: d1Type,
    discount1Value: d1Val,
    discount1Amount: d1Amount,
    subtotalAfterD1,
    discount2Type: d2Type,
    discount2Value: d2Val,
    discount2Amount: d2Amount,
    totalDiscountAmount,
    netCostAfterDiscounts,
    ppnPercent,
    ppnEnabled,
    ppnAmount,
    costWithPpn,
    marginType: mType,
    marginValue: mVal,
    marginAmount,
    rawSellingPrice,
    sellingPrice: finalSellingPrice,
    profitPerUnit,
    profitPercentage,
    subUnitCount: subCount,
    subUnitName: subName,
    costPerSubUnit,
    costWithPpnPerSubUnit,
    sellingPricePerSubUnit,
    profitPerSubUnit,
    formulaString,
  };
}

export interface SellingPriceCalculation {
  costPrice: number; // Harga Beli / Modal Dasar
  ppnRate: number; // e.g. 0.11
  ppnAmount: number; // Nilai PPN dalam Rupiah
  costWithPpn: number; // Modal + PPN
  marginPercent: number; // e.g. 25%
  marginType?: 'percent' | 'amount';
  marginAmount: number; // Nilai Margin / Keuntungan
  sellingPrice: number; // Harga Rekomendasi Jual Akhir (+ Margin)
  profitPerUnit: number; // Laba Kotor per Unit
  formulaResult?: MarginFormulaResult;
}

/**
 * Menghitung Harga Jual yang sudah di-plus Margin dan PPN sesuai rumus:
 * (Modal - diskon 1 - diskon 2 + ppn) + margin
 */
export function calculateSellingPrice(
  costPrice: number,
  settings: AppSettings = DEFAULT_APP_SETTINGS,
  customOptions?: {
    discount1Value?: number;
    discount1Type?: 'percent' | 'amount';
    discount2Value?: number;
    discount2Type?: 'percent' | 'amount';
    marginValue?: number;
    marginType?: 'percent' | 'amount';
  }
): SellingPriceCalculation {
  const modal = Math.max(0, costPrice || 0);
  
  const formula = calculateMarginFormula({
    modal,
    discount1Value: customOptions?.discount1Value ?? settings.defaultDiscount1Value ?? 0,
    discount1Type: customOptions?.discount1Type ?? settings.defaultDiscount1Type ?? 'percent',
    discount2Value: customOptions?.discount2Value ?? settings.defaultDiscount2Value ?? 0,
    discount2Type: customOptions?.discount2Type ?? settings.defaultDiscount2Type ?? 'percent',
    ppnPercent: settings.ppnPercent,
    ppnEnabled: settings.ppnEnabled,
    marginValue: customOptions?.marginValue ?? (settings.marginType === 'amount' ? settings.marginAmountValue : settings.marginPercent),
    marginType: customOptions?.marginType ?? settings.marginType ?? 'percent',
    roundingOption: settings.roundingOption,
  });

  return {
    costPrice: modal,
    ppnRate: formula.ppnEnabled ? formula.ppnPercent / 100 : 0,
    ppnAmount: formula.ppnAmount,
    costWithPpn: formula.costWithPpn,
    marginPercent: formula.marginType === 'percent' ? formula.marginValue : (formula.costWithPpn > 0 ? Math.round((formula.marginAmount / formula.costWithPpn) * 100) : 0),
    marginType: formula.marginType,
    marginAmount: formula.marginAmount,
    sellingPrice: formula.sellingPrice,
    profitPerUnit: formula.profitPerUnit,
    formulaResult: formula,
  };
}

export interface ProductPriceStats {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  difference: number;
  savingsPercentage: number;
  cheapestQuote: SupplierQuote | null;
  expensiveQuote: SupplierQuote | null;
  quoteCount: number;
}

export function getProductPriceStats(product: Product): ProductPriceStats {
  const quotes = product.quotes || [];
  if (quotes.length === 0) {
    return {
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      difference: 0,
      savingsPercentage: 0,
      cheapestQuote: null,
      expensiveQuote: null,
      quoteCount: 0,
    };
  }

  const sorted = [...quotes].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];
  const expensive = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, q) => acc + q.price, 0);
  const avg = Math.round(sum / sorted.length);
  const diff = expensive.price - cheapest.price;
  const savingsPct = expensive.price > 0 ? Math.round((diff / expensive.price) * 100) : 0;

  return {
    minPrice: cheapest.price,
    maxPrice: expensive.price,
    avgPrice: avg,
    difference: diff,
    savingsPercentage: savingsPct,
    cheapestQuote: cheapest,
    expensiveQuote: expensive,
    quoteCount: quotes.length,
  };
}

export interface PharmacyPricingCalculation {
  hna: number;
  discountPercent: number; // backward compatibility
  discountAmount: number;
  discount1Type: 'percent' | 'amount';
  discount1Value: number;
  discount1Amount: number;
  discount2Type: 'percent' | 'amount';
  discount2Value: number;
  discount2Amount: number;
  totalDiscountAmount: number;
  hargaJadiBox: number;
  hargaJadiLembar: number;
  hargaJadiPlusPpn: number;
  hargaJadiLembarPlusPpn: number;
  marginType?: 'percent' | 'amount';
  marginValue?: number;
  marginAmount?: number;
  sellingPriceBox?: number;
  sellingPriceLembar?: number;
  subUnitCount: number;
  subUnitName: string;
}

/**
 * Calculates pharmacy procurement pricing according to:
 * (Modal - diskon 1 - diskon 2 + ppn) + margin
 * Dimana diskon dapat berupa % bisa juga Rp
 */
export function calculatePharmaPricing({
  hna = 0,
  discountPercent = 0,
  discount1Value,
  discount1Type = 'percent',
  discount2Value = 0,
  discount2Type = 'percent',
  hargaJadiBoxInput,
  marginValue = 25,
  marginType = 'percent',
  subUnitCount = 10,
  subUnitName = 'lembar',
  ppnRate = 0.11,
}: {
  hna?: number;
  discountPercent?: number;
  discount1Value?: number;
  discount1Type?: 'percent' | 'amount';
  discount2Value?: number;
  discount2Type?: 'percent' | 'amount';
  hargaJadiBoxInput?: number;
  marginValue?: number;
  marginType?: 'percent' | 'amount';
  subUnitCount?: number;
  subUnitName?: string;
  ppnRate?: number;
}): PharmacyPricingCalculation {
  const safeCount = subUnitCount && subUnitCount > 0 ? subUnitCount : 10;
  let finalHna = hna;
  
  // Support either discount1Value or legacy discountPercent
  const d1Val = discount1Value !== undefined ? discount1Value : (discountPercent || 0);
  const d1Type = discount1Type || 'percent';
  const d2Val = discount2Value || 0;
  const d2Type = discount2Type || 'percent';

  let finalBox = 0;

  if (hargaJadiBoxInput !== undefined && hargaJadiBoxInput > 0) {
    finalBox = hargaJadiBoxInput;
    if (finalHna <= 0) {
      finalHna = finalBox;
    }
  }

  // Calculate using formula
  const formula = calculateMarginFormula({
    modal: finalHna,
    discount1Value: d1Val,
    discount1Type: d1Type,
    discount2Value: d2Val,
    discount2Type: d2Type,
    ppnPercent: Math.round(ppnRate * 100),
    ppnEnabled: ppnRate > 0,
    marginValue: marginValue,
    marginType: marginType,
    subUnitCount: safeCount,
    subUnitName: subUnitName || 'lembar',
  });

  if (finalBox === 0) {
    finalBox = formula.netCostAfterDiscounts;
  }

  const hargaLembar = Math.round(finalBox / safeCount);
  const hargaPlusPpn = Math.round(finalBox * (1 + ppnRate));
  const hargaLembarPlusPpn = Math.round(hargaLembar * (1 + ppnRate));

  return {
    hna: finalHna,
    discountPercent: d1Type === 'percent' ? d1Val : (finalHna > 0 ? parseFloat(((formula.totalDiscountAmount / finalHna) * 100).toFixed(2)) : 0),
    discountAmount: formula.totalDiscountAmount,
    discount1Type: d1Type,
    discount1Value: d1Val,
    discount1Amount: formula.discount1Amount,
    discount2Type: d2Type,
    discount2Value: d2Val,
    discount2Amount: formula.discount2Amount,
    totalDiscountAmount: formula.totalDiscountAmount,
    hargaJadiBox: finalBox,
    hargaJadiLembar: hargaLembar,
    hargaJadiPlusPpn: hargaPlusPpn,
    hargaJadiLembarPlusPpn: hargaLembarPlusPpn,
    marginType,
    marginValue,
    marginAmount: formula.marginAmount,
    sellingPriceBox: formula.sellingPrice,
    sellingPriceLembar: formula.sellingPricePerSubUnit,
    subUnitCount: safeCount,
    subUnitName: subUnitName || 'lembar',
  };
}

export function exportProductsToCSV(products: Product[]): void {
  const headers = [
    'Nama Produk',
    'Company / Produsen',
    'Kemasan',
    'Isi Kemasan',
    'Kategori',
    'Satuan',
    'Supplier',
    'HNA (Rp)',
    'Diskon (%)',
    'HARGA JADI Lembar/Strip (Rp)',
    'HARGA JADI Box (Rp)',
    'HARGA JADI +PPN 11% (Rp)',
    'MOQ',
    'Lead Time (Hari)',
    'Status Stok',
    'Catatan',
    'Terakhir Update',
  ];

  const rows: string[][] = [];

  products.forEach((prod) => {
    const subCount = prod.subUnitCount || 10;
    if (prod.quotes.length === 0) {
      rows.push([
        `"${prod.name.replace(/"/g, '""')}"`,
        `"${(prod.company || '-').replace(/"/g, '""')}"`,
        `"${(prod.packaging || '-').replace(/"/g, '""')}"`,
        `"${(prod.packContent || `1 Box = ${subCount} Lembar`).replace(/"/g, '""')}"`,
        `"${prod.category.replace(/"/g, '""')}"`,
        `"${prod.defaultUnit}"`,
        '-',
        '0',
        '0%',
        '0',
        '0',
        '0',
        '-',
        '-',
        '-',
        '-',
        '-',
      ]);
    } else {
      prod.quotes.forEach((q) => {
        const pricing = calculatePharmaPricing({
          hna: q.hna,
          discountPercent: q.discountPercent,
          hargaJadiBoxInput: q.price,
          subUnitCount: subCount,
          subUnitName: prod.subUnitName || 'lembar',
        });

        rows.push([
          `"${prod.name.replace(/"/g, '""')}"`,
          `"${(prod.company || '-').replace(/"/g, '""')}"`,
          `"${(prod.packaging || '-').replace(/"/g, '""')}"`,
          `"${(prod.packContent || `1 Box = ${subCount} Lembar`).replace(/"/g, '""')}"`,
          `"${prod.category.replace(/"/g, '""')}"`,
          `"${q.unit || prod.defaultUnit}"`,
          `"${q.supplierName.replace(/"/g, '""')}"`,
          pricing.hna.toString(),
          `${pricing.discountPercent}%`,
          pricing.hargaJadiLembar.toString(),
          pricing.hargaJadiBox.toString(),
          pricing.hargaJadiPlusPpn.toString(),
          (q.moq || 1).toString(),
          (q.leadTimeDays || 0).toString(),
          q.inStock !== false ? 'Tersedia' : 'Indent/Habis',
          `"${(q.notes || '').replace(/"/g, '""')}"`,
          q.lastUpdated || '',
        ]);
      });
    }
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `perbandingan_harga_supplier_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface ProductUnitConversion {
  name: string; // Nama satuan, misal: "Lembar", "Box", "Botol"
  level: number; // 1 = Satuan Utama (Terkecil), 2 = Satuan Kedua (Konversi), dst.
  content: number; // Isi per satuan tingkat sebelumnya (Level 1 = 1; Level 2 misal 10 Lembar/Box)
  totalRatio: number; // Rasio kelipatan terhadap Satuan Utama/Terkecil (Level 1 = 1; Level 2 = 10)
  costPrice: number; // Modal beli per satuan ini
  sellingPrice: number; // Estimasi harga jual apotek per satuan ini
  profit: number; // Laba kotor per satuan ini
  isSmallest: boolean; // True jika ini adalah satuan terkecil
  isBase: boolean; // True jika ini adalah satuan utama (satuan terkecil)
  description: string; // Teks penjelas (contoh: "Satuan Utama (Terkecil)" atau "1 Box = 10 Lembar")
}

/**
 * Menormalkan struktur satuan produk menjadi daftar tier hierarki.
 * Aturan:
 * - Satuan terkecil adalah Satuan Utama (Level 1)
 * - Satuan kedua dan berikutnya dikonversi dari satuan terkecil
 * - Contoh: Satuan kecil Lembar (Level 1) = Rp 1.000, 1 Box = 10 Lembar (Level 2) = Rp 10.000
 * - Jika produk hanya memiliki 1 satuan saja (Single Unit, e.g. Botol, Tube): Level 1 saja
 */
export function normalizeProductUnits(product: Partial<Product> | null | undefined): ProductUnitTier[] {
  if (!product) {
    return [{ name: 'Pcs', content: 1, totalRatio: 1, level: 1 }];
  }

  // Jika produk dinyatakan hanya memiliki 1 satuan saja (hasMultiUnits === false)
  if (product.hasMultiUnits === false) {
    return [{
      name: (product.defaultUnit || 'Botol').trim(),
      content: 1,
      totalRatio: 1,
      level: 1,
    }];
  }

  // Jika produk memiliki konfigurasi units eksplisit
  if (product.units && Array.isArray(product.units) && product.units.length > 0) {
    if (product.units.length === 1) {
      return [{
        name: (product.units[0].name || product.defaultUnit || 'Satuan').trim(),
        content: 1,
        totalRatio: 1,
        level: 1,
      }];
    }

    // Periksa apakah format units sudah berurutan dari terkecil ke terbesar
    // atau terbalik (kemasan terbesar dulu seperti Box lalu Lembar).
    // Jika units[0] adalah kemasan besar (e.g. Box) dan units[1] adalah pecahan kecil (e.g. Lembar/Strip/Tablet)
    // dengan ratio atau content > 1, kita balik agar Satuan Terkecil menjadi Satuan Utama (Level 1).
    const firstTier = product.units[0];
    const secondTier = product.units[1];
    const firstTierLower = (firstTier.name || '').toLowerCase();
    const secondTierLower = (secondTier.name || '').toLowerCase();

    // Nama kemasan / wadah besar umum
    const isContainer = (n: string) =>
      ['box', 'dus', 'karton', 'botol', 'pack', 'slop', 'kaleng', 'renceng', 'blister', 'strip', 'jerigen'].some(c => n.includes(c));
    // Nama satuan pecahan / eceran kecil umum
    const isSmallUnit = (n: string) =>
      ['lembar', 'tablet', 'kaplet', 'kapsul', 'biji', 'butir', 'pcs', 'sachet', 'ampul', 'vial', 'tube'].some(s => n.includes(s));

    // Periksa apakah format units perlu dibalik agar Satuan Terkecil menjadi Satuan Utama (Level 1)
    const isLegacyLargeFirst = 
      product.units.length >= 2 && 
      secondTier && 
      (secondTier.content > 1 || secondTier.totalRatio > 1) &&
      firstTier.content === 1 &&
      (isContainer(firstTierLower) || isSmallUnit(secondTierLower));

    if (isLegacyLargeFirst) {
      // Ubah urutan: Satuan Terkecil menjadi Satuan Utama (Level 1), Satuan Kedua (Kemasan) menjadi Level 2
      const smallestName = (secondTier.name || product.subUnitName || 'Lembar').trim();
      const largerName = (firstTier.name || product.defaultUnit || 'Box').trim();
      const contentRatio = Math.max(1, secondTier.content || product.subUnitCount || 10);

      const result: ProductUnitTier[] = [
        {
          name: smallestName,
          content: 1,
          totalRatio: 1,
          level: 1,
        },
        {
          name: largerName,
          content: contentRatio,
          totalRatio: contentRatio,
          level: 2,
        },
      ];

      // Jika ada tingkat 3 (misal Karton)
      if (product.units.length > 2) {
        for (let i = 2; i < product.units.length; i++) {
          const t = product.units[i];
          const ratio = Math.max(1, t.totalRatio || (result[result.length - 1].totalRatio * (t.content || 1)));
          result.push({
            name: t.name.trim(),
            content: t.content || 1,
            totalRatio: ratio,
            level: i + 1,
          });
        }
      }

      return result;
    }

    // Jika sudah dimulai dari satuan terkecil
    let runningRatio = 1;
    return product.units.map((u, idx) => {
      const level = idx + 1;
      const content = level === 1 ? 1 : Math.max(1, u.content || 1);
      runningRatio = level === 1 ? 1 : runningRatio * content;
      return {
        name: (u.name || (level === 1 ? 'Lembar' : 'Box')).trim(),
        content,
        totalRatio: runningRatio,
        level,
      };
    });
  }

  // Jika produk memiliki data pecahan legacy (subUnitCount & subUnitName)
  const subCount = product.subUnitCount !== undefined ? product.subUnitCount : 0;
  const subName = (product.subUnitName || '').trim();

  // Jika subUnitCount > 1 dan nama satuan pecahan berbeda dari kemasan
  if (subCount > 1 && subName && subName.toLowerCase() !== (product.defaultUnit || '').toLowerCase()) {
    return [
      {
        name: subName, // Satuan terkecil adalah Satuan Utama (contoh: Lembar)
        content: 1,
        totalRatio: 1,
        level: 1,
      },
      {
        name: (product.defaultUnit || 'Box').trim(), // Satuan kedua (contoh: Box)
        content: subCount,
        totalRatio: subCount,
        level: 2,
      },
    ];
  }

  // Satuan non-pecahan tunggal
  return [{
    name: (product.defaultUnit || 'Botol').trim(),
    content: 1,
    totalRatio: 1,
    level: 1,
  }];
}

/**
 * Menghitung rincian konversi harga (modal beli, estimasi harga jual, dan laba)
 * untuk setiap satuan produk berdasarkan acuan:
 * - Satuan terkecil adalah satuan utama (Index 0)
 * - Satuan kedua dan berikutnya harga dikonversi dari satuan terkecil
 * - Contoh: Satuan kecil Lembar = Rp 1.000, 1 Box = 10 Lembar => 1 Box = Rp 10.000
 */
export function getProductUnitConversions(
  product: Partial<Product> | null | undefined,
  baseCostPrice: number,
  baseSellingPrice?: number
): ProductUnitConversion[] {
  const units = normalizeProductUnits(product);
  const cost = Math.max(0, baseCostPrice || 0);
  const selling = baseSellingPrice !== undefined ? Math.max(0, baseSellingPrice) : 0;

  if (units.length <= 1) {
    const u = units[0] || { name: product?.defaultUnit || 'Botol', content: 1, totalRatio: 1, level: 1 };
    const profit = selling > 0 ? selling - cost : 0;
    return [{
      name: u.name,
      level: 1,
      content: 1,
      totalRatio: 1,
      costPrice: cost,
      sellingPrice: selling,
      profit,
      isSmallest: true,
      isBase: true,
      description: `1 Satuan: ${u.name}`,
    }];
  }

  // Multi-Satuan:
  // Satuan terkecil adalah satuan utama (Index 0).
  // Hitung modal dasar per Satuan Terkecil.
  const secondTierRatio = Math.max(1, units[1]?.totalRatio || units[1]?.content || 10);
  
  // Tentukan harga per satuan terkecil:
  // Acuan: Satuan terkecil adalah satuan utama.
  // Misal: Lembar = Rp 1.000, 1 Box = 10 Lembar => 1 Box = Rp 10.000
  let smallestCost = 0;
  if (cost > 0) {
    // 1. Cek apakah ada penawaran quote yang tepat sesuai nilai cost
    const matchedQuote = product?.quotes?.find(q => q.price === cost || q.pricePerSubUnit === cost);
    if (matchedQuote) {
      if (matchedQuote.pricePerSubUnit && matchedQuote.pricePerSubUnit > 0) {
        smallestCost = matchedQuote.pricePerSubUnit;
      } else if (matchedQuote.unit && matchedQuote.unit.toLowerCase() === units[0].name.toLowerCase()) {
        smallestCost = matchedQuote.price;
      } else {
        smallestCost = Math.round(matchedQuote.price / secondTierRatio);
      }
    } else {
      // 2. Evaluasi berdasarkan defaultUnit produk atau threshold
      const defaultUnitLower = (product?.defaultUnit || '').toLowerCase();
      const smallestUnitLower = units[0].name.toLowerCase();
      const secondUnitLower = (units[1]?.name || '').toLowerCase();

      if (defaultUnitLower && defaultUnitLower === smallestUnitLower) {
        smallestCost = cost;
      } else if (defaultUnitLower && defaultUnitLower === secondUnitLower) {
        smallestCost = Math.round(cost / secondTierRatio);
      } else if (cost < 5000 && secondTierRatio >= 5) {
        // Angka eceran satuan terkecil (misal Lembar = 1000)
        smallestCost = cost;
      } else {
        smallestCost = Math.round(cost / secondTierRatio);
      }
    }
  }

  let smallestSelling = 0;
  if (selling > 0) {
    if (cost > 0 && smallestCost > 0) {
      // Jika cost adalah harga kemasan (box), maka selling juga harga kemasan
      if (cost >= smallestCost * (secondTierRatio - 0.5)) {
        smallestSelling = Math.round(selling / secondTierRatio);
      } else {
        smallestSelling = selling;
      }
    } else {
      smallestSelling = Math.round(selling / secondTierRatio);
    }
  }

  return units.map((tier, idx) => {
    const isSmallest = idx === 0;
    const isBase = isSmallest;
    const ratio = Math.max(1, tier.totalRatio || 1);

    // Satuan kedua dan berikutnya dikonversi dari satuan terkecil:
    // Lembar = smallestCost
    // 1 Box = 10 Lembar => 10 * smallestCost
    const unitCost = Math.round(smallestCost * ratio);
    const unitSelling = smallestSelling > 0 ? Math.round(smallestSelling * ratio) : 0;
    const profit = unitSelling > 0 ? unitSelling - unitCost : 0;

    let description = 'Satuan Utama (Terkecil)';
    if (!isSmallest) {
      description = `1 ${tier.name} = ${tier.content} ${units[0].name} (Dikonversi dari ${units[0].name})`;
    }

    return {
      name: tier.name,
      level: idx + 1,
      content: tier.content,
      totalRatio: ratio,
      costPrice: unitCost,
      sellingPrice: unitSelling,
      profit,
      isSmallest,
      isBase,
      description,
    };
  });
}

/**
 * Memeriksa apakah produk merupakan produk multi-satuan (> 1 satuan)
 * atau hanya memiliki 1 satuan tunggal.
 */
export function isProductMultiUnit(product: Partial<Product> | null | undefined): boolean {
  if (!product) return false;
  if (product.hasMultiUnits === false) return false;
  const units = normalizeProductUnits(product);
  return units.length > 1;
}

/**
 * Format teks ringkas hierarki satuan produk untuk ditampilkan di kartu atau label.
 * Contoh:
 * - 1 Satuan: "1 Satuan: Botol"
 * - 2 Satuan: "1 Box = 10 Lembar (Satuan Utama: Lembar)"
 * - 3 Satuan: "1 Box = 10 Strip @ 10 Tablet (Satuan Utama: Tablet)"
 */
export function formatProductUnitSummary(product: Partial<Product> | null | undefined): string {
  const units = normalizeProductUnits(product);
  if (units.length <= 1) {
    return `1 Satuan: ${units[0]?.name || 'Pcs'}`;
  }

  if (units.length === 2) {
    return `1 ${units[1].name} = ${units[1].content} ${units[0].name} (Satuan Utama: ${units[0].name})`;
  }

  if (units.length === 3) {
    return `1 ${units[2].name} = ${units[2].content} ${units[1].name} @ ${units[1].content} ${units[0].name} (Satuan Utama: ${units[0].name})`;
  }

  // 4 atau lebih tingkatan satuan
  const last = units[units.length - 1];
  return `1 ${last.name} = ${last.totalRatio} ${units[0].name} (Satuan Utama: ${units[0].name})`;
}
