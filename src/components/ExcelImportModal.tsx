import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  FileCheck,
  RefreshCw,
  ArrowRight,
  Building2, 
  Package, 
  Sparkles,
  Check,
  Layers,
  FileText,
  Phone,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  Trophy,
  Award,
  Copy,
  Search,
  Zap,
  TrendingDown,
  Tag
} from 'lucide-react';
import { 
  parseExcelUpload, 
  downloadCompleteExcelTemplate, 
  downloadProductOnlyTemplate,
  downloadSupplierOnlyTemplate,
  getSampleExcelData,
  groupImportedQuotesByProduct,
  ImportedProductComparison,
  ExcelParseResult 
} from '../utils/excelUtils';
import { formatRupiah, calculateSellingPrice } from '../utils/formatters';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (
    parsedResult: ExcelParseResult, 
    importMode: 'merge' | 'overwrite'
  ) => void;
  settings?: AppSettings;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
  settings = DEFAULT_APP_SETTINGS,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeScreenTab, setActiveScreenTab] = useState<'upload' | 'templates' | 'guide'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [previewTab, setPreviewTab] = useState<'comparison' | 'products' | 'suppliers'>('comparison');
  const [comparisonSearchQuery, setComparisonSearchQuery] = useState('');
  const [comparisonFilter, setComparisonFilter] = useState<'all' | 'multi' | 'highest_savings'>('all');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSampleDataLoaded, setIsSampleDataLoaded] = useState(false);
  const [showColumnDetails, setShowColumnDetails] = useState(false);

  const handleFileChange = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsSampleDataLoaded(false);
    setIsParsing(true);
    setParseResult(null);

    try {
      const res = await parseExcelUpload(file);
      setParseResult(res);
      if (res.parsedQuotes.length > 0) {
        setPreviewTab('comparison');
      } else if (res.parsedSuppliers.length > 0) {
        setPreviewTab('suppliers');
      } else {
        setPreviewTab('products');
      }
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setParseResult({
        parsedQuotes: [],
        parsedSuppliers: [],
        errors: [`Gagal membaca file: ${err?.message || 'Format tidak didukung'}`],
        warnings: [],
        sheetNames: [],
        totalRows: 0,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadSampleData = () => {
    setIsParsing(true);
    setTimeout(() => {
      const sample = getSampleExcelData();
      setParseResult(sample);
      setIsSampleDataLoaded(true);
      setSelectedFile(new File(['sample'], 'Data_Contoh_Farmasi.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      setPreviewTab('comparison');
      setIsParsing(false);
    }, 250);
  };

  // Group quotes by product to enable quick side-by-side comparison & recommendation
  const groupedProducts = useMemo(() => {
    if (!parseResult || !parseResult.parsedQuotes) return [];
    return groupImportedQuotesByProduct(parseResult.parsedQuotes);
  }, [parseResult]);

  // Summary statistics of comparison
  const comparisonStats = useMemo(() => {
    let totalSavingsPotential = 0;
    let multiSupplierCount = 0;
    const supplierCheapestCount: Record<string, number> = {};

    groupedProducts.forEach((p) => {
      if (p.supplierCount > 1) {
        multiSupplierCount++;
        totalSavingsPotential += p.priceDifference;
      }
      if (p.cheapestQuote && p.cheapestQuote.supplierName) {
        const sName = p.cheapestQuote.supplierName;
        supplierCheapestCount[sName] = (supplierCheapestCount[sName] || 0) + 1;
      }
    });

    const topSuppliers = Object.entries(supplierCheapestCount)
      .sort((a, b) => b[1] - a[1]);

    return {
      totalSavingsPotential,
      multiSupplierCount,
      topSuppliers,
    };
  }, [groupedProducts]);

  // Filtered comparison list based on search and selected filter
  const filteredGroupedProducts = useMemo(() => {
    let list = groupedProducts;

    if (comparisonSearchQuery.trim()) {
      const q = comparisonSearchQuery.toLowerCase().trim();
      list = list.filter((p) => 
        p.productName.toLowerCase().includes(q) ||
        (p.company && p.company.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        p.quotes.some((quote) => quote.supplierName.toLowerCase().includes(q))
      );
    }

    if (comparisonFilter === 'multi') {
      list = list.filter((p) => p.supplierCount > 1);
    } else if (comparisonFilter === 'highest_savings') {
      list = list.filter((p) => p.priceDifference > 0);
    }

    return list;
  }, [groupedProducts, comparisonSearchQuery, comparisonFilter]);

  // Copy recommendation summary to clipboard
  const handleCopySummary = () => {
    if (groupedProducts.length === 0) return;
    const dateStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' });
    let text = `📋 REKOMENDASI HARGA SUPPLIER TERMURAH (IMPORT EXCEL)\n`;
    text += `Tanggal: ${dateStr}\n`;
    text += `Total Produk Dianalisis: ${groupedProducts.length} Produk\n`;
    text += `Potensi Penghematan Tertinggi: ${formatRupiah(comparisonStats.totalSavingsPotential)}\n\n`;

    groupedProducts.forEach((p, idx) => {
      text += `${idx + 1}. ${p.productName}${p.company ? ` (${p.company})` : ''}\n`;
      if (p.cheapestQuote) {
        const sellingPrice = calculateSellingPrice(p.cheapestQuote.price, settings).sellingPrice;
        text += `   👑 REKOMENDASI TERMURAH: ${p.cheapestQuote.supplierName}\n`;
        text += `   • Modal Beli: ${formatRupiah(p.cheapestQuote.price)} / ${p.defaultUnit}\n`;
        text += `   • Rekomendasi Jual: ${formatRupiah(sellingPrice)} (+${settings.marginPercent}%)\n`;
        if (p.supplierCount > 1 && p.priceDifference > 0) {
          text += `   • Penghematan: Hemat ${formatRupiah(p.priceDifference)} (-${p.savingsPercentage}%) vs ${p.highestQuote?.supplierName || 'vendor lain'}\n`;
        }
      }
      if (p.supplierCount > 1) {
        const others = p.quotes.map(q => `${q.supplierName}: ${formatRupiah(q.price)}`).join(', ');
        text += `   • Semua Penawaran: ${others}\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setIsSampleDataLoaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApply = () => {
    if (!parseResult) return;
    onConfirmImport(parseResult, importMode);
    handleReset();
    onClose();
  };

  const hasQuotes = Boolean(parseResult && parseResult.parsedQuotes.length > 0);
  const hasSuppliers = Boolean(parseResult && parseResult.parsedSuppliers.length > 0);
  const hasErrors = Boolean(parseResult && parseResult.errors.length > 0);

  const uniqueSupplierCount = parseResult
    ? (parseResult.parsedSuppliers.length > 0 
        ? parseResult.parsedSuppliers.length 
        : new Set(parseResult.parsedQuotes.map(q => q.supplierName).filter(Boolean)).size)
    : 0;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={() => {
        handleReset();
        onClose();
      }}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full sm:max-w-2xl lg:max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Import Data Excel / CSV
                </h2>
                <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Produk & Supplier
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah katalog obat, harga supplier, dan kontak PBF
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 active:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            aria-label="Tutup modal import"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Screen Tabs (Thumb-Friendly on Mobile) */}
        {!selectedFile && (
          <div className="px-3 sm:px-6 pt-3 pb-1 border-b border-slate-200 bg-white shrink-0">
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveScreenTab('upload')}
                className={`py-2 px-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeScreenTab === 'upload'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unggah File</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreenTab('templates')}
                className={`py-2 px-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeScreenTab === 'templates'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Template</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreenTab('guide')}
                className={`py-2 px-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeScreenTab === 'guide'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Petunjuk</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: UPLOAD / PREVIEW */}
          {activeScreenTab === 'upload' && (
            <>
              {!selectedFile ? (
                <div className="space-y-4">
                  {/* Big Touchable Mobile Upload Card */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                        : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50 active:bg-slate-100 bg-slate-50/40'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-xs">
                      <Upload className="w-7 h-7" />
                    </div>
                    
                    <p className="text-base sm:text-lg font-bold text-slate-800">
                      Pilih File Excel / CSV
                    </p>
                    
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Ambil dari folder <strong>Unduhan</strong>, <strong>WhatsApp Documents</strong>, atau memori perangkat
                    </p>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 active:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-200 cursor-pointer min-h-[48px]"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Buka File dari HP / Komputer</span>
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                      <span>Format yang didukung:</span>
                      <span className="font-semibold text-slate-600">.XLSX</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-600">.XLS</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-600">.CSV</span>
                    </div>
                  </div>

                  {/* Quick Try Sample Button for Mobile Users */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-950">
                          Belum Punya File di HP?
                        </p>
                        <p className="text-[11px] text-amber-800/90 mt-0.5">
                          Uji coba fitur import seketika dengan 5 produk & 4 supplier contoh.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadSampleData}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 active:bg-amber-400 rounded-xl transition-colors cursor-pointer w-full xs:w-auto min-h-[40px] shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Coba Data Contoh (1-Klik)</span>
                    </button>
                  </div>

                  {/* Need Template Shortcut */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Download className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Butuh Template File Excel Kosong?
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Unduh format resmi dengan kolom standar farmasi
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveScreenTab('templates')}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 rounded-lg shadow-2xs shrink-0 cursor-pointer"
                    >
                      Buka Template
                    </button>
                  </div>
                </div>
              ) : (
                /* FILE ALREADY SELECTED -> PREVIEW & CONFIRMATION */
                <div className="space-y-4">
                  {/* File Info Bar with Replace Button */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-2xl border border-slate-200 gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {selectedFile.name}
                          </p>
                          {isSampleDataLoaded && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-md">
                              Data Contoh
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {parseResult?.sheetNames.length || 1} sheet terdeteksi
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white active:bg-slate-200 px-3 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden xs:inline">Ganti File</span>
                    </button>
                  </div>

                  {/* Loader when parsing */}
                  {isParsing && (
                    <div className="py-10 text-center text-slate-600 text-xs sm:text-sm flex flex-col items-center justify-center gap-2.5">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="font-semibold">Membaca dan memverifikasi baris Excel...</span>
                    </div>
                  )}

                  {/* Errors message if any */}
                  {hasErrors && parseResult && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Format file tidak terbaca sempurna:</span>
                      </div>
                      {parseResult.errors.map((err, i) => (
                        <p key={i} className="text-[11px] text-rose-700 pl-6 leading-relaxed">
                          • {err}
                        </p>
                      ))}
                      <p className="text-[11px] text-rose-800 pt-1 font-semibold pl-6">
                        Saran: Unduh template resmi di tab "Template" lalu sesuaikan format kolom Anda.
                      </p>
                    </div>
                  )}

                  {/* Successful Parse Statistics & Preview */}
                  {parseResult && !hasErrors && (
                    <div className="space-y-4">
                      
                      {/* Compact KPIs Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-center">
                          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Produk & Harga</p>
                          <p className="text-lg font-black text-emerald-950 mt-0.5">{parseResult.parsedQuotes.length}</p>
                          <p className="text-[9px] text-emerald-700">item penawaran</p>
                        </div>
                        <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl text-center">
                          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Supplier PBF</p>
                          <p className="text-lg font-black text-blue-950 mt-0.5">{uniqueSupplierCount}</p>
                          <p className="text-[9px] text-blue-700">vendor terdeteksi</p>
                        </div>
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Baris</p>
                          <p className="text-lg font-black text-slate-900 mt-0.5">{parseResult.totalRows}</p>
                          <p className="text-[9px] text-slate-500">baris di Excel</p>
                        </div>
                      </div>

                      {/* Verification Checklist Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 font-medium">Terverifikasi:</span>
                        {hasQuotes && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                            <Check className="w-3 h-3 text-emerald-700" />
                            Kolom Produk & Harga
                          </span>
                        )}
                        {hasSuppliers && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-[10px]">
                            <Check className="w-3 h-3 text-blue-700" />
                            Master Kontak Supplier
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-semibold text-[10px]">
                          {parseResult.sheetNames.join(', ')}
                        </span>
                      </div>

                      {/* Preview Container */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                        {/* Preview Tabs */}
                        <div className="flex items-center justify-between bg-slate-100 p-1.5 border-b border-slate-200 flex-wrap gap-1">
                          <div className="flex items-center gap-1 w-full sm:w-auto flex-wrap">
                            {hasQuotes && (
                              <button
                                type="button"
                                onClick={() => setPreviewTab('comparison')}
                                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                  previewTab === 'comparison'
                                    ? 'bg-emerald-700 text-white shadow-xs ring-1 ring-emerald-800'
                                    : 'text-slate-700 hover:text-slate-900 bg-emerald-50/70'
                                }`}
                              >
                                <Trophy className={`w-3.5 h-3.5 ${previewTab === 'comparison' ? 'text-amber-300' : 'text-emerald-700'}`} />
                                <span>Perbandingan & Rekomendasi ({groupedProducts.length})</span>
                              </button>
                            )}
                            {hasQuotes && (
                              <button
                                type="button"
                                onClick={() => setPreviewTab('products')}
                                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  previewTab === 'products'
                                    ? 'bg-white text-emerald-950 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Semua Baris ({parseResult.parsedQuotes.length})
                              </button>
                            )}
                            {hasSuppliers && (
                              <button
                                type="button"
                                onClick={() => setPreviewTab('suppliers')}
                                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  previewTab === 'suppliers'
                                    ? 'bg-white text-emerald-950 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Supplier ({parseResult.parsedSuppliers.length})
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 hidden sm:inline mr-2">
                            Analisis & Rekomendasi PBF
                          </span>
                        </div>

                        {/* PREVIEW TAB 1: QUICK COMPARISON & CHEAPEST RECOMMENDATIONS */}
                        {previewTab === 'comparison' && hasQuotes && (
                          <div className="p-3 sm:p-4 space-y-3.5 max-h-[380px] sm:max-h-[440px] overflow-y-auto">
                            
                            {/* Comparison Metric Overview */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gradient-to-br from-emerald-50 to-teal-50/70 p-3 rounded-xl border border-emerald-200/80">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                                  <Package className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-emerald-900 uppercase">Produk Dibandingkan</p>
                                  <p className="text-sm font-black text-emerald-950">
                                    {groupedProducts.length} Produk <span className="text-[11px] font-normal text-emerald-700">({comparisonStats.multiSupplierCount} multi-vendor)</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                                  <TrendingDown className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-teal-900 uppercase">Potensi Penghematan</p>
                                  <p className="text-sm font-black text-teal-950">
                                    {formatRupiah(comparisonStats.totalSavingsPotential)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 sm:border-l sm:border-emerald-200/80 sm:pl-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                                  <Trophy className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold text-amber-950 uppercase">Peringkat Supplier Termurah</p>
                                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 mt-0.5">
                                    {comparisonStats.topSuppliers.length > 0 ? (
                                      comparisonStats.topSuppliers.slice(0, 2).map(([sName, count], sIdx) => (
                                        <span key={sIdx} className="text-[10px] font-bold bg-white text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap">
                                          {sName}: <span className="text-emerald-700">{count}x</span>
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[11px] text-slate-500">-</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Search & Quick Actions Bar */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                              <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={comparisonSearchQuery}
                                  onChange={(e) => setComparisonSearchQuery(e.target.value)}
                                  placeholder="Cari obat, pabrik, atau supplier..."
                                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                <button
                                  type="button"
                                  onClick={() => setComparisonFilter('all')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                                    comparisonFilter === 'all'
                                      ? 'bg-slate-800 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Semua ({groupedProducts.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setComparisonFilter('multi')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                                    comparisonFilter === 'multi'
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  }`}
                                >
                                  Multi-Vendor ({comparisonStats.multiSupplierCount})
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCopySummary}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 whitespace-nowrap transition-colors ml-auto shadow-2xs"
                                  title="Salin ringkasan rekomendasi termurah"
                                >
                                  {copiedSummary ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-700">Tersalin!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Salin Rangkuman</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Comparison Cards List */}
                            <div className="space-y-3">
                              {filteredGroupedProducts.length === 0 ? (
                                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  <p className="text-xs text-slate-500">Tidak ada produk yang cocok dengan pencarian filter.</p>
                                </div>
                              ) : (
                                filteredGroupedProducts.map((p, idx) => {
                                  const bestQuote = p.cheapestQuote;
                                  const sellingPrice = bestQuote ? calculateSellingPrice(bestQuote.price, settings).sellingPrice : 0;
                                  const subPrice = bestQuote ? (bestQuote.pricePerSubUnit || Math.round(bestQuote.price / (p.subUnitCount || 10))) : 0;
                                  const hasMultipleVendors = p.supplierCount > 1;

                                  return (
                                    <div key={idx} className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
                                      {/* Product Header */}
                                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                              {p.productName}
                                            </h4>
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                              {p.category}
                                            </span>
                                            {hasMultipleVendors ? (
                                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                                {p.supplierCount} Penawaran Supplier
                                              </span>
                                            ) : (
                                              <span className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                                1 Supplier
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                                            {p.company && (
                                              <span className="text-slate-700 font-medium">
                                                Pabrik: {p.company}
                                              </span>
                                            )}
                                            {p.packaging && (
                                              <span>• Kemasan: {p.packaging}</span>
                                            )}
                                            <span>• Satuan: {p.defaultUnit}</span>
                                          </div>
                                        </div>

                                        {hasMultipleVendors && p.priceDifference > 0 && (
                                          <div className="text-right shrink-0 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                                              Selisih Hemat
                                            </span>
                                            <span className="text-xs font-black text-emerald-800">
                                              {formatRupiah(p.priceDifference)} <span className="text-[10px] font-bold">(-{p.savingsPercentage}%)</span>
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Recommendation Highlight Banner */}
                                      {bestQuote && (
                                        <div className="mt-2.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                          <div className="flex items-start gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                              <Trophy className="w-3.5 h-3.5 text-amber-300" />
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                                  Rekomendasi Termurah
                                                </span>
                                                <span className="text-xs font-black text-slate-900">
                                                  {bestQuote.supplierName}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 flex-wrap">
                                                <span>Modal Beli: <strong className="text-emerald-700 font-black">{formatRupiah(bestQuote.price)}</strong>/{p.defaultUnit}</span>
                                                <span>•</span>
                                                <span>Estimasi Jual (+{settings.marginPercent}%): <strong className="text-slate-800 font-bold">{formatRupiah(sellingPrice)}</strong></span>
                                                <span>•</span>
                                                <span className="text-slate-500">~{formatRupiah(subPrice)}/{p.subUnitName}</span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                            {hasMultipleVendors && p.highestQuote && p.highestQuote.supplierName !== bestQuote.supplierName && (
                                              <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-1 rounded-md font-semibold">
                                                Lebih murah dari {p.highestQuote.supplierName} ({formatRupiah(p.highestQuote.price)})
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Full Supplier Comparison Breakdown */}
                                      {hasMultipleVendors && (
                                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                            Perbandingan Semua Supplier:
                                          </p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                            {p.quotes.map((q, qIdx) => {
                                              const isBest = qIdx === 0;
                                              const diffFromBest = q.price - (bestQuote?.price || 0);
                                              const diffPercent = bestQuote?.price ? Math.round((diffFromBest / bestQuote.price) * 100) : 0;

                                              return (
                                                <div 
                                                  key={qIdx} 
                                                  className={`p-2 rounded-lg text-xs flex items-center justify-between gap-1.5 border ${
                                                    isBest 
                                                      ? 'bg-emerald-50/60 border-emerald-300 font-bold text-emerald-950' 
                                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                                  }`}
                                                >
                                                  <div className="min-w-0 flex items-center gap-1.5">
                                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                                                      isBest ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-200 text-slate-700'
                                                    }`}>
                                                      {qIdx + 1}
                                                    </span>
                                                    <span className="truncate font-semibold text-[11px]">{q.supplierName}</span>
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <span className={`block font-bold text-xs ${isBest ? 'text-emerald-800' : 'text-slate-800'}`}>
                                                      {formatRupiah(q.price)}
                                                    </span>
                                                    {isBest ? (
                                                      <span className="text-[9px] text-emerald-700 font-bold">👑 Termurah</span>
                                                    ) : (
                                                      <span className="text-[9px] text-rose-600 font-medium">
                                                        +{formatRupiah(diffFromBest)} (+{diffPercent}%)
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
                          </div>
                        )}

                        {/* PREVIEW TAB 2: RAW PRODUCTS CARDS (Mobile First) */}
                        {previewTab === 'products' && hasQuotes && (
                          <div className="p-2.5 sm:p-3 space-y-2 max-h-56 sm:max-h-64 overflow-y-auto divide-y divide-slate-100">
                            {parseResult.parsedQuotes.slice(0, 15).map((q, idx) => (
                              <div key={idx} className="pt-2 first:pt-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-xs text-slate-900 leading-snug">
                                      {q.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                      <span className="bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                                        {q.supplierName || 'PBF'}
                                      </span>
                                      {q.company && (
                                        <span className="text-slate-600 font-medium">
                                          {q.company}
                                        </span>
                                      )}
                                      <span>•</span>
                                      <span className="text-slate-600">{q.defaultUnit || 'Box'}</span>
                                      {q.packaging && (
                                        <span className="text-slate-400">({q.packaging})</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-black text-xs text-emerald-700 block">
                                      {q.price > 0 ? formatRupiah(q.price) : '-'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      MOQ: {q.moq || 1}
                                    </span>
                                  </div>
                                </div>
                                {q.notes && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 italic truncate">
                                    {q.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                            {parseResult.parsedQuotes.length > 15 && (
                              <div className="pt-2 text-center">
                                <span className="inline-block text-[11px] text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
                                  + {parseResult.parsedQuotes.length - 15} data produk lainnya siap diimpor
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* PREVIEW TAB 3: SUPPLIERS CARDS */}
                        {previewTab === 'suppliers' && hasSuppliers && (
                          <div className="p-2.5 sm:p-3 space-y-2 max-h-56 sm:max-h-64 overflow-y-auto divide-y divide-slate-100">
                            {parseResult.parsedSuppliers.slice(0, 15).map((s, idx) => (
                              <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <p className="font-bold text-xs text-slate-900 leading-snug">
                                      {s.name}
                                    </p>
                                  </div>
                                  <p className="text-[11px] text-slate-600 mt-0.5">
                                    {s.contactPerson ? `${s.contactPerson} • ` : ''}{s.phone || s.email || 'Tanpa Kontak'}
                                  </p>
                                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                                    Syarat Pembayaran: {s.paymentTerms || 'Tempo 30 Hari'}
                                  </p>
                                </div>
                                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
                                  ★ {s.rating || 5}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Mobile Import Mode Selection */}
                      <div className="space-y-2 pt-1">
                        <label className="block text-xs font-bold text-slate-800">
                          Pilih Mode Penggabungan Data:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label 
                            className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                              importMode === 'merge'
                                ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="importMode"
                              value="merge"
                              checked={importMode === 'merge'}
                              onChange={() => setImportMode('merge')}
                              className="mt-1 text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900">
                                  Gabungkan & Perbarui
                                </p>
                                <span className="text-[9px] font-bold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded">
                                  Aman
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                Data yang sudah ada tetap aman. Menambah produk baru atau mengupdate harga jika supplier sama.
                              </p>
                            </div>
                          </label>

                          <label 
                            className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                              importMode === 'overwrite'
                                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="importMode"
                              value="overwrite"
                              checked={importMode === 'overwrite'}
                              onChange={() => setImportMode('overwrite')}
                              className="mt-1 text-amber-600 focus:ring-amber-500 w-4 h-4 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900">
                                  Gantikan Seluruh Data
                                </p>
                                <span className="text-[9px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded">
                                  Reset
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                Menghapus katalog lama dan menggantikannya murni dengan isi file Excel ini.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: DOWNLOAD TEMPLATES */}
          {activeScreenTab === 'templates' && (
            <div className="space-y-3.5">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <p className="text-xs font-bold text-slate-800">
                  Unduh Template Excel Siap Pakai
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Pilih salah satu template di bawah, isi datanya di Microsoft Excel atau Google Spreadsheet di HP Anda, lalu unggah kembali ke aplikasi.
                </p>
              </div>

              {/* Template Option 1: Complete */}
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.2 rounded">
                      Paling Lengkap (Disarankan)
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                      Template Lengkap: Produk & Supplier
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Berisi sheet Produk, sheet Master Supplier, dan lembar Panduan pengisian resmi.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadCompleteExcelTemplate}
                  className="w-full xs:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer shrink-0 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh (.xlsx)</span>
                </button>
              </div>

              {/* Template Option 2: Products Only */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Template Khusus: Produk & Harga Penawaran
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Format ringkas kolom: Nama Obat, Pabrik, Kemasan, HNA, Diskon, Harga Jadi, dan Vendor.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadProductOnlyTemplate}
                  className="w-full xs:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 active:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer shrink-0 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh (.xlsx)</span>
                </button>
              </div>

              {/* Template Option 3: Suppliers Only */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Template Khusus: Master Supplier & Kontak
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Khusus mendaftarkan nama PBF, sales WhatsApp, alamat gudang, syarat tempo & rating.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSupplierOnlyTemplate}
                  className="w-full xs:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer shrink-0 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh (.xlsx)</span>
                </button>
              </div>

              {/* Back to Upload button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreenTab('upload')}
                  className="w-full py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 cursor-pointer"
                >
                  ← Sudah Isi File? Kembali ke Menu Unggah
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GUIDE & FLEXIBLE COLUMN REFERENCE */}
          {activeScreenTab === 'guide' && (
            <div className="space-y-3.5 text-xs">
              <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Sistem Cerdas Pengenalan Kolom</span>
                </div>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Aplikasi ini sangat fleksibel! Anda tidak perlu khawatir jika nama kolom sedikit berbeda dari template. Sistem otomatis mengenali sinonim bahasa Indonesia maupun istilah farmasi.
                </p>
              </div>

              {/* Column Synonym Cards */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                <div className="p-3">
                  <p className="font-bold text-slate-900 text-xs">Kolom Produk yang Dikenali:</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>Nama Produk / Obat *</strong> (atau: <em>Item, Nama Barang, Nama Obat</em>)<br/>
                    <strong>Pabrik / Company</strong> (atau: <em>Produsen, Industri Farmasi, Principal</em>)<br/>
                    <strong>Kemasan & Isi</strong> (atau: <em>Isi Kemasan, Satuan Pecahan, Kemasan Box</em>)<br/>
                    <strong>Kategori</strong> (atau: <em>Golongan Obat, Kategori Produk</em>)
                  </p>
                </div>

                <div className="p-3">
                  <p className="font-bold text-slate-900 text-xs">Kolom Harga & Penawaran:</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>Nama Supplier *</strong> (atau: <em>PBF, Vendor, Distributor, Sumber</em>)<br/>
                    <strong>HARGA JADI Box (Rp) *</strong> (atau: <em>Harga Netto, Harga, Price</em>)<br/>
                    <strong>HNA (Rp) & Diskon (%)</strong> (otomatis dihitung jika diisi)<br/>
                    <strong>MOQ</strong> (Minimal Order Quantity) & <strong>Lead Time</strong>
                  </p>
                </div>

                <div className="p-3">
                  <p className="font-bold text-slate-900 text-xs">Kolom Master Supplier:</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>Nama Supplier</strong>, <strong>Kontak Person</strong>, <strong>No. HP / WhatsApp</strong>, <strong>Syarat Pembayaran (TOP)</strong>, <strong>Alamat</strong>.
                  </p>
                </div>
              </div>

              {/* Back to Upload button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreenTab('upload')}
                  className="w-full py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 cursor-pointer"
                >
                  ← Siap Mengunggah? Kembali ke Menu Unggah
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Sticky Footer - Mobile Accessible with Safe Padding */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-white sm:bg-slate-50/90 shrink-0 gap-2.5 pb-safe">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 active:bg-slate-200 rounded-xl transition-colors cursor-pointer min-h-[44px]"
          >
            Batal
          </button>

          {selectedFile && parseResult && !hasErrors && (hasQuotes || hasSuppliers) ? (
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold text-white bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer min-h-[46px]"
            >
              <span>Impor {parseResult.parsedQuotes.length} Produk & {uniqueSupplierCount} Supplier</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (activeScreenTab !== 'upload') {
                  setActiveScreenTab('upload');
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-100 active:bg-emerald-200 rounded-xl transition-colors cursor-pointer min-h-[44px]"
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>Pilih File Excel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
