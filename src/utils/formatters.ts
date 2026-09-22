import { Product, SupplierQuote } from '../types';

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
  discountPercent: number;
  discountAmount: number;
  hargaJadiBox: number;
  hargaJadiLembar: number;
  hargaJadiPlusPpn: number;
  hargaJadiLembarPlusPpn: number;
  subUnitCount: number;
  subUnitName: string;
}

/**
 * Calculates pharmacy procurement pricing according to Indonesian standard:
 * HNA (Harga Netto Apotek) -> DISK (%) -> HARGA JADI (box) -> HARGA JADI (lembar) -> HARGA JADI +PPN (11%)
 */
export function calculatePharmaPricing({
  hna = 0,
  discountPercent = 0,
  hargaJadiBoxInput,
  subUnitCount = 10,
  subUnitName = 'lembar',
  ppnRate = 0.11,
}: {
  hna?: number;
  discountPercent?: number;
  hargaJadiBoxInput?: number;
  subUnitCount?: number;
  subUnitName?: string;
  ppnRate?: number;
}): PharmacyPricingCalculation {
  const safeCount = subUnitCount && subUnitCount > 0 ? subUnitCount : 10;
  let finalHna = hna;
  let finalDisk = discountPercent;
  let finalBox = 0;

  if (hargaJadiBoxInput !== undefined && hargaJadiBoxInput > 0) {
    finalBox = hargaJadiBoxInput;
    if (finalHna > 0 && finalHna >= finalBox) {
      finalDisk = parseFloat((((finalHna - finalBox) / finalHna) * 100).toFixed(2));
    } else if (finalDisk > 0 && finalDisk < 100) {
      finalHna = Math.round(finalBox / (1 - finalDisk / 100));
    } else {
      finalHna = finalBox;
    }
  } else {
    const diskAmount = finalHna * (finalDisk / 100);
    finalBox = Math.max(0, Math.round(finalHna - diskAmount));
  }

  const diskAmount = Math.max(0, Math.round(finalHna * (finalDisk / 100)));
  const hargaLembar = Math.round(finalBox / safeCount);
  const hargaPlusPpn = Math.round(finalBox * (1 + ppnRate));
  const hargaLembarPlusPpn = Math.round(hargaLembar * (1 + ppnRate));

  return {
    hna: finalHna,
    discountPercent: finalDisk,
    discountAmount: diskAmount,
    hargaJadiBox: finalBox,
    hargaJadiLembar: hargaLembar,
    hargaJadiPlusPpn: hargaPlusPpn,
    hargaJadiLembarPlusPpn: hargaLembarPlusPpn,
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
