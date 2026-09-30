import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Check,
  AlertCircle,
  Trophy,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Search,
  Copy,
  LayoutGrid,
  Table2,
  ListFilter,
  CheckCircle2,
  RefreshCw,
  Info,
  ChevronRight,
  HelpCircle,
  Zap,
  Building2,
  Layers,
  ArrowUpDown,
  ShoppingCart,
  PackageCheck,
  Plus,
  Minus,
  Link2,
  Calculator,
  Boxes
} from 'lucide-react';
import {
  parseExcelUpload,
  getSampleExcelData,
  getSampleOrderRequirementData,
  groupImportedQuotesByProduct,
  downloadCompleteExcelTemplate,
  downloadProductOnlyTemplate,
  downloadSupplierOnlyTemplate,
  downloadOrderRequirementTemplate,
  exportComparisonReportToExcel,
  ImportedProductComparison,
  ExcelParseResult
} from '../utils/excelUtils';
import { formatRupiah, calculateSellingPrice } from '../utils/formatters';
import { Product, Supplier, AppSettings, DEFAULT_APP_SETTINGS } from '../types';
import { Pagination } from './Pagination';

interface ExcelCompareViewProps {
  products?: Product[];
  suppliers?: Supplier[];
  settings?: AppSettings;
  onConfirmImport: (parsedResult: ExcelParseResult, importMode: 'merge' | 'overwrite') => void;
  onNavigateToMatrix?: () => void;
  onNavigateToSimulation?: () => void;
}

