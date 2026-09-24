import { Product, SupplierQuote, AppSettings, DEFAULT_APP_SETTINGS } from '../types';

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
