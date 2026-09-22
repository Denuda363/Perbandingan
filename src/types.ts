export interface SupplierQuote {
  id: string;
  supplierId: string;
  supplierName: string;
  price: number; // HARGA JADI (box/unit utama)
  unit: string; // e.g. "Box"
  hna?: number; // Harga Netto Apotek (sebelum diskon & PPN)
  discountPercent?: number; // Diskon % dari supplier (contoh: 10%)
  pricePerSubUnit?: number; // HARGA JADI per lembar / strip (price / subUnitCount)
  priceWithPpn?: number; // HARGA JADI + PPN 11%
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

export type ViewMode = 'cards' | 'matrix' | 'simulation' | 'suppliers';

export type SortOption = 
  | 'savings-desc' 
  | 'price-asc' 
  | 'price-desc' 
  | 'name-asc' 
  | 'quotes-count';
