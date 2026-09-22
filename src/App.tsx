import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Filter, 
  Layers, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  SlidersHorizontal,
  PackageSearch,
  Building2,
  TrendingDown,
  LayoutGrid,
  Table2,
  Calculator,
  Users
} from 'lucide-react';
import { Product, Supplier, SupplierQuote, ViewMode, SortOption } from './types';
import { INITIAL_PRODUCTS, INITIAL_SUPPLIERS } from './data/initialData';
import { exportProductsToCSV, getProductPriceStats } from './utils/formatters';
import { downloadCompleteExcelTemplate, exportAppToExcel, ExcelParseResult } from './utils/excelUtils';
import { Navbar } from './components/Navbar';
import { SummaryStats } from './components/SummaryStats';
import { ProductCard } from './components/ProductCard';
import { MatrixView } from './components/MatrixView';
import { SimulationCalculator } from './components/SimulationCalculator';
import { SupplierDirectory } from './components/SupplierDirectory';
import { ProductModal } from './components/ProductModal';
import { AddQuoteModal } from './components/AddQuoteModal';
import { SupplierModal } from './components/SupplierModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';

const STORAGE_KEY_PRODUCTS = 'harga_vendor_products_v1';
const STORAGE_KEY_SUPPLIERS = 'harga_vendor_suppliers_v1';

