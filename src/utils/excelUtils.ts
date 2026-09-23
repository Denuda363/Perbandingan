import * as XLSX from 'xlsx';
import { Product, Supplier, SupplierQuote } from '../types';

export interface ParsedProductImportItem {
  name: string;
  genericName?: string;
  company?: string;
  packaging?: string;
  packContent?: string;
  subUnitCount?: number;
  subUnitName?: string;
  category: string;
  defaultUnit: string;
  sku?: string;
  description?: string;
  supplierName: string;
  price: number;
  hna?: number;
  discountPercent?: number;
  pricePerSubUnit?: number;
  priceWithPpn?: number;
  moq?: number;
  leadTimeDays?: number;
  inStock?: boolean;
  notes?: string;
}

export interface ParsedSupplierImportItem {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  rating?: number;
  notes?: string;
}

export interface ImportedProductComparison {
  productName: string;
  genericName?: string;
  company?: string;
  packaging?: string;
  packContent?: string;
  category: string;
  defaultUnit: string;
  subUnitCount: number;
  subUnitName: string;
  quotes: ParsedProductImportItem[];
  cheapestQuote: ParsedProductImportItem | null;
  highestQuote: ParsedProductImportItem | null;
  priceDifference: number;
  savingsPercentage: number;
  supplierCount: number;
}

export interface ExcelParseResult {
  parsedQuotes: ParsedProductImportItem[];
  parsedSuppliers: ParsedSupplierImportItem[];
  errors: string[];
  warnings: string[];
  sheetNames: string[];
  totalRows: number;
}

/**
 * Groups raw imported quotes by product to show instant price comparisons
 * and identify the recommended lowest price supplier for each product.
 */
export function groupImportedQuotesByProduct(quotes: ParsedProductImportItem[]): ImportedProductComparison[] {
  const map = new Map<string, ImportedProductComparison>();

  for (const q of quotes) {
    if (!q.name || !q.name.trim()) continue;
    const key = q.name.trim().toLowerCase();
    
    if (!map.has(key)) {
      map.set(key, {
        productName: q.name.trim(),
        genericName: q.genericName,
        company: q.company,
        packaging: q.packaging,
        packContent: q.packContent,
        category: q.category || 'Umum',
        defaultUnit: q.defaultUnit || 'Box',
        subUnitCount: q.subUnitCount || 10,
        subUnitName: q.subUnitName || 'lembar',
        quotes: [],
        cheapestQuote: null,
        highestQuote: null,
        priceDifference: 0,
        savingsPercentage: 0,
        supplierCount: 0,
      });
    }

    const item = map.get(key)!;
    if (q.company && !item.company) item.company = q.company;
    if (q.packaging && !item.packaging) item.packaging = q.packaging;
    if (q.packContent && !item.packContent) item.packContent = q.packContent;
    if (q.category && item.category === 'Umum') item.category = q.category;
    if (q.defaultUnit && item.defaultUnit === 'Box') item.defaultUnit = q.defaultUnit;
    if (q.subUnitCount && item.subUnitCount === 10) item.subUnitCount = q.subUnitCount;
    if (q.subUnitName && item.subUnitName === 'lembar') item.subUnitName = q.subUnitName;

    if (q.supplierName && q.price > 0) {
      item.quotes.push(q);
    }
  }

  const result: ImportedProductComparison[] = [];
  map.forEach((item) => {
    // Sort quotes ascending by price: index 0 is cheapest!
    item.quotes.sort((a, b) => a.price - b.price);
    item.supplierCount = item.quotes.length;

    if (item.quotes.length > 0) {
      item.cheapestQuote = item.quotes[0];
      item.highestQuote = item.quotes[item.quotes.length - 1];
      item.priceDifference = Math.max(0, item.highestQuote.price - item.cheapestQuote.price);
      item.savingsPercentage =
        item.highestQuote.price > 0
          ? Math.round(((item.highestQuote.price - item.cheapestQuote.price) / item.highestQuote.price) * 100)
          : 0;
    }

    result.push(item);
  });

  // Sort products: ones with highest savings or most quotes first
  return result.sort((a, b) => {
    if (b.priceDifference !== a.priceDifference) {
      return b.priceDifference - a.priceDifference;
    }
    return b.supplierCount - a.supplierCount;
  });
}

/**
 * Clean and parse price strings or numbers (e.g. "Rp 10.000", "9,500.00", 10000)
 */
export function parsePriceNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  if (!val) return 0;
  const str = String(val).trim();
  // Remove "Rp", dots, commas, spaces, currency symbols
  // In Indonesian notation, dot is thousand separator and comma is decimal (or vice versa)
  const cleaned = str
    .replace(/Rp/gi, '')
    .replace(/[^\d.,-]/g, '')
    .trim();

  // If format like 10.000 (Indonesian thousand dot)
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    // If only one dot and 3 digits after it, or multiple dots: e.g. 10.000 or 1.500.000
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      return parseInt(parts.join(''), 10) || 0;
    }
    return Math.round(parseFloat(cleaned)) || 0;
  }

  // If format like 10,000.00 or 10.000,00
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      // 10.000,50 -> Indonesian
      const normalized = cleaned.replace(/\./g, '').replace(',', '.');
      return Math.round(parseFloat(normalized)) || 0;
    } else {
      // 10,000.50 -> US
      const normalized = cleaned.replace(/,/g, '');
      return Math.round(parseFloat(normalized)) || 0;
    }
  }

  // If format like 10,000 (US thousand comma)
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    const parts = cleaned.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      return parseInt(parts.join(''), 10) || 0;
    }
    return Math.round(parseFloat(cleaned.replace(',', '.'))) || 0;
  }

  return Math.round(parseFloat(cleaned)) || 0;
}

/**
 * Normalizes header keys for tolerant matching
 */
function normalizeHeaderKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Generates and triggers download of the official Excel template (.xlsx)
 */
