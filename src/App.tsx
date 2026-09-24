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
  Users,
  Trophy,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { Product, Supplier, SupplierQuote, ViewMode, SortOption, AppSettings, DEFAULT_APP_SETTINGS } from './types';
import { INITIAL_PRODUCTS, INITIAL_SUPPLIERS } from './data/initialData';
import { exportProductsToCSV, getProductPriceStats } from './utils/formatters';
import { downloadCompleteExcelTemplate, exportAppToExcel, ExcelParseResult } from './utils/excelUtils';
import { Navbar } from './components/Navbar';
import { SummaryStats } from './components/SummaryStats';
import { ProductCard } from './components/ProductCard';
import { MatrixView } from './components/MatrixView';
import { SimulationCalculator } from './components/SimulationCalculator';
import { SupplierDirectory } from './components/SupplierDirectory';
import { ExcelCompareView } from './components/ExcelCompareView';
import { ProductModal } from './components/ProductModal';
import { AddQuoteModal } from './components/AddQuoteModal';
import { SupplierModal } from './components/SupplierModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SettingsModal } from './components/SettingsModal';
import {
  subscribeToProducts,
  subscribeToSuppliers,
  subscribeToSettings,
  saveSettingsToFirestore,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveSupplierToFirestore,
  deleteSupplierFromFirestore,
  batchSaveToFirestore,
  seedInitialDataIfEmpty,
} from './services/firebaseService';

const STORAGE_KEY_PRODUCTS = 'harga_vendor_products_v1';
const STORAGE_KEY_SUPPLIERS = 'harga_vendor_suppliers_v1';
const STORAGE_KEY_SETTINGS = 'harga_vendor_settings_v1';

