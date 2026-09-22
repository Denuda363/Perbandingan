import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  LayoutGrid, 
  Table2, 
  Calculator, 
  Users, 
  Plus, 
  Download, 
  Search, 
  X,
  TrendingDown,
  FileSpreadsheet,
  Upload,
  ChevronDown,
  Smartphone
} from 'lucide-react';
import { ViewMode } from '../types';
import { CloudSyncStatus } from './CloudSyncStatus';

interface NavbarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddProduct: () => void;
  onOpenAddQuote: () => void;
  onOpenImportExcel: () => void;
  onDownloadTemplate: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  productCount: number;
  onOpenInstallModal?: () => void;
  syncStatus?: 'connected' | 'syncing' | 'offline' | 'error';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  onOpenAddProduct,
  onOpenAddQuote,
  onOpenImportExcel,
  onDownloadTemplate,
  onExportExcel,
  onExportCSV,
  productCount,
  onOpenInstallModal,
  syncStatus = 'connected',
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMobileExcelSheetOpen, setIsMobileExcelSheetOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-sm shadow-emerald-200 border border-emerald-500/30 shrink-0 bg-emerald-700">
              <img
                src="/pwa-192x192.png"
                alt="Logo HargaVendor"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-lg text-slate-900 tracking-tight leading-none">
                  HargaVendor
                </span>
                <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 sm:px-2 py-0.5 rounded-full hidden xs:inline-block">
                  Komparator
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block mt-0.5">
                Perbandingan Harga Multi-Supplier
              </p>
            </div>
          </div>

          {/* Search Bar - Desktop & Tablet */}
          <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md mx-2 lg:mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="search-input-desktop"
                type="text"
                placeholder="Cari produk (Paracetamol), supplier (PT Aman Farma)..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  id="btn-clear-search"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Realtime Cloud Status */}
            <CloudSyncStatus status={syncStatus} />

            {/* Install PWA Button */}
            {onOpenInstallModal && (
              <button
                id="btn-nav-install-pwa"
                onClick={onOpenInstallModal}
                title="Pasang aplikasi di Smartphone / Layar Utama"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-xs font-bold text-emerald-950 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300/80 rounded-lg transition-all cursor-pointer shadow-2xs group"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-700 group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden sm:inline">Pasang di HP</span>
                <span className="sm:hidden">App</span>
              </button>
            )}

            {/* Mobile Excel Actions Button */}
            <button
              id="btn-mobile-excel"
              onClick={() => setIsMobileExcelSheetOpen(true)}
              className="sm:hidden inline-flex items-center justify-center w-9 h-9 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              title="Menu Excel: Import, Template & Ekspor"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            </button>

            {/* Import Excel Button (Desktop / Tablet) */}
            <button
              id="btn-import-excel"
              onClick={onOpenImportExcel}
              title="Import data produk dan supplier dari file Excel"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Import Excel</span>
            </button>

            {/* Download Template Excel Quick Button */}
            <button
              id="btn-nav-template"
              onClick={onDownloadTemplate}
              title="Download template format file Excel resmi"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Template</span>
            </button>

            {/* Export Dropdown Button */}
            <div className="relative" ref={exportMenuRef}>
              <button
                id="btn-export-menu"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                title="Unduh seluruh data"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Ekspor</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      onExportExcel();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-semibold block">Ekspor ke Excel (.xlsx)</span>
                      <span className="text-[10px] text-slate-500">2 Sheet lengkap dengan master</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onExportCSV();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="font-semibold block">Ekspor ke CSV (.csv)</span>
                      <span className="text-[10px] text-slate-500">Format tabel komparasi</span>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      onDownloadTemplate();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Unduh Template Excel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input Quote Button */}
            <button
              id="btn-nav-add-quote"
              onClick={onOpenAddQuote}
              disabled={productCount === 0}
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Penawaran</span>
            </button>

            {/* Add Product Button */}
            <button
              id="btn-nav-add-product"
              onClick={onOpenAddProduct}
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs shadow-emerald-200 transition-all cursor-pointer h-9"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Tambah Produk</span>
              <span className="xs:hidden">Produk</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-2.5 pt-0.5">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-input-mobile"
              type="text"
              placeholder="Cari obat (Paracetamol), vendor..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-base sm:text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                id="btn-clear-search-mobile"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* View Navigation Tabs: DESKTOP ONLY (hidden on mobile to prevent duplicate navigation) */}
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto border-t border-slate-100 py-1.5 scrollbar-none">
          <button
            id="tab-view-cards"
            onClick={() => onViewChange('cards')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'cards'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kartu Produk</span>
          </button>

          <button
            id="tab-view-matrix"
            onClick={() => onViewChange('matrix')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'matrix'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Matriks Harga</span>
          </button>

          <button
            id="tab-view-simulation"
            onClick={() => onViewChange('simulation')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'simulation'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Simulasi Order & Hemat</span>
          </button>

          <button
            id="tab-view-suppliers"
            onClick={() => onViewChange('suppliers')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'suppliers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Daftar Supplier</span>
          </button>
        </div>

      </div>

      {/* Mobile Excel Bottom Sheet Modal */}
      {isMobileExcelSheetOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-xs">
          <div 
            className="w-full bg-white rounded-t-2xl p-5 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Kelola Data Excel</h3>
              </div>
              <button 
                onClick={() => setIsMobileExcelSheetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 py-3">
              {onOpenInstallModal && (
                <button
                  onClick={() => {
                    setIsMobileExcelSheetOpen(false);
                    onOpenInstallModal();
                  }}
                  className="w-full p-3 text-left rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white flex items-center gap-3 transition-colors cursor-pointer shadow-md border border-emerald-500/30"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-400/40 shrink-0 bg-emerald-800">
                    <img
                      src="/pwa-192x192.png"
                      alt="Icon CekHargaPBF"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white block">Pasang di Layar Utama HP</span>
                      <span className="bg-emerald-500/30 text-emerald-300 text-[9px] font-bold px-1.5 py-0.2 rounded-sm">PWA</span>
                    </div>
                    <span className="text-[11px] text-slate-300">Akses cepat tanpa browser & offline ready</span>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  setIsMobileExcelSheetOpen(false);
                  onOpenImportExcel();
                }}
                className="w-full p-3 text-left rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Import File Excel</span>
                  <span className="text-[11px] text-slate-500">Unggah file .xlsx berisi data produk & supplier</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileExcelSheetOpen(false);
                  onDownloadTemplate();
                }}
                className="w-full p-3 text-left rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Unduh Template Excel Resmi</span>
                  <span className="text-[11px] text-slate-500">Template standar dengan kolom Company, Kemasan, Isi, HNA</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileExcelSheetOpen(false);
                  onExportExcel();
                }}
                className="w-full p-3 text-left rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Ekspor Semua Data (.xlsx)</span>
                  <span className="text-[11px] text-slate-500">Unduh data saat ini ke format Excel</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileExcelSheetOpen(false);
                  onExportCSV();
                }}
                className="w-full p-3 text-left rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Ekspor Tabel ke CSV (.csv)</span>
                  <span className="text-[11px] text-slate-500">Format tabel teks ringkas</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setIsMobileExcelSheetOpen(false)}
              className="w-full py-2.5 mt-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