export function downloadCompleteExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Produk & Harga Penawaran (Lengkap dengan Company, Kemasan, Isi, HNA, Diskon)
  const productData = [
    {
      'Nama Produk *': 'Paracetamol 500mg',
      'Company Produk / Pabrik': 'PT Kimia Farma Tbk',
      'Kemasan': 'Tablet 10 x 10',
      'Isi Kemasan': '1 Box = 10 Lembar',
      'Jumlah Isi (Pecahan)': 10,
      'Satuan Pecahan': 'lembar',
      'Kategori': 'Analgesik & Antipiretik',
      'Satuan Dasar': 'Box',
      'SKU / Kode': 'PCT-500-BX',
      'Deskripsi': 'Paracetamol pereda demam dan nyeri',
      'Nama Supplier *': 'PT Kinariya',
      'HNA (Rp)': 11000,
      'Diskon (%)': 13.64,
      'HARGA JADI Box (Rp) *': 9500,
      'HARGA JADI Lembar (Rp)': 950,
      'HARGA JADI +PPN 11% (Rp)': 10545,
      'MOQ (Min Order)': 5,
      'Lead Time (Hari)': 1,
      'Status Stok (Tersedia/Habis)': 'Tersedia',
      'Catatan Penawaran': 'Harga promo kuartal, exp 2028',
    },
    {
      'Nama Produk *': 'Paracetamol 500mg',
      'Company Produk / Pabrik': 'PT Kimia Farma Tbk',
      'Kemasan': 'Tablet 10 x 10',
      'Isi Kemasan': '1 Box = 10 Lembar',
      'Jumlah Isi (Pecahan)': 10,
      'Satuan Pecahan': 'lembar',
      'Kategori': 'Analgesik & Antipiretik',
      'Satuan Dasar': 'Box',
      'SKU / Kode': 'PCT-500-BX',
      'Deskripsi': 'Paracetamol pereda demam dan nyeri',
      'Nama Supplier *': 'PT Aman Farma',
      'HNA (Rp)': 11000,
      'Diskon (%)': 9.09,
      'HARGA JADI Box (Rp) *': 10000,
      'HARGA JADI Lembar (Rp)': 1000,
      'HARGA JADI +PPN 11% (Rp)': 11100,
      'MOQ (Min Order)': 1,
      'Lead Time (Hari)': 1,
      'Status Stok (Tersedia/Habis)': 'Tersedia',
      'Catatan Penawaran': 'Bisa eceran tanpa minimum order',
    },
    {
      'Nama Produk *': 'Amoxicillin 500mg',
      'Company Produk / Pabrik': 'PT Sanbe Farma',
      'Kemasan': 'Kaplet 10 x 10',
      'Isi Kemasan': '1 Box = 10 Lembar (100 Kaplet)',
      'Jumlah Isi (Pecahan)': 10,
      'Satuan Pecahan': 'lembar',
      'Kategori': 'Antibiotik',
      'Satuan Dasar': 'Box',
      'SKU / Kode': 'AMX-500-BX',
      'Deskripsi': 'Antibiotik spektrum luas penisilin',
      'Nama Supplier *': 'PT Medika Jaya Abadi',
      'HNA (Rp)': 40000,
      'Diskon (%)': 15.0,
      'HARGA JADI Box (Rp) *': 34000,
      'HARGA JADI Lembar (Rp)': 3400,
      'HARGA JADI +PPN 11% (Rp)': 37740,
      'MOQ (Min Order)': 2,
      'Lead Time (Hari)': 1,
      'Status Stok (Tersedia/Habis)': 'Tersedia',
      'Catatan Penawaran': 'Surat Pesanan Obat Keras (SP) dibutuhkan',
    },
    {
      'Nama Produk *': 'Omeprazole 20mg',
      'Company Produk / Pabrik': 'PT Dexa Medica',
      'Kemasan': 'Kapsul 3 x 10',
      'Isi Kemasan': '1 Box = 3 Strip (30 Kapsul)',
      'Jumlah Isi (Pecahan)': 3,
      'Satuan Pecahan': 'strip',
      'Kategori': 'Saluran Pencernaan',
      'Satuan Dasar': 'Box',
      'SKU / Kode': 'OMP-20-BX',
      'Deskripsi': 'Obat lambung tukak peptik',
      'Nama Supplier *': 'PT Aman Farma',
      'HNA (Rp)': 22500,
      'Diskon (%)': 20.0,
      'HARGA JADI Box (Rp) *': 18000,
      'HARGA JADI Lembar (Rp)': 6000,
      'HARGA JADI +PPN 11% (Rp)': 19980,
      'MOQ (Min Order)': 2,
      'Lead Time (Hari)': 1,
      'Status Stok (Tersedia/Habis)': 'Tersedia',
      'Catatan Penawaran': 'Harga diskon tempo 14 hari',
    },
    {
      'Nama Produk *': 'Masker Medis 3-Ply Earloop',
      'Company Produk / Pabrik': 'PT OneMed Healthcare',
      'Kemasan': 'Box 50 Pcs',
      'Isi Kemasan': '1 Box = 50 Pcs',
      'Jumlah Isi (Pecahan)': 50,
      'Satuan Pecahan': 'pcs',
      'Kategori': 'Alat Kesehatan & Medis',
      'Satuan Dasar': 'Box',
      'SKU / Kode': 'MSK-3PLY-50',
      'Deskripsi': 'Masker bedah 3 lapis standar Kemenkes',
      'Nama Supplier *': 'CV Prima Alkesindo',
      'HNA (Rp)': 20000,
      'Diskon (%)': 17.5,
      'HARGA JADI Box (Rp) *': 16500,
      'HARGA JADI Lembar (Rp)': 330,
      'HARGA JADI +PPN 11% (Rp)': 18315,
      'MOQ (Min Order)': 10,
      'Lead Time (Hari)': 1,
      'Status Stok (Tersedia/Habis)': 'Tersedia',
      'Catatan Penawaran': 'Harga grosir kartonan (1 karton = 40 box)',
    },
  ];

  const wsProducts = XLSX.utils.json_to_sheet(productData);

  // Set column widths for products sheet
  wsProducts['!cols'] = [
    { wch: 28 }, // Nama Produk
    { wch: 24 }, // Company Produk / Pabrik
    { wch: 18 }, // Kemasan
    { wch: 24 }, // Isi Kemasan
    { wch: 18 }, // Jumlah Isi Pecahan
    { wch: 14 }, // Satuan Pecahan
    { wch: 20 }, // Kategori
    { wch: 14 }, // Satuan Dasar
    { wch: 14 }, // SKU
    { wch: 28 }, // Deskripsi
    { wch: 24 }, // Nama Supplier
    { wch: 14 }, // HNA
    { wch: 12 }, // Diskon
    { wch: 20 }, // HARGA JADI Box
    { wch: 22 }, // HARGA JADI Lembar
    { wch: 24 }, // HARGA JADI +PPN
    { wch: 14 }, // MOQ
    { wch: 14 }, // Lead Time
    { wch: 16 }, // Status Stok
    { wch: 35 }, // Catatan
  ];

  XLSX.utils.book_append_sheet(wb, wsProducts, 'Produk & Penawaran');

  // 2. Sheet: Data Master Supplier
  const supplierData = [
    {
      'Nama Supplier *': 'PT Aman Farma',
      'Kontak Person': 'Ibu Dewi Lestari',
      'No. Telepon / WA': '0812-8899-1122',
      'Email': 'order@amanfarma.co.id',
      'Alamat': 'Kawasan Industri Pulo Gadung Kav. 4, Jakarta Timur',
      'Syarat Pembayaran (TOP)': 'Tempo 30 Hari',
      'Rating (1-5)': 4.7,
      'Catatan Supplier': 'Distributor PBF resmi, produk lengkap dan retur mudah',
    },
    {
      'Nama Supplier *': 'PT Kinariya',
      'Kontak Person': 'Bpk. Ahmad Fauzi',
      'No. Telepon / WA': '0813-7766-5544',
      'Email': 'sales@kinariya.com',
      'Alamat': 'Jl. Daan Mogot KM 14 No. 88, Jakarta Barat',
      'Syarat Pembayaran (TOP)': 'Tempo 14 Hari / COD',
      'Rating (1-5)': 4.9,
      'Catatan Supplier': 'Harga sangat kompetitif, pengiriman hari yang sama (same day)',
    },
    {
      'Nama Supplier *': 'PT Sehat Sentosa Farmasi',
      'Kontak Person': 'Bpk. Hendra Wijaya',
      'No. Telepon / WA': '0811-2233-4455',
      'Email': 'hendra@sehatsentosa.com',
      'Alamat': 'Jl. Soekarno Hatta No. 205, Bandung',
      'Syarat Pembayaran (TOP)': 'Tempo 45 Hari',
      'Rating (1-5)': 4.5,
      'Catatan Supplier': 'Spesialis obat generik dan injeksi',
    },
    {
      'Nama Supplier *': 'CV Prima Alkesindo',
      'Kontak Person': 'Bpk. Bagus Santoso',
      'No. Telepon / WA': '0819-3344-5566',
      'Email': 'sales@primaalkes.id',
      'Alamat': 'Jl. Bypass Ngurah Rai No. 45, Denpasar / Surabaya',
      'Syarat Pembayaran (TOP)': 'Tempo 21 Hari',
      'Rating (1-5)': 4.8,
      'Catatan Supplier': 'Distributor alat kesehatan, sarung tangan, alkohol dan masker',
    },
  ];

  const wsSuppliers = XLSX.utils.json_to_sheet(supplierData);

  wsSuppliers['!cols'] = [
    { wch: 26 }, // Nama Supplier
    { wch: 20 }, // Kontak Person
    { wch: 18 }, // No. Telepon
    { wch: 26 }, // Email
    { wch: 42 }, // Alamat
    { wch: 24 }, // Syarat Pembayaran
    { wch: 14 }, // Rating
    { wch: 45 }, // Catatan Supplier
  ];

  XLSX.utils.book_append_sheet(wb, wsSuppliers, 'Master Supplier');

  // 3. Sheet: Panduan Pengisian
  const guideData = [
    {
      'Panduan Pengisian': 'Petunjuk Penggunaan Template Excel HargaVendor',
      'Keterangan': 'Baca petunjuk berikut sebelum mengunggah file ke aplikasi.',
    },
    {
      'Panduan Pengisian': '1. Detail Produk Farmasi',
      'Keterangan': 'Kolom Company Produk / Pabrik (misal: PT Kimia Farma), Kemasan (misal: Tablet 10 x 10), dan Isi Kemasan (misal: 1 Box = 10 Lembar) akan otomatis tersimpan.',
    },
    {
      'Panduan Pengisian': '2. Kalkulasi Harga Farmasi',
      'Keterangan': 'Anda dapat mengisi HNA & Diskon (%), atau langsung HARGA JADI Box (Rp). Sistem akan otomatis menghitung harga per lembar dan harga +PPN 11%.',
    },
    {
      'Panduan Pengisian': '3. Sheet "Produk & Penawaran"',
      'Keterangan': 'Jika 1 produk ditawarkan oleh beberapa supplier, tulis nama produk yang SAMA pada baris berikutnya dengan nama supplier berbeda.',
    },
    {
      'Panduan Pengisian': '4. Sheet "Master Supplier"',
      'Keterangan': 'Digunakan untuk mendaftarkan rincian profil supplier (kontak WhatsApp, alamat, syarat pembayaran TOP).',
    },
  ];

  const wsGuide = XLSX.utils.json_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 35 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan');

  // Write and trigger download
  XLSX.writeFile(wb, 'Template_Import_HargaVendor.xlsx');
}

