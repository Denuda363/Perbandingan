export type DiscountType = 'percent' | 'amount';
export type MarginType = 'percent' | 'amount';

export interface SupplierQuote {
  id: string;
  supplierId: string;
  supplierName: string;
  price: number; // HARGA JADI (box/unit utama setelah diskon, modal bersih sebelum PPN)
  unit: string; // e.g. "Box"
  hna?: number; // Modal Dasar / Harga Netto Apotek (sebelum diskon & PPN)
  
  // Diskon 1 (bisa % atau Rp)
  discount1Type?: DiscountType; // 'percent' | 'amount'
  discount1Value?: number; // e.g. 10 (%) atau 5000 (Rp)
  discountPercent?: number; // legacy backward compatibility
  
  // Diskon 2 (bisa % atau Rp)
  discount2Type?: DiscountType; // 'percent' | 'amount'
  discount2Value?: number; // e.g. 2.5 (%) atau 2000 (Rp)
  
  // Rincian hasil rumus: (Modal - diskon 1 - diskon 2 + ppn) + margin
  netCostAfterDiscounts?: number; // Modal - D1 - D2
  priceWithPpn?: number; // (Modal - diskon 1 - diskon 2 + ppn)
  
  // Margin apotek
  marginType?: MarginType; // 'percent' | 'amount'
  marginValue?: number; // e.g. 25 (%) atau 15000 (Rp)
  marginAmount?: number; // Nilai nominal margin
  sellingPrice?: number; // ((Modal - diskon 1 - diskon 2 + ppn) + margin)
  
  pricePerSubUnit?: number; // Modal per lembar / strip
  sellingPricePerSubUnit?: number; // Harga jual per lembar / strip
  moq?: number; // Minimum Order Quantity
  leadTimeDays?: number; // Estimasi pengiriman dalam hari
  lastUpdated: string; // YYYY-MM-DD
  notes?: string; // e.g. "Tempo 30 hari", "Diskon 2% jika cash", "Ongkir gratis"
  inStock?: boolean;
}

export interface Product {
  id: string;
  name: string;
  genericName?: string;
  company?: string; // Company / Produsen Produk (contoh: "PT Kimia Farma", "Kalbe Farma", "Sanbe Farma")
  packaging?: string; // Kemasan (contoh: "Tablet 10 x 10", "Strip 10 x 10", "Botol 60ml")
  packContent?: string; // Isi (contoh: "1 Box = 10 Lembar", "1 Box = 10 Strip @ 10 Tablet")
  subUnitCount?: number; // Jumlah unit kecil per kemasan utama (contoh: 10)
  subUnitName?: string; // Nama satuan pecahan kecil (contoh: "lembar", "strip", "tablet", "pcs")
  category: string;
  defaultUnit: string;
  sku?: string;
  description?: string;
  quotes: SupplierQuote[];
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string; // e.g. "Net 30", "COD", "Cash On Delivery", "Tempo 14 Hari"
  rating?: number; // 1 - 5
  notes?: string;
}

export interface PurchaseSimulationItem {
  productId: string;
  quantity: number;
}

export type ViewMode = 'cards' | 'matrix' | 'simulation' | 'suppliers' | 'excel-compare';

export type SortOption = 
  | 'savings-desc' 
  | 'price-asc' 
  | 'price-desc' 
  | 'name-asc' 
  | 'quotes-count';

export interface AppSettings {
  ppnPercent: number; // Persentase PPN (misal: 11 atau 12 atau 0)
  ppnEnabled: boolean; // Aktifkan kalkulasi PPN
  marginPercent: number; // Persentase Margin Keuntungan (misal: 25%)
  marginType: MarginType; // Tipe margin: 'percent' (%) atau 'amount' (Rp)
  marginAmountValue: number; // Nilai margin jika tipe 'amount' (misal: Rp 15.000)
  defaultDiscount1Type: DiscountType; // 'percent' atau 'amount'
  defaultDiscount1Value: number; // Nilai diskon 1 bawaan
  defaultDiscount2Type: DiscountType; // 'percent' atau 'amount'
  defaultDiscount2Value: number; // Nilai diskon 2 bawaan
  marginCalculationMode: 'on_cost_plus_ppn' | 'markup'; // Cara hitung: (Modal - diskon 1 - diskon 2 + ppn) + margin
  roundingOption: 'none' | 'hundred' | 'thousand'; // Pembulatan kasir
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ppnPercent: 11,
  ppnEnabled: true,
  marginPercent: 25,
  marginType: 'percent',
  marginAmountValue: 15000,
  defaultDiscount1Type: 'percent',
  defaultDiscount1Value: 0,
  defaultDiscount2Type: 'percent',
  defaultDiscount2Value: 0,
  marginCalculationMode: 'on_cost_plus_ppn',
  roundingOption: 'none',
};

