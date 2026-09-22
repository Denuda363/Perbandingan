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
  ChevronDown
} from 'lucide-react';
import { ViewMode } from '../types';

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
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
              <TrendingDown className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                  HargaVendor
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 sm:px-2 py-0.5 rounded-full">
                  Komparator
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
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
            {/* Import Excel Button */}
            <button
              id="btn-import-excel"
              onClick={onOpenImportExcel}
              title="Import data produk dan supplier dari file Excel"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden xs:inline">Import</span> Excel
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
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm shadow-emerald-300 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-input-mobile"
              type="text"
              placeholder="Cari obat, produk, atau supplier..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                id="btn-clear-search-mobile"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* View Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 py-1.5 scrollbar-none">
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
    </header>
  );
};