/**
 * Generates and downloads template specifically for Products & Quotes
 */
export function downloadProductOnlyTemplate(): void {
  const wb = XLSX.utils.book_new();

  const productData = [
    {
      'Nama Produk *': 'Paracetamol 500mg',
      'Company Produk / Pabrik': 'PT Kimia Farma Tbk',
      'Kemasan': 'Tablet 10 x 10',
      'Isi Kemasan': '1 Box = 10 Lembar',
      'Kategori': 'Analgesik & Antipiretik',
      'Satuan Dasar': 'Box',
      'Nama Supplier *': 'PT Kinariya',
      'HNA (Rp)': 11000,
      'Diskon (%)': 13.64,
      'HARGA JADI Box (Rp) *': 9500,
      'MOQ (Min Order)': 5,
      'Lead Time (Hari)': 1,
      'Status Stok (Tersedia/Habis)': 'Tersedia',
      'Catatan Penawaran': 'Harga promo kuartal',
    },
    {
      'Nama Produk *': 'Paracetamol 500mg',
      'Company Produk / Pabrik': 'PT Kimia Farma Tbk',
      'Kemasan': 'Tablet 10 x 10',
      'Isi Kemasan': '1 Box = 10 Lembar',
      'Kategori': 'Analgesik & Antipiretik',
      'Satuan Dasar': 'Box',
      'Nama Supplier *': 'PT Aman Farma',
      'HNA (Rp)': 11000,
      'Diskon (%)': 9.09,
      'HARGA JADI Box (Rp) *': 10000,
      'MOQ (Min Order)': 1,
      'Lead Time (Hari)': 1,
      'Status Stok (Tersedia/Habis)': 'Tersedia',
      'Catatan Penawaran': 'Ready stock eceran',
    },
    {
      'Nama Produk *': 'Amoxicillin 500mg',
      'Company Produk / Pabrik': 'PT Sanbe Farma',
      'Kemasan': 'Kaplet 10 x 10',
      'Isi Kemasan': '1 Box = 10 Lembar',
      'Kategori': 'Antibiotik',
      'Satuan Dasar': 'Box',
      'Nama Supplier *': 'PT Medika Jaya Abadi',
      'HNA (Rp)': 40000,
      'Diskon (%)': 15.0,
      'HARGA JADI Box (Rp) *': 34000,
      'MOQ (Min Order)': 2,
      'Lead Time (Hari)': 1,
      'Status Stok (Tersedia/Habis)': 'Tersedia',
      'Catatan Penawaran': 'Perlu SP Obat Keras',
    }
  ];

  const ws = XLSX.utils.json_to_sheet(productData);
  ws['!cols'] = [
    { wch: 26 }, { wch: 24 }, { wch: 18 }, { wch: 22 }, 
    { wch: 22 }, { wch: 14 }, { wch: 24 }, { wch: 14 }, 
    { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, 
    { wch: 16 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Produk & Penawaran');
  XLSX.writeFile(wb, 'Template_Produk_Harga_PBF.xlsx');
}

/**
 * Generates and downloads template specifically for Suppliers Directory
 */
export function downloadSupplierOnlyTemplate(): void {
  const wb = XLSX.utils.book_new();

  const supplierData = [
    {
      'Nama Supplier *': 'PT Aman Farma',
      'Kontak Person': 'Ibu Dewi Lestari',
      'No. Telepon / WA': '0812-8899-1122',
      'Email': 'order@amanfarma.co.id',
      'Alamat': 'Kawasan Industri Pulo Gadung Kav. 4, Jakarta Timur',
      'Syarat Pembayaran (TOP)': 'Tempo 30 Hari',
      'Rating (1-5)': 4.7,
      'Catatan Supplier': 'Distributor PBF resmi, produk lengkap',
    },
    {
      'Nama Supplier *': 'PT Kinariya',
      'Kontak Person': 'Bpk. Ahmad Fauzi',
      'No. Telepon / WA': '0813-7766-5544',
      'Email': 'sales@kinariya.com',
      'Alamat': 'Jl. Daan Mogot KM 14 No. 88, Jakarta Barat',
      'Syarat Pembayaran (TOP)': 'Tempo 14 Hari / COD',
      'Rating (1-5)': 4.9,
      'Catatan Supplier': 'Harga bersaing, same-day delivery',
    },
    {
      'Nama Supplier *': 'PT Medika Jaya Abadi',
      'Kontak Person': 'Bpk. Hendra Saputra',
      'No. Telepon / WA': '0812-9988-7766',
      'Email': 'order@medikajaya.com',
      'Alamat': 'Jl. R.E. Martadinata No. 50, Surabaya',
      'Syarat Pembayaran (TOP)': 'Tempo 30 Hari',
      'Rating (1-5)': 4.6,
      'Catatan Supplier': 'Spesialis obat generik dan etikal',
    }
  ];

  const ws = XLSX.utils.json_to_sheet(supplierData);
  ws['!cols'] = [
    { wch: 26 }, { wch: 20 }, { wch: 18 }, { wch: 24 },
    { wch: 40 }, { wch: 24 }, { wch: 12 }, { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Master Supplier');
  XLSX.writeFile(wb, 'Template_Master_Supplier_PBF.xlsx');
}

/**
 * Returns mock pre-parsed sample data for immediate test drive on mobile
 */
export function getSampleExcelData(): ExcelParseResult {
  return {
    parsedQuotes: [
      // Paracetamol 500mg - 3 Suppliers
      {
        name: 'Paracetamol 500mg',
        company: 'PT Kimia Farma Tbk',
        packaging: 'Tablet 10 x 10',
        packContent: '1 Box = 10 Lembar',
        subUnitCount: 10,
        subUnitName: 'lembar',
        category: 'Analgesik & Antipiretik',
        defaultUnit: 'Box',
        sku: 'PCT-500-BX',
        supplierName: 'PT Kinariya',
        hna: 11000,
        discountPercent: 13.64,
        price: 9500,
        pricePerSubUnit: 950,
        priceWithPpn: 10545,
        moq: 5,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Promo kuartal, ready stock',
      },
      {
        name: 'Paracetamol 500mg',
        company: 'PT Kimia Farma Tbk',
        packaging: 'Tablet 10 x 10',
        packContent: '1 Box = 10 Lembar',
        subUnitCount: 10,
        subUnitName: 'lembar',
        category: 'Analgesik & Antipiretik',
        defaultUnit: 'Box',
        sku: 'PCT-500-BX',
        supplierName: 'PT Aman Farma',
        hna: 11000,
        discountPercent: 9.09,
        price: 10000,
        pricePerSubUnit: 1000,
        priceWithPpn: 11100,
        moq: 1,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Bisa beli eceran 1 box',
      },
      {
        name: 'Paracetamol 500mg',
        company: 'PT Kimia Farma Tbk',
        packaging: 'Tablet 10 x 10',
        packContent: '1 Box = 10 Lembar',
        subUnitCount: 10,
        subUnitName: 'lembar',
        category: 'Analgesik & Antipiretik',
        defaultUnit: 'Box',
        sku: 'PCT-500-BX',
        supplierName: 'PT Sehat Sentosa Farmasi',
        hna: 11000,
        discountPercent: 1.82,
        price: 10800,
        pricePerSubUnit: 1080,
        priceWithPpn: 11988,
        moq: 2,
        leadTimeDays: 2,
        inStock: true,
        notes: 'Diskon standar',
      },

      // Amoxicillin 500mg - 3 Suppliers
      {
        name: 'Amoxicillin 500mg',
        company: 'PT Sanbe Farma',
        packaging: 'Kaplet 10 x 10',
        packContent: '1 Box = 10 Lembar',
        subUnitCount: 10,
        subUnitName: 'lembar',
        category: 'Antibiotik',
        defaultUnit: 'Box',
        sku: 'AMX-500-BX',
        supplierName: 'PT Medika Jaya Abadi',
        hna: 40000,
        discountPercent: 15.0,
        price: 34000,
        pricePerSubUnit: 3400,
        priceWithPpn: 37740,
        moq: 2,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Harga terbaik, syarat SP Obat Keras',
      },
      {
        name: 'Amoxicillin 500mg',
        company: 'PT Sanbe Farma',
        packaging: 'Kaplet 10 x 10',
        packContent: '1 Box = 10 Lembar',
        subUnitCount: 10,
        subUnitName: 'lembar',
        category: 'Antibiotik',
        defaultUnit: 'Box',
        sku: 'AMX-500-BX',
        supplierName: 'PT Aman Farma',
        hna: 40000,
        discountPercent: 11.25,
        price: 35500,
        pricePerSubUnit: 3550,
        priceWithPpn: 39405,
        moq: 1,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Bebas ongkir Jabodetabek',
      },
      {
        name: 'Amoxicillin 500mg',
        company: 'PT Sanbe Farma',
        packaging: 'Kaplet 10 x 10',
        packContent: '1 Box = 10 Lembar',
        subUnitCount: 10,
        subUnitName: 'lembar',
        category: 'Antibiotik',
        defaultUnit: 'Box',
        sku: 'AMX-500-BX',
        supplierName: 'PT Kinariya',
        hna: 40000,
        discountPercent: 7.5,
        price: 37000,
        pricePerSubUnit: 3700,
        priceWithPpn: 41070,
        moq: 5,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Stok terbatas',
      },

      // Omeprazole 20mg - 3 Suppliers
      {
        name: 'Omeprazole 20mg',
        company: 'PT Dexa Medica',
        packaging: 'Kapsul 3 x 10',
        packContent: '1 Box = 3 Lembar',
        subUnitCount: 3,
        subUnitName: 'lembar',
        category: 'Saluran Cerna',
        defaultUnit: 'Box',
        sku: 'OMZ-20-BX',
        supplierName: 'PT Aman Farma',
        hna: 22500,
        discountPercent: 20.0,
        price: 18000,
        pricePerSubUnit: 6000,
        priceWithPpn: 19980,
        moq: 2,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Promo distributor resmi Dexa',
      },
      {
        name: 'Omeprazole 20mg',
        company: 'PT Dexa Medica',
        packaging: 'Kapsul 3 x 10',
        packContent: '1 Box = 3 Lembar',
        subUnitCount: 3,
        subUnitName: 'lembar',
        category: 'Saluran Cerna',
        defaultUnit: 'Box',
        sku: 'OMZ-20-BX',
        supplierName: 'PT Medika Jaya Abadi',
        hna: 22500,
        discountPercent: 13.33,
        price: 19500,
        pricePerSubUnit: 6500,
        priceWithPpn: 21645,
        moq: 1,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Ready stock tempo 30 hari',
      },
      {
        name: 'Omeprazole 20mg',
        company: 'PT Dexa Medica',
        packaging: 'Kapsul 3 x 10',
        packContent: '1 Box = 3 Lembar',
        subUnitCount: 3,
        subUnitName: 'lembar',
        category: 'Saluran Cerna',
        defaultUnit: 'Box',
        sku: 'OMZ-20-BX',
        supplierName: 'PT Kinariya',
        hna: 25000,
        discountPercent: 12.0,
        price: 22000,
        pricePerSubUnit: 7333,
        priceWithPpn: 24420,
        moq: 3,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Fast-moving digest product',
      },

      // Masker Medis 3-Ply - 3 Suppliers
      {
        name: 'Masker Medis 3-Ply Earloop',
        company: 'PT OneMed Healthcare',
        packaging: 'Box 50 Pcs',
        packContent: '1 Box = 50 Pcs',
        subUnitCount: 50,
        subUnitName: 'pcs',
        category: 'Alat Kesehatan & Medis',
        defaultUnit: 'Box',
        sku: 'MSK-3PLY-50',
        supplierName: 'CV Prima Alkesindo',
        hna: 20000,
        discountPercent: 17.5,
        price: 16500,
        pricePerSubUnit: 330,
        priceWithPpn: 18315,
        moq: 10,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Spesialis alkes distributor resmi OneMed',
      },
      {
        name: 'Masker Medis 3-Ply Earloop',
        company: 'PT OneMed Healthcare',
        packaging: 'Box 50 Pcs',
        packContent: '1 Box = 50 Pcs',
        subUnitCount: 50,
        subUnitName: 'pcs',
        category: 'Alat Kesehatan & Medis',
        defaultUnit: 'Box',
        sku: 'MSK-3PLY-50',
        supplierName: 'PT Kinariya',
        hna: 20000,
        discountPercent: 10.0,
        price: 18000,
        pricePerSubUnit: 360,
        priceWithPpn: 19980,
        moq: 5,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Bisa campur alkes lain',
      },
      {
        name: 'Masker Medis 3-Ply Earloop',
        company: 'PT OneMed Healthcare',
        packaging: 'Box 50 Pcs',
        packContent: '1 Box = 50 Pcs',
        subUnitCount: 50,
        subUnitName: 'pcs',
        category: 'Alat Kesehatan & Medis',
        defaultUnit: 'Box',
        sku: 'MSK-3PLY-50',
        supplierName: 'PT Aman Farma',
        hna: 20000,
        discountPercent: 2.5,
        price: 19500,
        pricePerSubUnit: 390,
        priceWithPpn: 21645,
        moq: 1,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Bisa beli eceran',
      },

      // Vitamin C 500mg - 3 Suppliers
      {
        name: 'Vitamin C 500mg',
        company: 'PT Kalbe Farma',
        packaging: 'Botol 100 Tablet',
        packContent: '1 Botol = 100 Tab',
        subUnitCount: 100,
        subUnitName: 'tablet',
        category: 'Vitamin & Suplemen',
        defaultUnit: 'Botol',
        sku: 'VTC-500-BT',
        supplierName: 'PT Sehat Sentosa Farmasi',
        hna: 55000,
        discountPercent: 10.0,
        price: 49500,
        pricePerSubUnit: 495,
        priceWithPpn: 54945,
        moq: 1,
        leadTimeDays: 2,
        inStock: true,
        notes: 'Harga terbaik distributor Kalbe',
      },
      {
        name: 'Vitamin C 500mg',
        company: 'PT Kalbe Farma',
        packaging: 'Botol 100 Tablet',
        packContent: '1 Botol = 100 Tab',
        subUnitCount: 100,
        subUnitName: 'tablet',
        category: 'Vitamin & Suplemen',
        defaultUnit: 'Botol',
        sku: 'VTC-500-BT',
        supplierName: 'PT Aman Farma',
        hna: 55000,
        discountPercent: 5.45,
        price: 52000,
        pricePerSubUnit: 520,
        priceWithPpn: 57720,
        moq: 1,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Ready stock pengiriman cepat',
      },
      {
        name: 'Vitamin C 500mg',
        company: 'PT Kalbe Farma',
        packaging: 'Botol 100 Tablet',
        packContent: '1 Botol = 100 Tab',
        subUnitCount: 100,
        subUnitName: 'tablet',
        category: 'Vitamin & Suplemen',
        defaultUnit: 'Botol',
        sku: 'VTC-500-BT',
        supplierName: 'PT Medika Jaya Abadi',
        hna: 55000,
        discountPercent: 1.82,
        price: 54000,
        pricePerSubUnit: 540,
        priceWithPpn: 59940,
        moq: 2,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Stok melimpah',
      },

      // Cetirizine 10mg - 2 Suppliers
      {
        name: 'Cetirizine 10mg',
        company: 'PT Kimia Farma Tbk',
        packaging: 'Tablet 10 x 10',
        packContent: '1 Box = 10 Lembar',
        subUnitCount: 10,
        subUnitName: 'lembar',
        category: 'Antihistamin & Alergi',
        defaultUnit: 'Box',
        sku: 'CTZ-10-BX',
        supplierName: 'PT Kinariya',
        hna: 17000,
        discountPercent: 14.7,
        price: 14500,
        pricePerSubUnit: 1450,
        priceWithPpn: 16095,
        moq: 3,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Antihistamin non-sedatif',
      },
      {
        name: 'Cetirizine 10mg',
        company: 'PT Kimia Farma Tbk',
        packaging: 'Tablet 10 x 10',
        packContent: '1 Box = 10 Lembar',
        subUnitCount: 10,
        subUnitName: 'lembar',
        category: 'Antihistamin & Alergi',
        defaultUnit: 'Box',
        sku: 'CTZ-10-BX',
        supplierName: 'PT Aman Farma',
        hna: 17000,
        discountPercent: 5.88,
        price: 16000,
        pricePerSubUnit: 1600,
        priceWithPpn: 17760,
        moq: 1,
        leadTimeDays: 1,
        inStock: true,
        notes: 'Bisa beli eceran',
      }
    ],
    parsedSuppliers: [
      {
        name: 'PT Kinariya',
        contactPerson: 'Bpk. Ahmad Fauzi',
        phone: '0813-7766-5544',
        email: 'sales@kinariya.com',
        address: 'Jl. Daan Mogot KM 14 No. 88, Jakarta Barat',
        paymentTerms: 'Tempo 14 Hari / COD',
        rating: 4.9,
        notes: 'Harga sangat kompetitif, same-day delivery',
      },
      {
        name: 'PT Aman Farma',
        contactPerson: 'Ibu Dewi Lestari',
        phone: '0812-8899-1122',
        email: 'order@amanfarma.co.id',
        address: 'Kawasan Industri Pulo Gadung Kav. 4, Jakarta Timur',
        paymentTerms: 'Tempo 30 Hari',
        rating: 4.7,
        notes: 'Distributor PBF resmi dan retur mudah',
      },
      {
        name: 'PT Medika Jaya Abadi',
        contactPerson: 'Bpk. Hendra Saputra',
        phone: '0812-9988-7766',
        email: 'order@medikajaya.com',
        address: 'Jl. R.E. Martadinata No. 50, Surabaya',
        paymentTerms: 'Tempo 30 Hari',
        rating: 4.6,
        notes: 'Spesialis obat generik dan etikal',
      },
      {
        name: 'PT Sehat Sentosa Farmasi',
        contactPerson: 'Bpk. Hendra Wijaya',
        phone: '0811-2233-4455',
        email: 'hendra@sehatsentosa.com',
        address: 'Jl. Soekarno Hatta No. 205, Bandung',
        paymentTerms: 'Tempo 45 Hari',
        rating: 4.5,
        notes: 'Spesialis vitamin dan injeksi',
      },
      {
        name: 'CV Prima Alkesindo',
        contactPerson: 'Bpk. Bagus Santoso',
        phone: '0819-3344-5566',
        email: 'sales@primaalkes.id',
        address: 'Jl. Bypass Ngurah Rai No. 45, Denpasar',
        paymentTerms: 'Tempo 21 Hari',
        rating: 4.8,
        notes: 'Distributor alat kesehatan dan masker medis',
      }
    ],
    errors: [],
    warnings: [],
    sheetNames: ['Produk & Penawaran', 'Master Supplier'],
    totalRows: 17,
  };
}

/**
 * Exports current app data into a complete formatted Excel (.xlsx) file
 */
export function exportAppToExcel(products: Product[], suppliers: Supplier[]): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Data Komparasi Produk & Penawaran
  const productRows: any[] = [];
  products.forEach((prod) => {
    const subCount = prod.subUnitCount || 10;
    const subName = prod.subUnitName || 'lembar';

    if (prod.quotes.length === 0) {
      productRows.push({
        'Nama Produk': prod.name,
        'Company Produk / Pabrik': prod.company || '-',
        'Kemasan': prod.packaging || '-',
        'Isi Kemasan': prod.packContent || `1 Box = ${subCount} Lembar`,
        'Jumlah Isi Pecahan': subCount,
        'Satuan Pecahan': subName,
        'Kategori': prod.category,
        'Satuan Dasar': prod.defaultUnit,
        'SKU': prod.sku || '',
        'Nama Supplier': '-',
        'HNA (Rp)': 0,
        'Diskon (%)': 0,
        'HARGA JADI Lembar (Rp)': 0,
        'HARGA JADI Box (Rp)': 0,
        'HARGA JADI +PPN 11% (Rp)': 0,
        'MOQ': 1,
        'Lead Time (Hari)': 0,
        'Status Stok': 'Tersedia',
        'Catatan Penawaran': '-',
        'Tanggal Update': '',
      });
    } else {
      prod.quotes.forEach((q) => {
        const hna = q.hna || q.price;
        const disk = q.discountPercent || 0;
        const boxPrice = q.price;
        const lembarPrice = q.pricePerSubUnit || Math.round(boxPrice / subCount);
        const ppnPrice = q.priceWithPpn || Math.round(boxPrice * 1.11);

        productRows.push({
          'Nama Produk': prod.name,
          'Company Produk / Pabrik': prod.company || '-',
          'Kemasan': prod.packaging || '-',
          'Isi Kemasan': prod.packContent || `1 Box = ${subCount} Lembar`,
          'Jumlah Isi Pecahan': subCount,
          'Satuan Pecahan': subName,
          'Kategori': prod.category,
          'Satuan Dasar': q.unit || prod.defaultUnit,
          'SKU': prod.sku || '',
          'Nama Supplier': q.supplierName,
          'HNA (Rp)': hna,
          'Diskon (%)': disk,
          'HARGA JADI Lembar (Rp)': lembarPrice,
          'HARGA JADI Box (Rp)': boxPrice,
          'HARGA JADI +PPN 11% (Rp)': ppnPrice,
          'MOQ': q.moq || 1,
          'Lead Time (Hari)': q.leadTimeDays || 0,
          'Status Stok': q.inStock !== false ? 'Tersedia' : 'Habis / Indent',
          'Catatan Penawaran': q.notes || '',
          'Tanggal Update': q.lastUpdated || '',
        });
      });
    }
  });

  const wsProd = XLSX.utils.json_to_sheet(productRows);
  wsProd['!cols'] = [
    { wch: 28 }, // Nama Produk
    { wch: 24 }, // Company Produk
    { wch: 18 }, // Kemasan
    { wch: 24 }, // Isi Kemasan
    { wch: 18 }, // Jumlah Isi
    { wch: 14 }, // Satuan Pecahan
    { wch: 18 }, // Kategori
    { wch: 14 }, // Satuan Dasar
    { wch: 16 }, // SKU
    { wch: 25 }, // Supplier
    { wch: 14 }, // HNA
    { wch: 12 }, // Diskon
    { wch: 22 }, // Harga Lembar
    { wch: 20 }, // Harga Box
    { wch: 24 }, // Harga +PPN
    { wch: 12 }, // MOQ
    { wch: 16 }, // Lead Time
    { wch: 16 }, // Status
    { wch: 35 }, // Catatan
    { wch: 16 }, // Update
  ];
  XLSX.utils.book_append_sheet(wb, wsProd, 'Produk & Penawaran');

  // 2. Sheet: Master Supplier
  const supplierRows = suppliers.map((s) => ({
    'Nama Supplier': s.name,
    'Kontak Person': s.contactPerson || '',
    'No. Telepon / WA': s.phone || '',
    'Email': s.email || '',
    'Alamat': s.address || '',
    'Syarat Pembayaran': s.paymentTerms || '',
    'Rating (1-5)': s.rating || 5,
    'Catatan Supplier': s.notes || '',
  }));

  const wsSup = XLSX.utils.json_to_sheet(supplierRows);
  wsSup['!cols'] = [
    { wch: 26 },
    { wch: 20 },
    { wch: 18 },
    { wch: 26 },
    { wch: 40 },
    { wch: 22 },
    { wch: 14 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSup, 'Master Supplier');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `HargaVendor_Data_Lengkap_${today}.xlsx`);
}

/**
 * Parses an uploaded Excel (.xlsx, .xls, .csv) file
 */
export async function parseExcelUpload(file: File): Promise<ExcelParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const parsedQuotes: ParsedProductImportItem[] = [];
  const parsedSuppliers: ParsedSupplierImportItem[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let totalRows = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    // Convert sheet to json array of objects
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    if (rows.length === 0) return;

    totalRows += rows.length;

    // Detect if this sheet is primarily Suppliers or Products
    // Look at the columns in the first row
    const firstRow = rows[0];
    const rawKeys = Object.keys(firstRow);
    const normalizedMap: Record<string, string> = {};
    rawKeys.forEach((k) => {
      normalizedMap[normalizeHeaderKey(k)] = k;
    });

    const isExplicitSupplierSheet =
      sheetName.toLowerCase().includes('supplier') ||
      sheetName.toLowerCase().includes('vendor') ||
      (normalizedMap['telepon'] || normalizedMap['notelepon'] || normalizedMap['email'] || normalizedMap['syaratpembayaran']) &&
        !normalizedMap['harga'] &&
        !normalizedMap['namaproduk'];

    if (isExplicitSupplierSheet) {
      // Parse as Supplier Master
      rows.forEach((row, idx) => {
        let name = '';
        let contact = '';
        let phone = '';
        let email = '';
        let address = '';
        let paymentTerms = '';
        let rating = 5;
        let notes = '';

        Object.entries(row).forEach(([key, val]) => {
          const norm = normalizeHeaderKey(key);
          const strVal = String(val).trim();

          if (norm.includes('namasupplier') || norm === 'supplier' || norm === 'nama' || norm === 'vendor') {
            name = strVal;
          } else if (norm.includes('kontak') || norm.includes('pic') || norm.includes('person')) {
            contact = strVal;
          } else if (norm.includes('telepon') || norm.includes('hp') || norm.includes('wa') || norm.includes('phone')) {
            phone = strVal;
          } else if (norm.includes('email') || norm.includes('surel')) {
            email = strVal;
          } else if (norm.includes('alamat') || norm.includes('address') || norm.includes('lokasi')) {
            address = strVal;
          } else if (
            norm.includes('pembayaran') ||
            norm.includes('top') ||
            norm.includes('terms') ||
            norm.includes('tempo')
          ) {
            paymentTerms = strVal;
          } else if (norm.includes('rating') || norm.includes('bintang') || norm.includes('score')) {
            const parsedRate = parseFloat(strVal);
            if (!isNaN(parsedRate)) rating = Math.min(5, Math.max(1, parsedRate));
          } else if (norm.includes('catatan') || norm.includes('notes') || norm.includes('keterangan')) {
            notes = strVal;
          }
        });

        if (name) {
          parsedSuppliers.push({
            name,
            contactPerson: contact || undefined,
            phone: phone || undefined,
            email: email || undefined,
            address: address || undefined,
            paymentTerms: paymentTerms || 'Tempo 30 Hari',
            rating,
            notes: notes || undefined,
          });
        }
      });
    } else {
      // Parse as Product & Quote Sheet
      rows.forEach((row, idx) => {
        let productName = '';
        let genericName = '';
        let company = '';
        let packaging = '';
        let packContent = '';
        let subUnitCount = 10;
        let subUnitName = 'lembar';
        let category = 'Umum';
        let unit = 'Box';
        let sku = '';
        let description = '';
        let supplierName = '';
        let hna = 0;
        let discountPercent = 0;
        let price = 0;
        let pricePerSubUnit = 0;
        let priceWithPpn = 0;
        let moq = 1;
        let leadTimeDays = 1;
        let inStock = true;
        let quoteNotes = '';

        Object.entries(row).forEach(([key, val]) => {
          const norm = normalizeHeaderKey(key);
          const strVal = String(val).trim();

          if (
            norm.includes('namaproduk') ||
            norm === 'produk' ||
            norm === 'namaobat' ||
            norm === 'barang' ||
            norm === 'product' ||
            norm === 'item'
          ) {
            productName = strVal;
          } else if (norm.includes('generik') || norm.includes('zataktif') || norm.includes('generic')) {
            genericName = strVal;
          } else if (
            norm.includes('company') ||
            norm.includes('pabrik') ||
            norm.includes('produsen') ||
            norm.includes('manufaktur') ||
            norm.includes('perusahaan')
          ) {
            company = strVal;
          } else if (
            norm.includes('kemasan') ||
            norm.includes('packaging') ||
            norm.includes('packing')
          ) {
            packaging = strVal;
          } else if (
            norm.includes('isikemasan') ||
            norm.includes('packcontent') ||
            norm === 'isi'
          ) {
            packContent = strVal;
          } else if (
            norm.includes('jumlahisi') ||
            norm.includes('subunitcount') ||
            norm.includes('pecahan') ||
            norm.includes('isibox')
          ) {
            const count = parseInt(strVal, 10);
            if (!isNaN(count) && count > 0) subUnitCount = count;
          } else if (
            norm.includes('satuanpecahan') ||
            norm.includes('satuanisi') ||
            norm.includes('subunitname')
          ) {
            if (strVal) subUnitName = strVal;
          } else if (norm.includes('kategori') || norm.includes('category') || norm.includes('jenis')) {
            if (strVal) category = strVal;
          } else if (norm.includes('satuandasar') || (norm.includes('satuan') && !norm.includes('satuanpecahan') && !norm.includes('satuanisi')) || norm.includes('unit')) {
            if (strVal) unit = strVal;
          } else if (norm.includes('sku') || norm.includes('kode') || norm.includes('code')) {
            sku = strVal;
          } else if (norm.includes('deskripsi') || norm.includes('description') || norm.includes('keteranganproduk')) {
            description = strVal;
          } else if (
            norm.includes('namasupplier') ||
            norm === 'supplier' ||
            norm === 'vendor' ||
            norm.includes('distributor') ||
            norm.includes('pbf')
          ) {
            supplierName = strVal;
          } else if (norm.includes('hna') || norm.includes('harganetto')) {
            hna = parsePriceNumber(val);
          } else if (norm.includes('diskon') || norm.includes('disk') || norm.includes('discount')) {
            const d = parseFloat(strVal.replace('%', '').trim());
            if (!isNaN(d)) discountPercent = d;
          } else if (
            norm.includes('hargajadibox') ||
            norm.includes('hargabox') ||
            norm.includes('harga') ||
            norm.includes('price') ||
            norm.includes('tarif') ||
            norm.includes('biaya')
          ) {
            price = parsePriceNumber(val);
          } else if (norm.includes('hargajadilembar') || norm.includes('hargalembar') || norm.includes('hargastrip')) {
            pricePerSubUnit = parsePriceNumber(val);
          } else if (norm.includes('hargappn') || norm.includes('plusppn') || norm.includes('hargajadippn')) {
            priceWithPpn = parsePriceNumber(val);
          } else if (norm.includes('moq') || norm.includes('minorder') || norm.includes('minimal')) {
            const m = parseInt(strVal, 10);
            if (!isNaN(m) && m > 0) moq = m;
          } else if (
            norm.includes('leadtime') ||
            norm.includes('hari') ||
            norm.includes('estimasi') ||
            norm.includes('pengiriman')
          ) {
            const lt = parseInt(strVal, 10);
            if (!isNaN(lt) && lt >= 0) leadTimeDays = lt;
          } else if (norm.includes('stok') || norm.includes('stock') || norm.includes('status')) {
            if (strVal.toLowerCase().includes('habis') || strVal.toLowerCase().includes('indent') || strVal.toLowerCase().includes('kosong') || strVal === '0' || strVal.toLowerCase() === 'false') {
              inStock = false;
            } else {
              inStock = true;
            }
          } else if (
            norm.includes('catatan') ||
            norm.includes('notes') ||
            norm.includes('keterangan') ||
            norm.includes('keteranganpenawaran')
          ) {
            quoteNotes = strVal;
          }
        });

        // Calculate pricing dependencies
        if (price === 0 && hna > 0) {
          const diskAmount = hna * (discountPercent / 100);
          price = Math.max(0, Math.round(hna - diskAmount));
        }
        if (price > 0 && hna === 0 && discountPercent > 0 && discountPercent < 100) {
          hna = Math.round(price / (1 - discountPercent / 100));
        } else if (price > 0 && hna === 0) {
          hna = price;
        }

        const safeCount = subUnitCount > 0 ? subUnitCount : 10;
        if (pricePerSubUnit === 0 && price > 0) {
          pricePerSubUnit = Math.round(price / safeCount);
        }
        if (priceWithPpn === 0 && price > 0) {
          priceWithPpn = Math.round(price * 1.11);
        }

        // Validation
        if (!productName && !supplierName) {
          // Empty or header-like row, skip silently
          return;
        }

        // Check for Wide-Matrix Supplier Columns if no single supplier column was populated
        if (productName && !supplierName) {
          const STANDARD_METADATA_KEYS = new Set([
            'namaproduk', 'produk', 'namaobat', 'barang', 'product', 'item',
            'generik', 'zataktif', 'generic',
            'company', 'pabrik', 'produsen', 'manufaktur', 'perusahaan',
            'kemasan', 'packaging', 'packing',
            'isikemasan', 'packcontent', 'isi',
            'jumlahisi', 'subunitcount', 'pecahan', 'isibox',
            'satuanpecahan', 'satuanisi', 'subunitname',
            'kategori', 'category', 'jenis',
            'satuandasar', 'satuan', 'unit',
            'sku', 'kode', 'code',
            'deskripsi', 'description', 'keteranganproduk',
            'namasupplier', 'supplier', 'vendor', 'distributor', 'pbf',
            'hna', 'harganetto', 'diskon', 'disk', 'discount',
            'hargajadibox', 'hargabox', 'harga', 'price', 'tarif', 'biaya',
            'hargajadilembar', 'hargalembar', 'hargastrip',
            'hargappn', 'plusppn', 'hargajadippn',
            'moq', 'minorder', 'minimal',
            'leadtime', 'hari', 'estimasi', 'pengiriman',
            'stok', 'stock', 'status',
            'catatan', 'notes', 'keterangan', 'keteranganpenawaran',
            'no', 'nomor', 'id'
          ]);

          let foundWideQuotes = false;
          Object.entries(row).forEach(([colKey, colVal]) => {
            const norm = normalizeHeaderKey(colKey);
            if (!STANDARD_METADATA_KEYS.has(norm) && norm.length >= 2) {
              const widePrice = parsePriceNumber(colVal);
              if (widePrice > 0) {
                foundWideQuotes = true;
                const safeSupplierName = colKey.trim().replace(/^harga\s+/i, '');
                const widePerSub = Math.round(widePrice / safeCount);
                const widePpn = Math.round(widePrice * 1.11);

                parsedQuotes.push({
                  name: productName,
                  genericName: genericName || undefined,
                  company: company || undefined,
                  packaging: packaging || undefined,
                  packContent: packContent || undefined,
                  subUnitCount: safeCount,
                  subUnitName: subUnitName || 'lembar',
                  category,
                  defaultUnit: unit,
                  sku: sku || undefined,
                  description: description || undefined,
                  supplierName: safeSupplierName,
                  price: widePrice,
                  pricePerSubUnit: widePerSub,
                  priceWithPpn: widePpn,
                  moq: 1,
                  leadTimeDays: 1,
                  inStock: true,
                  notes: quoteNotes || undefined,
                });
              }
            }
          });

          if (foundWideQuotes) {
            return; // Finished parsing wide row
          }
        }

        if (productName && supplierName) {
          parsedQuotes.push({
            name: productName,
            genericName: genericName || undefined,
            company: company || undefined,
            packaging: packaging || undefined,
            packContent: packContent || undefined,
            subUnitCount: safeCount,
            subUnitName: subUnitName || 'lembar',
            category,
            defaultUnit: unit,
            sku: sku || undefined,
            description: description || undefined,
            supplierName,
            price,
            hna: hna || undefined,
            discountPercent: discountPercent || undefined,
            pricePerSubUnit: pricePerSubUnit || undefined,
            priceWithPpn: priceWithPpn || undefined,
            moq,
            leadTimeDays,
            inStock,
            notes: quoteNotes || undefined,
          });
        } else if (productName && !supplierName) {
          // Product row without supplier price
          parsedQuotes.push({
            name: productName,
            genericName: genericName || undefined,
            company: company || undefined,
            packaging: packaging || undefined,
            packContent: packContent || undefined,
            subUnitCount: safeCount,
            subUnitName: subUnitName || 'lembar',
            category,
            defaultUnit: unit,
            sku: sku || undefined,
            description: description || undefined,
            supplierName: '',
            price: 0,
            moq: 1,
            leadTimeDays: 1,
            inStock: true,
            notes: quoteNotes || undefined,
          });
          warnings.push(`Baris "${productName}" tidak memiliki nama supplier. Ditambahkan sebagai produk tanpa penawaran.`);
        } else if (!productName && supplierName) {
          // Might be a supplier record in this sheet
          parsedSuppliers.push({
            name: supplierName,
            paymentTerms: 'Tempo 30 Hari',
          });
        }
      });
    }
  });

  if (parsedQuotes.length === 0 && parsedSuppliers.length === 0) {
    errors.push('Tidak dapat menemukan data produk atau supplier yang valid di file Excel ini. Pastikan format kolom sesuai template.');
  }

  return {
    parsedQuotes,
    parsedSuppliers,
    errors,
    warnings,
    sheetNames: workbook.SheetNames,
    totalRows,
  };
}

/**
 * Exports comparison and recommendation results to an Excel spreadsheet (.xlsx)
 */
export function exportComparisonReportToExcel(
  comparisons: ImportedProductComparison[],
  marginPercent: number = 25
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekomendasi Termurah & Komparasi
  const summaryRows = comparisons.map((item, idx) => {
    const best = item.cheapestQuote;
    const highest = item.highestQuote;
    const bestPrice = best ? best.price : 0;
    const sellingPrice = bestPrice ? Math.round(bestPrice * (1 + marginPercent / 100)) : 0;
    const otherQuotes = item.quotes
      .map(q => `${q.supplierName}: Rp ${q.price.toLocaleString('id-ID')}`)
      .join(' | ');

    return {
      'No': idx + 1,
      'Nama Produk': item.productName,
      'Pabrik / Produsen': item.company || '-',
      'Kemasan': item.packaging || '-',
      'Isi Kemasan': item.packContent || '-',
      'Kategori': item.category,
      'Satuan': item.defaultUnit,
      'Jumlah Supplier': item.supplierCount,
      'Supplier Termurah (Rekomendasi)': best ? best.supplierName : '-',
      'Harga Beli Termurah (Rp)': bestPrice,
      'Rekomendasi Jual (+Margin%)': sellingPrice,
      'Supplier Termahal': highest && item.supplierCount > 1 ? highest.supplierName : '-',
      'Harga Tertinggi (Rp)': highest && item.supplierCount > 1 ? highest.price : bestPrice,
      'Potensi Hemat (Rp)': item.priceDifference,
      'Hemat (%)': item.savingsPercentage ? `${item.savingsPercentage}%` : '0%',
      'Rincian Semua Penawaran': otherQuotes,
    };
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 5 },  // No
    { wch: 30 }, // Nama Produk
    { wch: 22 }, // Pabrik
    { wch: 18 }, // Kemasan
    { wch: 20 }, // Isi Kemasan
    { wch: 20 }, // Kategori
    { wch: 10 }, // Satuan
    { wch: 15 }, // Jumlah Supplier
    { wch: 26 }, // Supplier Termurah
    { wch: 22 }, // Harga Beli Termurah
    { wch: 22 }, // Rekomendasi Jual
    { wch: 22 }, // Supplier Termahal
    { wch: 20 }, // Harga Tertinggi
    { wch: 18 }, // Potensi Hemat
    { wch: 12 }, // Hemat %
    { wch: 45 }, // Rincian Penawaran
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekomendasi Supplier');

  const now = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Laporan_Rekomendasi_Supplier_${now}.xlsx`);
}
