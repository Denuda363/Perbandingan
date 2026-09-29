import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Award, 
  Plus, 
  Edit, 
  Trash2, 
  Star,
  CheckCircle,
  FileText,
  FileSpreadsheet,
  Download,
  Search
} from 'lucide-react';
import { Supplier, Product } from '../types';
import { getProductPriceStats } from '../utils/formatters';
import { Pagination } from './Pagination';

interface SupplierDirectoryProps {
  suppliers: Supplier[];
  products: Product[];
  onAddSupplier: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onOpenImportExcel?: () => void;
  onDownloadTemplate?: () => void;
}

export const SupplierDirectory: React.FC<SupplierDirectoryProps> = ({
  suppliers,
  products,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onOpenImportExcel,
  onDownloadTemplate,
}) => {
  // Calculate stats for each supplier
  const supplierStats = suppliers.map((sup) => {
    let productCount = 0;
    let cheapestCount = 0;

    products.forEach((prod) => {
      const quote = prod.quotes.find(
        (q) => q.supplierId === sup.id || q.supplierName.toLowerCase() === sup.name.toLowerCase()
      );
      if (quote) {
        productCount++;
        const stats = getProductPriceStats(prod);
        if (stats.cheapestQuote && stats.cheapestQuote.id === quote.id) {
          cheapestCount++;
        }
      }
    });

    return {
      supplier: sup,
      productCount,
      cheapestCount,
      winRate: productCount > 0 ? Math.round((cheapestCount / productCount) * 100) : 0,
    };
  });

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter suppliers by search query
  const filteredSupplierStats = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return supplierStats;
    return supplierStats.filter(({ supplier }) =>
      supplier.name.toLowerCase().includes(q) ||
      supplier.contactPerson?.toLowerCase().includes(q) ||
      supplier.phone?.includes(q) ||
      supplier.email?.toLowerCase().includes(q) ||
      supplier.address?.toLowerCase().includes(q)
    );
  }, [supplierStats, searchQuery]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Paginated suppliers
  const paginatedSuppliers = pageSize <= 0
    ? filteredSupplierStats
    : filteredSupplierStats.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Direktori & Profil Supplier
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data vendor, kontak sales, syarat pembayaran (tempo), dan performa harga termurah.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          {onOpenImportExcel && (
            <button
              onClick={onOpenImportExcel}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 rounded-xl shadow-2xs transition-colors cursor-pointer min-h-[42px]"
              title="Import data supplier dari Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Import Supplier (.xlsx)</span>
            </button>
          )}

          <button
            onClick={onAddSupplier}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Supplier</span>
          </button>
        </div>
      </div>

      {/* Search and count bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama supplier, kontak PIC, atau alamat..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Total: <strong className="text-slate-900 font-bold">{filteredSupplierStats.length}</strong> supplier
        </span>
      </div>

      {/* Supplier Grid */}
      {paginatedSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
          Tidak ada supplier yang ditemukan untuk pencarian "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedSuppliers.map(({ supplier, productCount, cheapestCount, winRate }) => {
          return (
            <div
              key={supplier.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {supplier.name}
                    </h3>
                    {supplier.contactPerson && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        PIC: <span className="font-medium text-slate-700">{supplier.contactPerson}</span>
                      </p>
                    )}
                  </div>

                  {supplier.rating && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      <span>{supplier.rating}</span>
                    </div>
                  )}
                </div>

                {/* Badges: Payment Terms & Win Rate */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {supplier.paymentTerms && (
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {supplier.paymentTerms}
                    </span>
                  )}
                  {cheapestCount > 0 && (
                    <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Award className="w-3 h-3 text-emerald-600" />
                      {cheapestCount}x Termurah
                    </span>
                  )}
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Produk Disuplai
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {productCount} Barang
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Tingkat Harga Terbaik
                    </span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {winRate}%
                    </span>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-1.5 mt-4 text-xs text-slate-600">
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a 
                        href={`https://wa.me/${supplier.phone.replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="hover:text-emerald-600 hover:underline"
                      >
                        {supplier.phone}
                      </a>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-500 line-clamp-2">{supplier.address}</span>
                    </div>
                  )}
                  {supplier.notes && (
                    <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 italic">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{supplier.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                <button
                  onClick={() => onEditSupplier(supplier)}
                  className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => onDeleteSupplier(supplier.id)}
                  className="px-2.5 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Pagination Controls */}
      <Pagination
        currentPage={page}
        totalItems={filteredSupplierStats.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 30, 50, 100, 'all']}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="supplier"
      />
    </div>
  );
};