export default function App() {
  // State: Products and Suppliers loaded from localStorage or initialized
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load products from storage', e);
    }
    return INITIAL_PRODUCTS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUPPLIERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load suppliers from storage', e);
    }
    return INITIAL_SUPPLIERS;
  });

  // Navigation & Search state
  const [currentView, setCurrentView] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<SortOption>('savings-desc');
  const [filterMultipleVendorsOnly, setFilterMultipleVendorsOnly] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteSelectedProduct, setQuoteSelectedProduct] = useState<Product | null>(null);
  const [quoteToEdit, setQuoteToEdit] = useState<SupplierQuote | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify(suppliers));
    } catch (e) {
      console.error('Failed to save suppliers', e);
    }
  }, [suppliers]);

  // Categories list
  const categories = ['Semua', ...Array.from(new Set(products.map((p) => p.category)))];

  // Filtering & Sorting Products for Card View
  const filteredProducts = products.filter((p) => {
    // Search query matches product name, generic name, category, or supplier name
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchName = p.name.toLowerCase().includes(query);
      const matchGeneric = p.genericName?.toLowerCase().includes(query);
      const matchCategory = p.category.toLowerCase().includes(query);
      const matchSupplier = p.quotes.some((q) => q.supplierName.toLowerCase().includes(query));
      if (!matchName && !matchGeneric && !matchCategory && !matchSupplier) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'Semua' && p.category !== selectedCategory) {
      return false;
    }

    // Multiple vendors filter
    if (filterMultipleVendorsOnly && p.quotes.length < 2) {
      return false;
    }

    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const statsA = getProductPriceStats(a);
    const statsB = getProductPriceStats(b);

    switch (sortBy) {
      case 'savings-desc':
        return statsB.difference - statsA.difference;
      case 'price-asc':
        return statsA.minPrice - statsB.minPrice;
      case 'price-desc':
        return statsB.minPrice - statsA.minPrice;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'quotes-count':
        return b.quotes.length - a.quotes.length;
      default:
        return 0;
    }
  });

  // Handlers for Products
  const handleSaveProduct = (
    productData: Partial<Product>,
    initialQuote?: { supplierName: string; price: number; notes?: string }
  ) => {
    if (productToEdit) {
      // Edit existing product
      setProducts((prev) =>
        prev.map((p) => (p.id === productToEdit.id ? ({ ...p, ...productData } as Product) : p))
      );
      showToast('Data produk berhasil diperbarui');
    } else {
      // Create new product
      const newId = `prod-${Date.now()}`;
      const newQuotes: SupplierQuote[] = [];

      if (initialQuote) {
        // Find or create supplier
        let matchedSup = suppliers.find(
          (s) => s.name.toLowerCase() === initialQuote.supplierName.toLowerCase()
        );
        if (!matchedSup) {
          matchedSup = {
            id: `sup-${Date.now()}`,
            name: initialQuote.supplierName,
            paymentTerms: 'Tempo 30 Hari',
          };
          setSuppliers((prev) => [...prev, matchedSup!]);
        }

        newQuotes.push({
          id: `q-${Date.now()}`,
          supplierId: matchedSup.id,
          supplierName: matchedSup.name,
          price: initialQuote.price,
          unit: productData.defaultUnit || 'Unit',
          moq: 1,
          leadTimeDays: 1,
          lastUpdated: new Date().toISOString().slice(0, 10),
          notes: initialQuote.notes,
          inStock: true,
        });
      }

      const newProduct: Product = {
        id: newId,
        name: productData.name || 'Produk Baru',
        genericName: productData.genericName,
        category: productData.category || 'Umum',
        defaultUnit: productData.defaultUnit || 'Box',
        sku: productData.sku,
        description: productData.description,
        quotes: newQuotes,
      };

      setProducts((prev) => [newProduct, ...prev]);
      showToast('Produk baru berhasil ditambahkan');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini beserta seluruh data penawarannya?')) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast('Produk berhasil dihapus');
    }
  };

  // Handlers for Quotes
  const handleSaveQuote = (productId: string, quoteData: Partial<SupplierQuote>) => {
    // Ensure supplier exists in suppliers directory
    if (quoteData.supplierName) {
      const existing = suppliers.find(
        (s) => s.name.toLowerCase() === quoteData.supplierName!.toLowerCase()
      );
      if (!existing) {
        const newSup: Supplier = {
          id: quoteData.supplierId || `sup-${Date.now()}`,
          name: quoteData.supplierName,
          paymentTerms: 'Tempo 30 Hari',
        };
        setSuppliers((prev) => [...prev, newSup]);
      }
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;

        const existingQuoteIdx = p.quotes.findIndex((q) => q.id === quoteData.id);
        let updatedQuotes = [...p.quotes];

        if (existingQuoteIdx >= 0) {
          // Update quote
          updatedQuotes[existingQuoteIdx] = {
            ...updatedQuotes[existingQuoteIdx],
            ...quoteData,
          } as SupplierQuote;
        } else {
          // Check if quote for this supplier already exists on this product
          const sameSupplierIdx = updatedQuotes.findIndex(
            (q) => q.supplierName.toLowerCase() === (quoteData.supplierName || '').toLowerCase()
          );
          if (sameSupplierIdx >= 0) {
            updatedQuotes[sameSupplierIdx] = {
              ...updatedQuotes[sameSupplierIdx],
              ...quoteData,
            } as SupplierQuote;
          } else {
            updatedQuotes.push(quoteData as SupplierQuote);
          }
        }

        return {
          ...p,
          quotes: updatedQuotes,
        };
      })
    );

    showToast('Penawaran harga supplier berhasil disimpan');
  };

  const handleDeleteQuote = (productId: string, quoteId: string) => {
    if (confirm('Hapus penawaran harga dari supplier ini?')) {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          return {
            ...p,
            quotes: p.quotes.filter((q) => q.id !== quoteId),
          };
        })
      );
      showToast('Penawaran berhasil dihapus');
    }
  };

  // Handlers for Suppliers
  const handleSaveSupplier = (supplierData: Partial<Supplier>) => {
    if (supplierToEdit) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplierToEdit.id ? ({ ...s, ...supplierData } as Supplier) : s))
      );
      // Also update quotes where supplierName matches
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          quotes: p.quotes.map((q) =>
            q.supplierId === supplierToEdit.id
              ? { ...q, supplierName: supplierData.name || q.supplierName }
              : q
          ),
        }))
      );
      showToast('Data supplier berhasil diperbarui');
    } else {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        name: supplierData.name || 'Supplier Baru',
        contactPerson: supplierData.contactPerson,
        phone: supplierData.phone,
        email: supplierData.email,
        address: supplierData.address,
        paymentTerms: supplierData.paymentTerms || 'Tempo 30 Hari',
        notes: supplierData.notes,
      };
      setSuppliers((prev) => [...prev, newSup]);
      showToast('Supplier baru berhasil didaftarkan');
    }
  };

  const handleDeleteSupplier = (supplierId: string) => {
    if (confirm('Hapus supplier ini dari direktori?')) {
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
      showToast('Supplier berhasil dihapus');
    }
  };

  // Reset to initial realistic demo data
  const handleResetDemoData = () => {
    if (confirm('Kembalikan data ke contoh awal (termasuk Paracetamol PT Aman Farma & PT Kinariya)?')) {
      setProducts(INITIAL_PRODUCTS);
      setSuppliers(INITIAL_SUPPLIERS);
      showToast('Data contoh berhasil dipulihkan');
    }
  };

  // Handler for Excel file import
  const handleConfirmImport = (
    parsedResult: ExcelParseResult,
    mode: 'merge' | 'overwrite'
  ) => {
    let nextSuppliers: Supplier[] = mode === 'overwrite' ? [] : [...suppliers];
    let nextProducts: Product[] = mode === 'overwrite' ? [] : [...products];

    let suppliersAdded = 0;
    let suppliersUpdated = 0;
    let productsAdded = 0;
    let productsUpdated = 0;
    let quotesCount = 0;

    // 1. Process explicit Master Suppliers if present
    parsedResult.parsedSuppliers.forEach((sImport) => {
      const idx = nextSuppliers.findIndex(
        (s) => s.name.trim().toLowerCase() === sImport.name.trim().toLowerCase()
      );
      if (idx >= 0) {
        // Update existing supplier details if new ones exist
        nextSuppliers[idx] = {
          ...nextSuppliers[idx],
          contactPerson: sImport.contactPerson || nextSuppliers[idx].contactPerson,
          phone: sImport.phone || nextSuppliers[idx].phone,
          email: sImport.email || nextSuppliers[idx].email,
          address: sImport.address || nextSuppliers[idx].address,
          paymentTerms: sImport.paymentTerms || nextSuppliers[idx].paymentTerms,
          rating: sImport.rating || nextSuppliers[idx].rating,
          notes: sImport.notes || nextSuppliers[idx].notes,
        };
        suppliersUpdated++;
      } else {
        const newSup: Supplier = {
          id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: sImport.name.trim(),
          contactPerson: sImport.contactPerson,
          phone: sImport.phone,
          email: sImport.email,
          address: sImport.address,
          paymentTerms: sImport.paymentTerms || 'Tempo 30 Hari',
          rating: sImport.rating || 5,
          notes: sImport.notes,
        };
        nextSuppliers.push(newSup);
        suppliersAdded++;
      }
    });

    // 2. Process Products and Quotes
    parsedResult.parsedQuotes.forEach((qImport) => {
      // Ensure supplier exists in nextSuppliers
      let supplierId = '';
      if (qImport.supplierName) {
        let sup = nextSuppliers.find(
          (s) => s.name.trim().toLowerCase() === qImport.supplierName.trim().toLowerCase()
        );
        if (!sup) {
          sup = {
            id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: qImport.supplierName.trim(),
            paymentTerms: 'Tempo 30 Hari',
            rating: 5,
          };
          nextSuppliers.push(sup);
          suppliersAdded++;
        }
        supplierId = sup.id;
      }

      // Find if product already exists (by SKU first if both have SKU, or by name)
      const pIdx = nextProducts.findIndex((p) => {
        if (qImport.sku && p.sku && p.sku.toLowerCase() === qImport.sku.toLowerCase()) {
          return true;
        }
        return p.name.trim().toLowerCase() === qImport.name.trim().toLowerCase();
      });

      const todayStr = new Date().toISOString().slice(0, 10);

      if (pIdx >= 0) {
        // Product exists
        const existingProd = nextProducts[pIdx];
        let quotes = [...existingProd.quotes];

        if (qImport.supplierName && qImport.price > 0) {
          const qIdx = quotes.findIndex(
            (q) => q.supplierName.trim().toLowerCase() === qImport.supplierName.trim().toLowerCase()
          );

          const quoteObj: SupplierQuote = {
            id: qIdx >= 0 ? quotes[qIdx].id : `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            supplierId: supplierId || (qIdx >= 0 ? quotes[qIdx].supplierId : ''),
            supplierName: qImport.supplierName.trim(),
            price: qImport.price,
            unit: qImport.defaultUnit || existingProd.defaultUnit,
            moq: qImport.moq || (qIdx >= 0 ? quotes[qIdx].moq : 1),
            leadTimeDays: qImport.leadTimeDays !== undefined ? qImport.leadTimeDays : (qIdx >= 0 ? quotes[qIdx].leadTimeDays : 1),
            lastUpdated: todayStr,
            notes: qImport.notes || (qIdx >= 0 ? quotes[qIdx].notes : ''),
            inStock: qImport.inStock !== false,
          };

          if (qIdx >= 0) {
            quotes[qIdx] = quoteObj;
          } else {
            quotes.push(quoteObj);
            quotesCount++;
          }
        }

        nextProducts[pIdx] = {
          ...existingProd,
          category: qImport.category && qImport.category !== 'Umum' ? qImport.category : existingProd.category,
          defaultUnit: qImport.defaultUnit || existingProd.defaultUnit,
          sku: qImport.sku || existingProd.sku,
          description: qImport.description || existingProd.description,
          quotes,
        };
        productsUpdated++;
      } else {
        // New Product
        const newProdId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const initialQuotes: SupplierQuote[] = [];

        if (qImport.supplierName && qImport.price > 0) {
          initialQuotes.push({
            id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            supplierId: supplierId,
            supplierName: qImport.supplierName.trim(),
            price: qImport.price,
            unit: qImport.defaultUnit || 'Box',
            moq: qImport.moq || 1,
            leadTimeDays: qImport.leadTimeDays !== undefined ? qImport.leadTimeDays : 1,
            lastUpdated: todayStr,
            notes: qImport.notes || '',
            inStock: qImport.inStock !== false,
          });
          quotesCount++;
        }

        const newProd: Product = {
          id: newProdId,
          name: qImport.name.trim(),
          category: qImport.category || 'Umum',
          defaultUnit: qImport.defaultUnit || 'Box',
          sku: qImport.sku,
          description: qImport.description,
          quotes: initialQuotes,
        };

        nextProducts.push(newProd);
        productsAdded++;
      }
    });

    setSuppliers(nextSuppliers);
    setProducts(nextProducts);

    const summaryParts: string[] = [];
    if (productsAdded > 0) summaryParts.push(`${productsAdded} produk baru`);
    if (productsUpdated > 0) summaryParts.push(`${productsUpdated} produk diperbarui`);
    if (suppliersAdded > 0) summaryParts.push(`${suppliersAdded} supplier baru`);
    if (quotesCount > 0) summaryParts.push(`${quotesCount} harga penawaran`);

    showToast(
      summaryParts.length > 0
        ? `Impor Excel berhasil: ${summaryParts.join(', ')}`
        : 'Data Excel berhasil diproses'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 pb-20 sm:pb-12">
      
      {/* Mobile PWA Install Banner */}
      <PWAInstallBanner onOpenInstallModal={() => setIsPWAInstallModalOpen(true)} />

      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddProduct={() => {
          setProductToEdit(null);
          setIsProductModalOpen(true);
        }}
        onOpenAddQuote={() => {
          setQuoteSelectedProduct(products[0] || null);
          setQuoteToEdit(null);
          setIsQuoteModalOpen(true);
        }}
        onOpenImportExcel={() => setIsImportModalOpen(true)}
        onDownloadTemplate={downloadCompleteExcelTemplate}
        onExportExcel={() => exportAppToExcel(products, suppliers)}
        onExportCSV={() => exportProductsToCSV(products)}
        productCount={products.length}
        onOpenInstallModal={() => setIsPWAInstallModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 sm:pb-10">
        
        {/* KPI / Summary Statistics */}
        <SummaryStats products={products} suppliers={suppliers} />

        {/* View Mode 1: Product Cards (Default) */}
        {currentView === 'cards' && (
          <div className="space-y-4">
            
            {/* Filter and Sorting Toolbar */}
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Category Chips with Edge-to-Edge Mobile Scroll */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
                <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                  Kategori:
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Extra Filters & Sort */}
              <div className="flex items-center justify-between md:justify-end gap-2.5 w-full md:w-auto flex-wrap pt-1 md:pt-0 border-t md:border-t-0 border-slate-100">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterMultipleVendorsOnly}
                    onChange={(e) => setFilterMultipleVendorsOnly(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span className="font-medium">&ge; 2 Supplier</span>
                </label>

                <div className="flex items-center gap-1.5 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[210px] sm:max-w-none"
                  >
                    <option value="savings-desc">Selisih Terbesar (Hemat)</option>
                    <option value="price-asc">Harga Termurah (Rendah - Tinggi)</option>
                    <option value="price-desc">Harga Tertinggi</option>
                    <option value="name-asc">Nama Produk (A-Z)</option>
                    <option value="quotes-count">Jumlah Penawaran Terbanyak</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Products Grid */}
            {sortedProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <PackageSearch className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Tidak ada produk yang cocok
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Cobalah mengganti kata kunci pencarian atau kategori filter Anda.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Semua');
                    setFilterMultipleVendorsOnly(false);
                  }}
                  className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                >
                  Reset Filter Pencarian
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddQuote={(p) => {
                      setQuoteSelectedProduct(p);
                      setQuoteToEdit(null);
                      setIsQuoteModalOpen(true);
                    }}
                    onEditQuote={(p, q) => {
                      setQuoteSelectedProduct(p);
                      setQuoteToEdit(q);
                      setIsQuoteModalOpen(true);
                    }}
                    onDeleteQuote={handleDeleteQuote}
                    onEditProduct={(p) => {
                      setProductToEdit(p);
                      setIsProductModalOpen(true);
                    }}
                    onDeleteProduct={handleDeleteProduct}
                    onSimulateOrder={(productId) => {
                      setCurrentView('simulation');
                    }}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* View Mode 2: Matrix Table */}
        {currentView === 'matrix' && (
          <MatrixView
            products={products}
            suppliers={suppliers}
            onAddQuote={(p) => {
              setQuoteSelectedProduct(p);
              setQuoteToEdit(null);
              setIsQuoteModalOpen(true);
            }}
            onOpenAddProduct={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
          />
        )}

        {/* View Mode 3: Simulation & Order Calculator */}
        {currentView === 'simulation' && (
          <SimulationCalculator
            products={products}
            suppliers={suppliers}
          />
        )}

        {/* View Mode 4: Supplier Directory */}
        {currentView === 'suppliers' && (
          <SupplierDirectory
            suppliers={suppliers}
            products={products}
            onAddSupplier={() => {
              setSupplierToEdit(null);
              setIsSupplierModalOpen(true);
            }}
            onEditSupplier={(sup) => {
              setSupplierToEdit(sup);
              setIsSupplierModalOpen(true);
            }}
            onDeleteSupplier={handleDeleteSupplier}
            onOpenImportExcel={() => setIsImportModalOpen(true)}
            onDownloadTemplate={downloadCompleteExcelTemplate}
          />
        )}

        {/* Bottom Utility Bar: Demo Data Reset info */}
        <div className="mt-10 mb-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>
            Perbandingan Harga Supplier • Data tersimpan secara otomatis di browser Anda.
          </p>
          <button
            onClick={handleResetDemoData}
            className="text-slate-400 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer"
            title="Muat ulang data contoh awal jika data hilang"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Pulihkan Data Demo Awal</span>
          </button>
        </div>

      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => setCurrentView('cards')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-[11px] font-medium transition-all ${
            currentView === 'cards' 
              ? 'text-emerald-700 font-bold bg-emerald-50' 
              : 'text-slate-500 active:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4 mb-0.5" />
          <span>Produk</span>
        </button>

        <button
          onClick={() => setCurrentView('matrix')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-[11px] font-medium transition-all ${
            currentView === 'matrix' 
              ? 'text-emerald-700 font-bold bg-emerald-50' 
              : 'text-slate-500 active:bg-slate-100'
          }`}
        >
          <Table2 className="w-4 h-4 mb-0.5" />
          <span>Matriks</span>
        </button>

        {/* Center Floating Action Button */}
        <button
          onClick={() => {
            setProductToEdit(null);
            setIsProductModalOpen(true);
          }}
          aria-label="Tambah Produk Baru"
          className="flex flex-col items-center justify-center -mt-6 bg-emerald-600 active:bg-emerald-700 text-white w-12 h-12 rounded-full shadow-lg shadow-emerald-600/30 ring-4 ring-white active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        <button
          onClick={() => setCurrentView('simulation')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-[11px] font-medium transition-all ${
            currentView === 'simulation' 
              ? 'text-emerald-700 font-bold bg-emerald-50' 
              : 'text-slate-500 active:bg-slate-100'
          }`}
        >
          <Calculator className="w-4 h-4 mb-0.5" />
          <span>Simulasi</span>
        </button>

        <button
          onClick={() => setCurrentView('suppliers')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-[11px] font-medium transition-all ${
            currentView === 'suppliers' 
              ? 'text-emerald-700 font-bold bg-emerald-50' 
              : 'text-slate-500 active:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Supplier</span>
        </button>
      </nav>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        suppliers={suppliers}
      />

      <AddQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        products={products}
        suppliers={suppliers}
        selectedProduct={quoteSelectedProduct}
        quoteToEdit={quoteToEdit}
        onSaveQuote={handleSaveQuote}
      />

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSave={handleSaveSupplier}
        supplierToEdit={supplierToEdit}
      />

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleConfirmImport}
      />

      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
      />

      <OfflineIndicator />

    </div>
  );
}