export const ExcelCompareView: React.FC<ExcelCompareViewProps> = ({
  products = [],
  suppliers = [],
  settings = DEFAULT_APP_SETTINGS,
  onConfirmImport,
  onNavigateToMatrix,
  onNavigateToSimulation,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);
  const [sampleKind, setSampleKind] = useState<'full' | 'requirement' | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Tab & View Controls
  const [displayMode, setDisplayMode] = useState<'cards' | 'matrix' | 'raw'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'multi_only' | 'savings_only' | 'matched_only'>('all');
  const [sortBy, setSortBy] = useState<'savings_desc' | 'quotes_count' | 'name_asc'>('savings_desc');
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [hasAppliedToCatalog, setHasAppliedToCatalog] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Custom user adjustments for order quantities on the fly
  const [customQtys, setCustomQtys] = useState<Record<string, number>>({});
  // Manual link mapping (productName lowercase -> catalog productId)
  const [manualProductLinks, setManualProductLinks] = useState<Record<string, string>>({});

  // Handle file selection
  const handleFile = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    setHasAppliedToCatalog(false);
    setIsSampleLoaded(false);
    setSampleKind(null);

    try {
      const res = await parseExcelUpload(file);
      setParseResult(res);
    } catch (err: any) {
      console.error('Error parsing Excel:', err);
      setParseResult({
        parsedQuotes: [],
        parsedSuppliers: [],
        errors: [err.message || 'Gagal memproses file Excel'],
        warnings: [],
        sheetNames: [],
        totalRows: 0,
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Load sample dataset (Format Lengkap)
  const handleLoadSample = () => {
    setIsParsing(true);
    setHasAppliedToCatalog(false);
    setTimeout(() => {
      const sample = getSampleExcelData();
      setParseResult(sample);
      setIsSampleLoaded(true);
      setSampleKind('full');
      setSelectedFile(
        new File(['sample'], 'Data_Contoh_Farmasi_5Obat_17Penawaran.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      setIsParsing(false);
    }, 200);
  };

  // Load sample dataset (Format Kebutuhan: Nama Produk & Qty)
  const handleLoadSampleRequirement = () => {
    setIsParsing(true);
    setHasAppliedToCatalog(false);
    setTimeout(() => {
      const sample = getSampleOrderRequirementData();
      setParseResult(sample);
      setIsSampleLoaded(true);
      setSampleKind('requirement');
      setSelectedFile(
        new File(['sample'], 'Daftar_Kebutuhan_Order_Nama_dan_Qty.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      setIsParsing(false);
    }, 200);
  };

  // Reset / Clear
  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setIsSampleLoaded(false);
    setSampleKind(null);
    setHasAppliedToCatalog(false);
    setSearchQuery('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Group quotes by product to get comparison results, automatically enriched with catalog products
  const groupedProducts = useMemo(() => {
    if (!parseResult || !parseResult.parsedQuotes) return [];

    // Apply manual product link overrides if any
    const workingQuotes = parseResult.parsedQuotes.map((q) => {
      const key = q.name.trim().toLowerCase();
      const manualId = manualProductLinks[key];
      if (manualId) {
        const targetProd = products.find((p) => p.id === manualId);
        if (targetProd) {
          return {
            ...q,
            name: targetProd.name,
            sku: targetProd.sku || q.sku,
            genericName: targetProd.genericName || q.genericName,
          };
        }
      }
      return q;
    });

    const grouped = groupImportedQuotesByProduct(workingQuotes, products);

    // Apply custom quantities if user adjusted them in the UI
    return grouped.map((item) => {
      const qKey = item.productName.trim().toLowerCase();
      const customQty = customQtys[qKey];
      if (customQty !== undefined && customQty > 0) {
        item.qty = customQty;
        item.quotes.forEach((q) => {
          q.qty = customQty;
        });
      }
      return item;
    });
  }, [parseResult, products, manualProductLinks, customQtys]);

  // Overall Statistics & Order Simulation
  const stats = useMemo(() => {
    let totalSavingsPotential = 0;
    let multiSupplierCount = 0;
    let totalOrderCheapest = 0;
    let totalOrderHighest = 0;
    let totalOrderQty = 0;
    let matchedCatalogCount = 0;
    const supplierWins: Record<string, { winCount: number; totalQuotes: number; totalCost: number; itemsFulfilled: number }> = {};

    groupedProducts.forEach((p) => {
      const pQty = p.qty && p.qty > 0 ? p.qty : 1;
      totalOrderQty += pQty;
      if (p.isFromCatalog) matchedCatalogCount++;

      if (p.supplierCount > 1) {
        multiSupplierCount++;
        totalSavingsPotential += p.priceDifference * pQty;
      }

      if (p.cheapestQuote) {
        totalOrderCheapest += p.cheapestQuote.price * pQty;
      }
      if (p.highestQuote) {
        totalOrderHighest += p.highestQuote.price * pQty;
      }

      p.quotes.forEach((q) => {
        if (!supplierWins[q.supplierName]) {
          supplierWins[q.supplierName] = { winCount: 0, totalQuotes: 0, totalCost: 0, itemsFulfilled: 0 };
        }
        supplierWins[q.supplierName].totalQuotes++;
        supplierWins[q.supplierName].totalCost += q.price * pQty;
        supplierWins[q.supplierName].itemsFulfilled++;
      });

      if (p.cheapestQuote && p.cheapestQuote.supplierName) {
        const bestSup = p.cheapestQuote.supplierName;
        if (!supplierWins[bestSup]) {
          supplierWins[bestSup] = { winCount: 0, totalQuotes: 0, totalCost: 0, itemsFulfilled: 0 };
        }
        supplierWins[bestSup].winCount++;
      }
    });

    const totalOrderSavings = Math.max(0, totalOrderHighest - totalOrderCheapest);
    const orderSavingsPercentage = totalOrderHighest > 0
      ? Math.round((totalOrderSavings / totalOrderHighest) * 100)
      : 0;

    const rankedSuppliers = Object.entries(supplierWins)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.winCount - a.winCount || b.totalQuotes - a.totalQuotes);

    // Extract unique categories
    const categories = Array.from(new Set(groupedProducts.map((p) => p.category).filter(Boolean)));

    return {
      totalProducts: groupedProducts.length,
      totalOrderQty,
      totalOrderCheapest,
      totalOrderHighest,
      totalOrderSavings,
      orderSavingsPercentage,
      matchedCatalogCount,
      multiSupplierCount,
      totalSavingsPotential,
      rankedSuppliers,
      categories,
    };
  }, [groupedProducts]);

  // Handlers for adjusting order quantity directly on UI
  const handleUpdateQty = (productName: string, delta: number) => {
    const key = productName.trim().toLowerCase();
    const current = customQtys[key] !== undefined 
      ? customQtys[key] 
      : (groupedProducts.find((p) => p.productName.trim().toLowerCase() === key)?.qty || 1);
    const nextVal = Math.max(1, current + delta);
    setCustomQtys((prev) => ({ ...prev, [key]: nextVal }));
  };

  const handleSetExactQty = (productName: string, val: number) => {
    const key = productName.trim().toLowerCase();
    const nextVal = Math.max(1, isNaN(val) ? 1 : val);
    setCustomQtys((prev) => ({ ...prev, [key]: nextVal }));
  };

  // Handler for manually linking an imported item to a product card in catalog
  const handleLinkProduct = (importedName: string, targetProductId: string) => {
    const key = importedName.trim().toLowerCase();
    setManualProductLinks((prev) => ({
      ...prev,
      [key]: targetProductId,
    }));
  };

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    let list = groupedProducts;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          (p.company && p.company.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.packaging && p.packaging.toLowerCase().includes(q)) ||
          p.quotes.some((quote) => quote.supplierName.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Filter type
    if (filterType === 'multi_only') {
      list = list.filter((p) => p.supplierCount > 1);
    } else if (filterType === 'savings_only') {
      list = list.filter((p) => p.priceDifference > 0);
    } else if (filterType === 'matched_only') {
      list = list.filter((p) => p.isFromCatalog);
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'savings_desc') {
        return b.priceDifference - a.priceDifference || b.supplierCount - a.supplierCount;
      }
      if (sortBy === 'quotes_count') {
        return b.supplierCount - a.supplierCount || b.priceDifference - a.priceDifference;
      }
      if (sortBy === 'name_asc') {
        return a.productName.localeCompare(b.productName);
      }
      return 0;
    });
  }, [groupedProducts, searchQuery, selectedCategory, filterType, sortBy]);

  // Pagination state for Excel Compare View
  const [comparePage, setComparePage] = useState(1);
  const [comparePageSize, setComparePageSize] = useState(20);

  // Reset page when filtering or mode changes
  useEffect(() => {
    setComparePage(1);
  }, [searchQuery, selectedCategory, filterType, sortBy, displayMode]);

  // Paginated product comparison list
  const paginatedFilteredProducts = comparePageSize <= 0
    ? filteredProducts
    : filteredProducts.slice((comparePage - 1) * comparePageSize, comparePage * comparePageSize);

  // Paginated raw quotes list
  const paginatedRawQuotes = comparePageSize <= 0
    ? (parseResult?.parsedQuotes || [])
    : (parseResult?.parsedQuotes || []).slice((comparePage - 1) * comparePageSize, comparePage * comparePageSize);

  // Copy recommendation summary
  const handleCopySummary = () => {
    if (groupedProducts.length === 0) return;
    const dateStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });
    let text = `📋 REKOMENDASI ORDER & KOMPARASI SUPPLIER TERMURAH\n`;
    text += `Tanggal Analisis: ${dateStr}\n`;
    text += `Total Produk Kebutuhan: ${groupedProducts.length} Produk (${stats.totalOrderQty} Total Qty)\n`;
    text += `Estimasi Total Biaya Belanja (Harga Termurah): ${formatRupiah(stats.totalOrderCheapest)}\n`;
    text += `Potensi Penghematan Order: ${formatRupiah(stats.totalOrderSavings)} (-${stats.orderSavingsPercentage}%)\n\n`;

    filteredProducts.forEach((p, idx) => {
      const pQty = p.qty || 1;
      text += `${idx + 1}. ${p.productName}${p.company ? ` (${p.company})` : ''} - Kebutuhan: ${pQty} ${p.defaultUnit}\n`;
      if (p.cheapestQuote) {
        const sellingPrice = calculateSellingPrice(p.cheapestQuote.price, settings).sellingPrice;
        text += `   👑 SUPPLIER TERMURAH: ${p.cheapestQuote.supplierName}\n`;
        text += `   • Modal Satuan: ${formatRupiah(p.cheapestQuote.price)} / ${p.defaultUnit}\n`;
        text += `   • Total Biaya Order: ${formatRupiah(p.cheapestQuote.price * pQty)} (${pQty} ${p.defaultUnit})\n`;
        text += `   • Rekomendasi Jual: ${formatRupiah(sellingPrice)} (+${settings.marginPercent}%)\n`;
        if (p.supplierCount > 1 && p.priceDifference > 0) {
          text += `   • Hemat: ${formatRupiah(p.priceDifference * pQty)} vs ${p.highestQuote?.supplierName || 'vendor lain'}\n`;
        }
      }
      if (p.supplierCount > 1) {
        const allQuotes = p.quotes
          .map((q) => `${q.supplierName}: ${formatRupiah(q.price)} (Total: ${formatRupiah(q.price * pQty)})`)
          .join(', ');
        text += `   • Semua Supplier: ${allQuotes}\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Export report to Excel
  const handleExportComparison = () => {
    if (groupedProducts.length === 0) return;
    exportComparisonReportToExcel(groupedProducts, settings.marginPercent);
  };

  // Apply to main catalog
  const handleApplyToCatalog = () => {
    if (!parseResult) return;
    onConfirmImport(parseResult, importMode);
    setHasAppliedToCatalog(true);
  };

  return (
    <div className="space-y-5">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-sm relative overflow-hidden">
        {/* Ambient Decorative Shapes */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-40 h-40 bg-teal-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold tracking-wide uppercase mb-2 border border-emerald-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Komparasi Instan & Rekomendasi PBF dari Kartu Produk</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Import Kebutuhan Produk & Komparasi Harga Supplier</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Cukup upload data berisi kolom <strong>Item Produk</strong> dan <strong>Qty Kebutuhan</strong>. Sistem otomatis mencocokkan ke <strong>Kartu Produk</strong>, menampilkan perbandingan harga seluruh supplier, menghitung total belanja termurah, dan potensi penghematan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Template Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Unduh Template Excel</span>
              </button>

              {showTemplateDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      downloadOrderRequirementTemplate();
                      setShowTemplateDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 text-xs transition-colors flex items-start gap-2.5 cursor-pointer bg-emerald-50/60"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900">Template Kebutuhan Order</p>
                        <span className="text-[9px] font-black bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">⭐️ Paling Praktis</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Cukup 2 kolom: Item Produk & Qty (Harga dari Kartu Produk)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      downloadCompleteExcelTemplate();
                      setShowTemplateDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-xs transition-colors flex items-start gap-2.5 cursor-pointer border-t border-slate-100"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">Template Lengkap (2 Sheet)</p>
                      <p className="text-[10px] text-slate-500">Sheet Produk & Penawaran + Master Supplier</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadProductOnlyTemplate();
                      setShowTemplateDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-xs transition-colors flex items-center gap-2.5 cursor-pointer border-t border-slate-100"
                  >
                    <Download className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">Template Khusus Produk Saja</p>
                      <p className="text-[10px] text-slate-500">1 Sheet ringkas siap isi</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadSupplierOnlyTemplate();
                      setShowTemplateDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-xs transition-colors flex items-center gap-2.5 cursor-pointer border-t border-slate-100"
                  >
                    <Download className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">Template Master Supplier Saja</p>
                      <p className="text-[10px] text-slate-500">Kontak, TOP, & Alamat PBF</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Sample Button: Cukup Nama & Qty */}
            <button
              type="button"
              onClick={handleLoadSampleRequirement}
              disabled={isParsing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Coba komparasi instan dengan data kebutuhan order (Hanya Item Produk & Qty, harga ditarik dari Kartu Produk)"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
              <span>{isSampleLoaded && sampleKind === 'requirement' ? 'Muat Ulang Kebutuhan' : '⚡ Contoh Cukup Nama & Qty'}</span>
            </button>

            {/* Quick Sample Button: Format Lengkap */}
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={isParsing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
              title="Coba langsung dengan 17 penawaran supplier dari 5 obat farmasi populer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
              <span>Data Lengkap (17 Penawaran)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Zone or Active File Bar */}
      {!parseResult || parseResult.parsedQuotes.length === 0 ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
              : 'border-slate-300 bg-white hover:border-emerald-400'
          }`}
        >
          <div className="max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Pilih atau Tarik File Excel ke Sini
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Mendukung format <span className="font-semibold text-slate-700">.xlsx, .xls, .csv</span>.
              </p>
            </div>

            {/* Pro-Tip Box: Cukup Item Produk & Qty */}
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5 text-left space-y-1 text-xs text-emerald-950">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Format Paling Praktis: Cukup 2 Kolom "Item Produk" dan "Qty"</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Anda tidak perlu mengisi harga, satuan, atau nama supplier di file Excel. Sistem otomatis mencocokkan nama obat dengan <strong>Kartu Produk</strong> dan langsung menampilkan komparasi harga setiap supplier serta menghitung total biaya pembelian.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white transition-all cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>{isParsing ? 'Membaca File...' : 'Pilih File dari Komputer/HP'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSampleRequirement}
                disabled={isParsing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white transition-all cursor-pointer shadow-xs"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Coba Contoh Format Kebutuhan (Nama & Qty)</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isParsing}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                <span>Data Lengkap Multi-Vendor</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Otomatis Tarik Harga dari Kartu Produk
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Hitung Total Belanja per Supplier
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Analisis Selisih Penghematan
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Active File Summary Toolbar */
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm truncate max-w-xs sm:max-w-md">
                  {selectedFile ? selectedFile.name : 'Data Import Aktif'}
                </h3>
                {isSampleLoaded && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                    ⚡ Mode Data Contoh
                  </span>
                )}
                {hasAppliedToCatalog && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Tersimpan di Katalog Utama
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {parseResult.parsedQuotes.length} penawaran supplier terbaca • {groupedProducts.length} produk dianalisis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ganti File</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
            >
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* When data is parsed and available */}
      {parseResult && groupedProducts.length > 0 && (
        <div className="space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Metric 1: Total Produk */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Produk Dianalisis
                </span>
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {stats.totalProducts} <span className="text-xs font-medium text-slate-500">Produk</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dari {parseResult.parsedQuotes.length} baris penawaran Excel
              </p>
            </div>

            {/* Metric 2: Multi-Supplier */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Multi-Vendor
                </span>
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-blue-950 mt-1">
                {stats.multiSupplierCount} <span className="text-xs font-medium text-blue-700">Produk</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Memiliki &gt; 1 penawaran untuk dikomparasikan
              </p>
            </div>

            {/* Metric 3: Total Potensi Hemat */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  Potensi Hemat
                </span>
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <p className="text-lg sm:text-xl font-black text-emerald-950 mt-1">
                {formatRupiah(stats.totalSavingsPotential)}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Jika order di supplier termurah vs tertinggi
              </p>
            </div>

            {/* Metric 4: Peringkat Supplier */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Supplier Paling Murah
                </span>
                <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-1">
                {stats.rankedSuppliers.length > 0 ? (
                  <div>
                    <p className="text-sm font-black text-slate-900 truncate">
                      {stats.rankedSuppliers[0].name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Termurah di <strong className="text-emerald-700">{stats.rankedSuppliers[0].winCount}</strong> dari {stats.rankedSuppliers[0].totalQuotes} produk
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">-</p>
                )}
              </div>
            </div>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama obat (Amoxicillin), pabrik (Sanbe), atau supplier (Kimia Farma)..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800"
                />
              </div>

              {/* View Switcher & Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* View Switcher */}
                <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDisplayMode('cards')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      displayMode === 'cards'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Kartu Rekomendasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode('matrix')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      displayMode === 'matrix'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    <span>Tabel Komparasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode('raw')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      displayMode === 'raw'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Data Mentah ({parseResult.parsedQuotes.length})</span>
                  </button>
                </div>

                {/* Copy Summary Button */}
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                  title="Salin ringkasan rekomendasi supplier termurah untuk dikirim via WA atau dicetak"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Rangkuman Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salin Rangkuman</span>
                    </>
                  )}
                </button>

                {/* Export Report */}
                <button
                  type="button"
                  onClick={handleExportComparison}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                  title="Unduh laporan perbandingan dan rekomendasi dalam bentuk file Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Ekspor Laporan (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Filter Chips Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Produk ({groupedProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('multi_only')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === 'multi_only'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  Multi-Supplier Saja ({stats.multiSupplierCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('savings_only')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === 'savings_only'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Ada Selisih Harga ({groupedProducts.filter((p) => p.priceDifference > 0).length})
                </button>

                {stats.categories.length > 1 && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="ml-2 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Semua Kategori</option>
                    {stats.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[11px] text-slate-500">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="savings_desc">Selisih Penghematan Tertinggi</option>
                  <option value="quotes_count">Jumlah Penawaran Terbanyak</option>
                  <option value="name_asc">Nama Produk (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: COMPARISON CARDS */}
          {displayMode === 'cards' && (
            <div className="space-y-3.5">
              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">Tidak ada produk yang sesuai filter</p>
                  <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau kategori yang dipilih.</p>
                </div>
              ) : (
                paginatedFilteredProducts.map((p, pIdx) => {
                  const best = p.cheapestQuote;
                  const highest = p.highestQuote;
                  const bestSelling = best ? calculateSellingPrice(best.price, settings).sellingPrice : 0;
                  const subUnitCount = p.subUnitCount || 10;
                  const bestPricePerSub = best
                    ? best.pricePerSubUnit || Math.round(best.price / subUnitCount)
                    : 0;

                  return (
                    <div
                      key={pIdx}
                      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-emerald-300 transition-all space-y-3.5"
                    >
                      {/* Product Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-slate-900 leading-snug">
                              {p.productName}
                            </h3>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              {p.category}
                            </span>
                            {p.isFromCatalog ? (
                              <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Kartu Produk ({p.supplierCount} Supplier)
                              </span>
                            ) : p.supplierCount > 0 ? (
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md">
                                {p.supplierCount} Supplier Excel
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                Belum Terhubung Kartu Produk
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            {p.company && (
                              <span className="flex items-center gap-1 font-semibold text-slate-800">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {p.company}
                              </span>
                            )}
                            {p.packaging && (
                              <span>Kemasan: <strong>{p.packaging}</strong></span>
                            )}
                            {p.packContent && (
                              <span>Isi: <strong>{p.packContent}</strong></span>
                            )}
                            <span>Satuan Utama: <strong className="text-slate-900">{p.defaultUnit}</strong></span>
                          </div>
                        </div>

                        {/* Order Qty Control & Savings Badge */}
                        <div className="flex items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 flex-wrap">
                          {/* Qty Adjustment Spinner */}
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5">Qty Kebutuhan:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(p.productName, -1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center bg-white text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold cursor-pointer transition-colors shadow-2xs"
                              title="Kurangi Qty"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={p.qty || 1}
                              onChange={(e) => handleSetExactQty(p.productName, parseInt(e.target.value, 10))}
                              className="w-12 text-center text-xs font-black bg-white rounded-lg border border-slate-300 py-0.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(p.productName, 1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center bg-white text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold cursor-pointer transition-colors shadow-2xs"
                              title="Tambah Qty"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-slate-700 pr-1.5">{p.defaultUnit}</span>
                          </div>

                          {/* Savings Badge */}
                          {p.supplierCount > 1 && p.priceDifference > 0 && (
                            <div className="text-left sm:text-right bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shrink-0 shadow-2xs">
                              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
                                Total Potensi Hemat
                              </span>
                              <span className="text-sm font-black text-emerald-900">
                                {formatRupiah(p.priceDifference * (p.qty || 1))}{' '}
                                <span className="text-[11px] font-bold text-emerald-700">
                                  (-{p.savingsPercentage}%)
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Best Recommendation Highlight Box */}
                      {best ? (
                        <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 p-3.5 sm:p-4 rounded-xl border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                              <Trophy className="w-5 h-5 text-amber-300" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                                  👑 Rekomendasi Termurah
                                </span>
                                <span className="text-sm font-black text-slate-900">
                                  {best.supplierName}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-700 flex-wrap">
                                <div>
                                  Modal Satuan: <strong className="text-emerald-800 font-black text-sm">{formatRupiah(best.price)}</strong> / {p.defaultUnit}
                                </div>
                                <span className="text-slate-300">•</span>
                                <div className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-md font-bold border border-emerald-300">
                                  Total Belanja ({p.qty || 1} {p.defaultUnit}): <strong className="text-emerald-900 font-black">{formatRupiah(best.price * (p.qty || 1))}</strong>
                                </div>
                                <span className="text-slate-300">•</span>
                                <div>
                                  Rekomendasi Jual: <strong className="text-slate-900 font-bold">{formatRupiah(bestSelling)}</strong> (Total: {formatRupiah(bestSelling * (p.qty || 1))})
                                </div>
                                {(p.hasMultiUnits !== false && (p.subUnitCount ? p.subUnitCount > 1 : true)) && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <div className="text-slate-500">
                                      ~{formatRupiah(bestPricePerSub)} / {p.subUnitName || 'lembar'}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {p.supplierCount > 1 && highest && highest.supplierName !== best.supplierName && (
                            <div className="text-xs bg-white/90 border border-emerald-200 px-3 py-2 rounded-xl text-emerald-950 shrink-0 self-start md:self-center shadow-2xs">
                              <span className="font-semibold block text-[10px] text-slate-500">Dibandingkan Vendor Termahal:</span>
                              <span className="font-bold text-xs text-emerald-900">
                                Lebih hemat {formatRupiah(p.priceDifference * (p.qty || 1))} vs {highest.supplierName} ({formatRupiah(highest.price * (p.qty || 1))})
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Unmatched / No Quotes Warning & Manual Connector */
                        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2.5">
                          <div className="flex items-center gap-2 font-bold text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Item ini belum terhubung dengan penawaran supplier di Kartu Produk.</span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Pilih produk yang sesuai dari katalog apotek Anda untuk langsung menarik seluruh perbandingan harga supplier:
                          </p>
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <select
                              onChange={(e) => {
                                if (e.target.value) handleLinkProduct(p.productName, e.target.value);
                              }}
                              className="bg-white border border-amber-300 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                            >
                              <option value="">-- Pilih Produk dari Katalog Apotek --</option>
                              {products.map((prod) => (
                                <option key={prod.id} value={prod.id}>
                                  {prod.name} ({prod.company || '-'}) • {prod.quotes.length} Supplier
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-slate-500">
                              (Harga dan satuan otomatis disesuaikan dari kartu produk)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* All Supplier Quotes Breakdown Grid */}
                      {p.quotes.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Perbandingan Harga Seluruh Supplier (Kebutuhan: {p.qty || 1} {p.defaultUnit}):
                            </p>
                            <span className="text-[11px] text-slate-500">
                              {p.quotes.length} Penawaran Tersedia
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {p.quotes.map((q, qIdx) => {
                              const isCheapest = qIdx === 0;
                              const diffFromCheapest = q.price - (best?.price || 0);
                              const diffPercent = best?.price
                                ? Math.round((diffFromCheapest / best.price) * 100)
                                : 0;
                              const totalOrderForThisSupplier = q.price * (p.qty || 1);

                              return (
                                <div
                                  key={qIdx}
                                  className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all ${
                                    isCheapest
                                      ? 'bg-emerald-50/70 border-emerald-300 font-medium text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <div className="min-w-0 flex items-center gap-2">
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                        isCheapest
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {qIdx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="font-bold truncate text-slate-900">{q.supplierName}</p>
                                      <p className="text-[10px] text-slate-500">
                                        Satuan: {formatRupiah(q.price)} / {p.defaultUnit}
                                      </p>
                                      {q.notes && (
                                        <p className="text-[10px] text-slate-500 truncate">{q.notes}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span
                                      className={`block font-black text-xs ${
                                        isCheapest ? 'text-emerald-800 text-sm' : 'text-slate-900'
                                      }`}
                                    >
                                      {formatRupiah(totalOrderForThisSupplier)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block">
                                      untuk {p.qty || 1} {p.defaultUnit}
                                    </span>
                                    {isCheapest ? (
                                      <span className="text-[10px] font-bold text-emerald-700">👑 Termurah</span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-rose-600">
                                        +{formatRupiah(diffFromCheapest * (p.qty || 1))} (+{diffPercent}%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW MODE 2: MATRIX TABLE */}
          {displayMode === 'matrix' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="p-3 font-bold">Produk & Pabrik</th>
                      <th className="p-3 font-bold">Qty & Satuan</th>
                      <th className="p-3 font-bold">Supplier Termurah</th>
                      <th className="p-3 font-bold text-right">Modal Satuan</th>
                      <th className="p-3 font-bold text-right">Total Belanja (Termurah)</th>
                      <th className="p-3 font-bold text-right">Estimasi Jual (+{settings.marginPercent}%)</th>
                      <th className="p-3 font-bold text-center">Jumlah Supplier</th>
                      <th className="p-3 font-bold text-right">Potensi Hemat Order</th>
                      <th className="p-3 font-bold">Rincian Seluruh Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedFilteredProducts.map((p, idx) => {
                      const best = p.cheapestQuote;
                      const pQty = p.qty || 1;
                      const selling = best ? calculateSellingPrice(best.price, settings).sellingPrice : 0;
                      const totalOrderCheapest = best ? best.price * pQty : 0;
                      const totalOrderSavings = p.priceDifference * pQty;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium text-slate-900">
                            <div>
                              <p className="font-bold text-xs">{p.productName}</p>
                              {p.company && (
                                <p className="text-[10px] text-slate-500">Pabrik: {p.company}</p>
                              )}
                              {p.isFromCatalog && (
                                <span className="inline-block mt-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  ✓ Kartu Produk
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-slate-700">
                            <span className="font-black text-slate-900">{pQty}</span> {p.defaultUnit}
                            {p.packaging && <p className="text-[10px] text-slate-400">{p.packaging}</p>}
                          </td>
                          <td className="p-3 font-bold text-emerald-800">
                            {best ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                                👑 {best.supplierName}
                              </span>
                            ) : (
                              <span className="text-amber-700 font-normal">Belum ada penawaran</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {best ? formatRupiah(best.price) : '-'}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-900 text-sm">
                            {best ? formatRupiah(totalOrderCheapest) : '-'}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {best ? formatRupiah(selling * pQty) : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.supplierCount > 1
                                  ? 'bg-blue-100 text-blue-900'
                                  : p.supplierCount === 1
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {p.supplierCount} Supplier
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold">
                            {totalOrderSavings > 0 ? (
                              <span className="text-emerald-700 font-black">
                                {formatRupiah(totalOrderSavings)}{' '}
                                <span className="text-[10px]">(-{p.savingsPercentage}%)</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 max-w-xs truncate text-[11px]">
                            {p.quotes.map((q) => `${q.supplierName}: ${formatRupiah(q.price * pQty)}`).join(' | ') || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: RAW DATA VERIFICATION */}
          {displayMode === 'raw' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-xs text-slate-700">
                  Daftar Seluruh Baris yang Diekstrak dari Excel ({parseResult.parsedQuotes.length} Baris Penawaran)
                </h4>
                <span className="text-[11px] text-slate-500">
                  Data siap disimpan ke database
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {paginatedRawQuotes.map((q, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {q.name}{' '}
                        {q.company && <span className="text-slate-500 font-normal">({q.company})</span>}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Supplier: <strong className="text-slate-700">{q.supplierName}</strong> • Kemasan: {q.packaging || '-'} • Satuan: {q.defaultUnit}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 text-xs block">
                        {formatRupiah(q.price)}
                      </span>
                      <span className="text-[10px] text-slate-500">MOQ: {q.moq || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Controls for Compare Views */}
          <Pagination
            currentPage={comparePage}
            totalItems={displayMode === 'raw' ? parseResult.parsedQuotes.length : filteredProducts.length}
            pageSize={comparePageSize}
            pageSizeOptions={[10, 20, 30, 50, 100, 'all']}
            onPageChange={setComparePage}
            onPageSizeChange={setComparePageSize}
            itemLabel={displayMode === 'raw' ? 'baris penawaran' : 'produk komparasi'}
          />

          {/* Bottom Confirmation Card: Apply to Main Catalog */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Simpan Hasil Komparasi ke Katalog Utama?</span>
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Pilih apakah data ini akan digabungkan dengan katalog obat yang sudah ada, atau menggantikan seluruh katalog lama. Data akan langsung tersimpan di database Cloud dan siap diakses di seluruh menu.
              </p>

              {/* Mode Gabung / Timpa */}
              <div className="flex items-center gap-4 mt-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="compareImportMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <strong>Gabungkan (Merge)</strong> — Direkomendasikan
                  </span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="compareImportMode"
                    value="overwrite"
                    checked={importMode === 'overwrite'}
                    onChange={() => setImportMode('overwrite')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    <strong>Ganti Seluruh Katalog (Overwrite)</strong>
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              {onNavigateToMatrix && (
                <button
                  type="button"
                  onClick={onNavigateToMatrix}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                >
                  Buka Matriks Harga
                </button>
              )}

              <button
                type="button"
                onClick={handleApplyToCatalog}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white transition-all cursor-pointer shadow-md hover:shadow-lg"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Terapkan ke Katalog Utama</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