export default function App() {
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('syncing');

  // State: Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load settings from storage', e);
    }
    return DEFAULT_APP_SETTINGS;
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
  const [importBannerInfo, setImportBannerInfo] = useState<{
    productsCount: number;
    quotesCount: number;
    suppliersCount: number;
  } | null>(null);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Real-time synchronization with Firebase Firestore
  useEffect(() => {
    let unsubProducts = () => {};
    let unsubSuppliers = () => {};
    let unsubSettings = () => {};

    function initFirebaseSync() {
      try {
        setSyncStatus(navigator.onLine ? 'syncing' : 'offline');

        // Immediately attach listeners so cached/local data is displayed with zero lag
        unsubProducts = subscribeToProducts(
          (remoteProducts) => {
            if (remoteProducts.length > 0) {
              setProducts(remoteProducts);
            }
            setSyncStatus('connected');
          },
          (err) => {
            const isOffline = (err as any)?.code === 'unavailable' || err?.message?.includes('offline') || !navigator.onLine;
            setSyncStatus(isOffline ? 'offline' : 'offline');
          }
        );

        unsubSuppliers = subscribeToSuppliers(
          (remoteSuppliers) => {
            if (remoteSuppliers.length > 0) {
              setSuppliers(remoteSuppliers);
            }
            setSyncStatus('connected');
          },
          (err) => {
            const isOffline = (err as any)?.code === 'unavailable' || err?.message?.includes('offline') || !navigator.onLine;
            setSyncStatus(isOffline ? 'offline' : 'offline');
          }
        );

        unsubSettings = subscribeToSettings(
          (remoteSettings) => {
            if (remoteSettings) {
              setSettings(remoteSettings);
              localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(remoteSettings));
            }
          },
          () => {}
        );

        // Seed initial data in the background if collection is completely fresh
        seedInitialDataIfEmpty(INITIAL_PRODUCTS, INITIAL_SUPPLIERS).catch(() => {});
      } catch (e) {
        console.warn('Firebase sync initialized in offline mode:', e);
        setSyncStatus('offline');
      }
    }

    initFirebaseSync();

    return () => {
      unsubProducts();
      unsubSuppliers();
      unsubSettings();
    };
  }, []);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
      await saveSettingsToFirestore(newSettings);
      showToast(
        `Pengaturan disimpan: PPN ${newSettings.ppnEnabled ? `${newSettings.ppnPercent}%` : 'Non-PPN'}, Margin ${newSettings.marginPercent}%`
      );
    } catch (e) {
      console.error('Failed to sync settings to Firestore:', e);
      showToast('Pengaturan disimpan di perangkat.');
    }
  };

  // Persist to localStorage as offline fallback
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
      const updatedProduct: Product = {
        ...productToEdit,
        ...productData,
      };
      setProducts((prev) =>
        prev.map((p) => (p.id === productToEdit.id ? updatedProduct : p))
      );
      saveProductToFirestore(updatedProduct).catch((err) =>
        console.error('Failed to save product to Firestore:', err)
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
          saveSupplierToFirestore(matchedSup).catch((err) =>
            console.error('Failed to save new supplier to Firestore:', err)
          );
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
      saveProductToFirestore(newProduct).catch((err) =>
        console.error('Failed to save new product to Firestore:', err)
      );
      showToast('Produk baru berhasil ditambahkan');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini beserta seluruh data penawarannya?')) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      deleteProductFromFirestore(productId).catch((err) =>
        console.error('Failed to delete product from Firestore:', err)
      );
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
        saveSupplierToFirestore(newSup).catch((err) =>
          console.error('Failed to save new supplier for quote to Firestore:', err)
        );
      }
    }

    let updatedTargetProduct: Product | null = null;

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

        const updated = {
          ...p,
          quotes: updatedQuotes,
        };
        updatedTargetProduct = updated;
        return updated;
      })
    );

    if (updatedTargetProduct) {
      saveProductToFirestore(updatedTargetProduct).catch((err) =>
        console.error('Failed to save product with updated quotes to Firestore:', err)
      );
    }

    showToast('Penawaran harga supplier berhasil disimpan');
  };

  const handleDeleteQuote = (productId: string, quoteId: string) => {
    if (confirm('Hapus penawaran harga dari supplier ini?')) {
      let updatedTargetProduct: Product | null = null;

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          const updated = {
            ...p,
            quotes: p.quotes.filter((q) => q.id !== quoteId),
          };
          updatedTargetProduct = updated;
          return updated;
        })
      );

      if (updatedTargetProduct) {
        saveProductToFirestore(updatedTargetProduct).catch((err) =>
          console.error('Failed to delete quote from Firestore product:', err)
        );
      }

      showToast('Penawaran berhasil dihapus');
    }
  };

  // Handlers for Suppliers
  const handleSaveSupplier = (supplierData: Partial<Supplier>) => {
    if (supplierToEdit) {
      const updatedSup: Supplier = { ...supplierToEdit, ...supplierData } as Supplier;
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplierToEdit.id ? updatedSup : s))
      );
      saveSupplierToFirestore(updatedSup).catch((err) =>
        console.error('Failed to save supplier to Firestore:', err)
      );

      // Also update quotes where supplierName matches
      setProducts((prev) =>
        prev.map((p) => {
          let hasMatch = false;
          const updatedQuotes = p.quotes.map((q) => {
            if (q.supplierId === supplierToEdit.id) {
              hasMatch = true;
              return { ...q, supplierName: supplierData.name || q.supplierName };
            }
            return q;
          });
          const updatedP = { ...p, quotes: updatedQuotes };
          if (hasMatch) {
            saveProductToFirestore(updatedP).catch((err) =>
              console.error('Failed to update product supplier name in Firestore:', err)
            );
          }
          return updatedP;
        })
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
      saveSupplierToFirestore(newSup).catch((err) =>
        console.error('Failed to save new supplier to Firestore:', err)
      );
      showToast('Supplier baru berhasil didaftarkan');
    }
  };

  const handleDeleteSupplier = (supplierId: string) => {
    if (confirm('Hapus supplier ini dari direktori?')) {
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
      deleteSupplierFromFirestore(supplierId).catch((err) =>
        console.error('Failed to delete supplier from Firestore:', err)
      );
      showToast('Supplier berhasil dihapus');
    }
  };

  // Reset to initial realistic demo data
  const handleResetDemoData = async () => {
    if (confirm('Kembalikan data ke contoh awal dan sinkronkan ke Firebase?')) {
      setProducts(INITIAL_PRODUCTS);
      setSuppliers(INITIAL_SUPPLIERS);
      try {
        await batchSaveToFirestore(INITIAL_PRODUCTS, INITIAL_SUPPLIERS);
        showToast('Data contoh berhasil dipulihkan & disinkronkan ke Firebase');
      } catch (err) {
        console.error('Failed to reseed Firebase:', err);
        showToast('Data lokal berhasil dipulihkan');
      }
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

          const safeSubCount = qImport.subUnitCount || existingProd.subUnitCount || 10;
          const quoteObj: SupplierQuote = {
            id: qIdx >= 0 ? quotes[qIdx].id : `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            supplierId: supplierId || (qIdx >= 0 ? quotes[qIdx].supplierId : ''),
            supplierName: qImport.supplierName.trim(),
            price: qImport.price,
            unit: qImport.defaultUnit || existingProd.defaultUnit,
            hna: qImport.hna || (qIdx >= 0 ? quotes[qIdx].hna : qImport.price),
            discountPercent: qImport.discountPercent || (qIdx >= 0 ? quotes[qIdx].discountPercent : 0),
            pricePerSubUnit: qImport.pricePerSubUnit || (qIdx >= 0 ? quotes[qIdx].pricePerSubUnit : Math.round(qImport.price / safeSubCount)),
            priceWithPpn: qImport.priceWithPpn || (qIdx >= 0 ? quotes[qIdx].priceWithPpn : Math.round(qImport.price * 1.11)),
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
          company: qImport.company || existingProd.company,
          packaging: qImport.packaging || existingProd.packaging,
          packContent: qImport.packContent || existingProd.packContent,
          subUnitCount: qImport.subUnitCount || existingProd.subUnitCount,
          subUnitName: qImport.subUnitName || existingProd.subUnitName,
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

        const safeSubCount = qImport.subUnitCount || 10;
        if (qImport.supplierName && qImport.price > 0) {
          initialQuotes.push({
            id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            supplierId: supplierId,
            supplierName: qImport.supplierName.trim(),
            price: qImport.price,
            unit: qImport.defaultUnit || 'Box',
            hna: qImport.hna || qImport.price,
            discountPercent: qImport.discountPercent || 0,
            pricePerSubUnit: qImport.pricePerSubUnit || Math.round(qImport.price / safeSubCount),
            priceWithPpn: qImport.priceWithPpn || Math.round(qImport.price * 1.11),
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
          genericName: qImport.genericName,
          company: qImport.company,
          packaging: qImport.packaging,
          packContent: qImport.packContent,
          subUnitCount: safeSubCount,
          subUnitName: qImport.subUnitName || 'lembar',
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
    batchSaveToFirestore(nextProducts, nextSuppliers).catch((err) =>
      console.error('Failed to batch save imported Excel data to Firestore:', err)
    );

    setImportBannerInfo({
      productsCount: productsAdded + productsUpdated,
      quotesCount,
      suppliersCount: suppliersAdded + suppliersUpdated,
    });

    const summaryParts: string[] = [];
    if (productsAdded > 0) summaryParts.push(`${productsAdded} produk baru`);
    if (productsUpdated > 0) summaryParts.push(`${productsUpdated} produk diperbarui`);
    if (suppliersAdded > 0) summaryParts.push(`${suppliersAdded} supplier baru`);
    if (quotesCount > 0) summaryParts.push(`${quotesCount} harga penawaran`);

    showToast(
      summaryParts.length > 0
        ? `Impor & Komparasi Excel berhasil: ${summaryParts.join(', ')}`
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
        syncStatus={syncStatus}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        settings={settings}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 sm:pb-10">
        
        {/* Post-Import Result Notification Banner */}
        {importBannerInfo && (
          <div className="mb-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Trophy className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <span>Hasil Import & Komparasi Excel Siap!</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                    {importBannerInfo.productsCount} Produk
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                    {importBannerInfo.quotesCount} Penawaran Supplier
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Semua penawaran supplier telah digabungkan. Peringkat rekomendasi supplier termurah dan margin jual (+{settings.marginPercent}%) telah otomatis dihitung.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCurrentView('matrix');
                  setImportBannerInfo(null);
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Buka Matriks Harga
              </button>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Buka Ulang Komparasi
              </button>
              <button
                type="button"
                onClick={() => setImportBannerInfo(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 transition-colors"
                title="Tutup pemberitahuan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

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
                    settings={settings}
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
            settings={settings}
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
            settings={settings}
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

        {/* View Mode 5: Excel Compare & Instant Supplier Recommendation */}
        {currentView === 'excel-compare' && (
          <ExcelCompareView
            settings={settings}
            onConfirmImport={handleConfirmImport}
            onNavigateToMatrix={() => setCurrentView('matrix')}
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
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 pb-safe flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => setCurrentView('cards')}
          className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
            currentView === 'cards' 
              ? 'text-emerald-700 font-bold bg-emerald-50' 
              : 'text-slate-500 active:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4 mb-0.5" />
          <span>Produk</span>
        </button>

        <button
          onClick={() => setCurrentView('excel-compare')}
          className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
            currentView === 'excel-compare' 
              ? 'text-emerald-800 font-black bg-emerald-100/80 ring-1 ring-emerald-400/40' 
              : 'text-emerald-700 font-semibold active:bg-emerald-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 mb-0.5 text-emerald-700" />
          <span>Komparasi</span>
        </button>

        {/* Center Floating Action Button */}
        <button
          onClick={() => {
            setProductToEdit(null);
            setIsProductModalOpen(true);
          }}
          aria-label="Tambah Produk Baru"
          className="flex flex-col items-center justify-center -mt-5 bg-emerald-600 active:bg-emerald-700 text-white w-11 h-11 rounded-full shadow-lg shadow-emerald-600/30 ring-4 ring-white active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          onClick={() => setCurrentView('matrix')}
          className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
            currentView === 'matrix' 
              ? 'text-emerald-700 font-bold bg-emerald-50' 
              : 'text-slate-500 active:bg-slate-100'
          }`}
        >
          <Table2 className="w-4 h-4 mb-0.5" />
          <span>Matriks</span>
        </button>

        <button
          onClick={() => setCurrentView('suppliers')}
          className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
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
        settings={settings}
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
        settings={settings}
      />

      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <OfflineIndicator />

    </div>
  );
}
