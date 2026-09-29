import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number; // 0 or positive number; 0 means "all"
  pageSizeOptions?: (number | 'all')[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 30, 50, 100, 'all'],
  onPageChange,
  onPageSizeChange,
  itemLabel = 'data',
  className = '',
}) => {
  const isShowAll = pageSize <= 0;
  const effectivePageSize = isShowAll ? (totalItems || 1) : pageSize;
  const totalPages = isShowAll || totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize);

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Auto-clamp page if items reduced
  useEffect(() => {
    if (!isShowAll && totalPages > 0 && currentPage > totalPages) {
      onPageChange(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages, isShowAll, onPageChange]);

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize + 1;
  const endIndex = isShowAll ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (safeCurrentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (safeCurrentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`bg-white px-3 sm:px-4 py-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 ${className}`}
    >
      {/* Left: Row selector & Total count */}
      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-500 whitespace-nowrap">Tampilkan:</span>
          <select
            value={isShowAll ? 'all' : pageSize}
            onChange={(e) => {
              const val = e.target.value;
              onPageSizeChange(val === 'all' ? 0 : parseInt(val, 10));
              onPageChange(1);
            }}
            aria-label="Pilih jumlah baris yang ditampilkan"
            className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt.toString()} value={opt}>
                {opt === 'all' ? 'Tampilkan Semua' : `${opt} baris`}
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-500">
          {totalItems === 0 ? (
            <span>0 {itemLabel}</span>
          ) : (
            <span>
              Menampilkan <strong className="text-slate-900 font-bold font-mono">{startIndex}-{endIndex}</strong> dari{' '}
              <strong className="text-slate-900 font-bold font-mono">{totalItems}</strong> {itemLabel}
            </span>
          )}
        </div>
      </div>

      {/* Right: Page Navigation Controls */}
      {!isShowAll && totalPages > 1 && (
        <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            aria-label="Halaman Pertama"
            title="Halaman Pertama"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            aria-label="Halaman Sebelumnya"
            title="Halaman Sebelumnya"
            className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Sebelumnya</span>
          </button>

          {/* Page numbers (tablet & desktop) */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none">
                    ...
                  </span>
                );
              }
              const pageNum = Number(p);
              const isActive = pageNum === safeCurrentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer font-mono ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Mobile Current Page Indicator */}
          <div className="sm:hidden px-2 py-1 text-xs font-bold font-mono text-slate-700 bg-slate-100 rounded-lg">
            {safeCurrentPage} / {totalPages}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            aria-label="Halaman Selanjutnya"
            title="Halaman Selanjutnya"
            className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-medium"
          >
            <span className="hidden xs:inline">Selanjutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safeCurrentPage >= totalPages}
            aria-label="Halaman Terakhir"
            title="Halaman Terakhir"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
