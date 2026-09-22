import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle,
  FileCheck,
  RefreshCw,
  Layers,
  ArrowRight,
  Database,
  Building2,
  Package,
  LayoutList,
  Table2,
  ChevronRight
} from 'lucide-react';
import { 
  parseExcelUpload, 
  downloadCompleteExcelTemplate, 
  ExcelParseResult, 
  ParsedProductImportItem, 
  ParsedSupplierImportItem 
} from '../utils/excelUtils';
import { formatRupiah } from '../utils/formatters';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (
    parsedResult: ExcelParseResult, 
    importMode: 'merge' | 'overwrite'
  ) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [previewTab, setPreviewTab] = useState<'products' | 'suppliers'>('products');
  const [previewLayout, setPreviewLayout] = useState<'card' | 'table'>('card');
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);

    try {
      const res = await parseExcelUpload(file);
      setParseResult(res);
      if (res.parsedQuotes.length === 0 && res.parsedSuppliers.length > 0) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
                Import Data Excel / CSV
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Unggah produk, harga multi-supplier, dan kontak PBF
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 active:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup modal import"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          
          {/* Template Download Banner - Compact for Mobile */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                  Butuh Contoh Format File Excel?
                </h3>
                <p className="text-[11px] sm:text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                  Unduh template resmi dengan kolom: <em>Company, Kemasan, Isi, HNA, Diskon, Harga Jadi</em> & Master Supplier.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadCompleteExcelTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer w-full sm:w-auto h-9"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template (.xlsx)</span>
            </button>
          </div>

          {/* Upload Area / Dropzone */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50 active:bg-slate-100'
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

              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5 shadow-2xs">
                <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              
              <p className="text-sm sm:text-base font-bold text-slate-800">
                Pilih atau Unggah File Excel
              </p>
              
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Mendukung file spreadsheet <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>
              </p>

              {/* High-touch button for Mobile */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 active:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm shadow-emerald-200 cursor-pointer min-h-[44px]"
                >
                  <Upload className="w-4 h-4" />
                  <span>Buka File dari HP / Komputer</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {/* File Info Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-3.5 bg-slate-100/90 rounded-xl border border-slate-200 gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {parseResult?.sheetNames.length || 1} sheet terdeteksi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-200 active:bg-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ganti File</span>
                  </button>
                </div>
              </div>

              {/* Parsing status loader */}
              {isParsing && (
                <div className="py-8 text-center text-slate-500 text-xs sm:text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Membaca dan memverifikasi data Excel...</span>
                </div>
              )}

              {/* Error messages */}
              {hasErrors && parseResult && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Perhatian saat membaca file:</span>
                  </div>
                  {parseResult.errors.map((err, i) => (
                    <p key={i} className="text-[11px] text-rose-700 pl-6">
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              {/* Parsed Statistics Chips */}
              {parseResult && !hasErrors && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 sm:mb-4">
                    <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Baris</p>
                      <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{parseResult.totalRows}</p>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <p className="text-[10px] sm:text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Penawaran Produk</p>
                      <p className="text-base sm:text-lg font-bold text-emerald-900 mt-0.5">{parseResult.parsedQuotes.length}</p>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-[10px] sm:text-[11px] font-medium text-blue-700 uppercase tracking-wider">Master Supplier</p>
                      <p className="text-base sm:text-lg font-bold text-blue-900 mt-0.5">
                        {parseResult.parsedSuppliers.length > 0 
                          ? parseResult.parsedSuppliers.length 
                          : new Set(parseResult.parsedQuotes.map(q => q.supplierName).filter(Boolean)).size
                        }
                      </p>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-[10px] sm:text-[11px] font-medium text-amber-700 uppercase tracking-wider">Sheet Terbaca</p>
                      <p className="text-base sm:text-lg font-bold text-amber-900 mt-0.5">{parseResult.sheetNames.length}</p>
                    </div>
                  </div>

                  {/* Preview Container */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {/* Preview Toolbar */}
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between bg-slate-50 p-2 sm:px-4 sm:py-2.5 border-b border-slate-200 gap-2">
                      {/* Tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {hasQuotes && (
                          <button
                            type="button"
                            onClick={() => setPreviewTab('products')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                              previewTab === 'products'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                            }`}
                          >
                            Produk & Harga ({parseResult.parsedQuotes.length})
                          </button>
                        )}
                        {hasSuppliers && (
                          <button
                            type="button"
                            onClick={() => setPreviewTab('suppliers')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                              previewTab === 'suppliers'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                            }`}
                          >
                            Supplier ({parseResult.parsedSuppliers.length})
                          </button>
                        )}
                      </div>

                      {/* Mobile View Style Toggle (Kartu vs Tabel) */}
                      <div className="flex items-center justify-between xs:justify-end gap-1.5">
                        <span className="text-[10px] text-slate-400 sm:hidden">Pratinjau:</span>
                        <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setPreviewLayout('card')}
                            className={`px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-all ${
                              previewLayout === 'card' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                            }`}
                          >
                            <LayoutList className="w-3 h-3" />
                            <span>Kartu</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewLayout('table')}
                            className={`px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-all ${
                              previewLayout === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                            }`}
                          >
                            <Table2 className="w-3 h-3" />
                            <span>Tabel</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preview Content: Products */}
                    {previewTab === 'products' && hasQuotes && (
                      <div>
                        {/* MOBILE CARD PREVIEW */}
                        <div className={`${previewLayout === 'card' ? 'block' : 'hidden sm:hidden'} p-2.5 space-y-2 max-h-64 overflow-y-auto divide-y divide-slate-150`}>
                          {parseResult.parsedQuotes.slice(0, 10).map((q, idx) => (
                            <div key={idx} className="pt-2 first:pt-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-slate-900 leading-snug">{q.name}</p>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                    <span className="bg-emerald-50 text-emerald-800 font-semibold px-1.5 py-0.2 rounded border border-emerald-200">
                                      {q.supplierName || 'PBF'}
                                    </span>
                                    <span>•</span>
                                    <span>{q.defaultUnit || 'Box'}</span>
                                    {q.category && (
                                      <>
                                        <span>•</span>
                                        <span className="text-slate-400">{q.category}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-bold text-xs text-emerald-700 block">
                                    {q.price > 0 ? formatRupiah(q.price) : '-'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    MOQ: {q.moq || 1}
                                  </span>
                                </div>
                              </div>
                              {q.notes && (
                                <p className="text-[10px] text-slate-400 mt-1 italic truncate">
                                  {q.notes}
                                </p>
                              )}
                            </div>
                          ))}
                          {parseResult.parsedQuotes.length > 10 && (
                            <p className="text-[11px] text-center text-slate-400 py-1">
                              + {parseResult.parsedQuotes.length - 10} data lainnya akan otomatis terimpor
                            </p>
                          )}
                        </div>

                        {/* TABLE PREVIEW */}
                        <div className={`${previewLayout === 'table' ? 'block' : 'hidden sm:block'} overflow-x-auto max-h-60 text-xs`}>
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3">Nama Produk</th>
                                <th className="py-2 px-3">Kategori</th>
                                <th className="py-2 px-3">Supplier</th>
                                <th className="py-2 px-3 text-right">Harga</th>
                                <th className="py-2 px-3 text-center">Satuan</th>
                                <th className="py-2 px-3 text-center">MOQ</th>
                                <th className="py-2 px-3">Catatan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {parseResult.parsedQuotes.slice(0, 8).map((q, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80">
                                  <td className="py-2 px-3 font-medium text-slate-900">{q.name}</td>
                                  <td className="py-2 px-3 text-slate-500">{q.category}</td>
                                  <td className="py-2 px-3 font-semibold text-emerald-700">{q.supplierName || '-'}</td>
                                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                                    {q.price > 0 ? formatRupiah(q.price) : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-center text-slate-500">{q.defaultUnit}</td>
                                  <td className="py-2 px-3 text-center">{q.moq || 1}</td>
                                  <td className="py-2 px-3 text-slate-400 truncate max-w-[140px]">{q.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Preview Content: Suppliers */}
                    {previewTab === 'suppliers' && hasSuppliers && (
                      <div>
                        {/* MOBILE CARD PREVIEW FOR SUPPLIERS */}
                        <div className={`${previewLayout === 'card' ? 'block' : 'hidden sm:hidden'} p-2.5 space-y-2 max-h-64 overflow-y-auto divide-y divide-slate-150`}>
                          {parseResult.parsedSuppliers.slice(0, 10).map((s, idx) => (
                            <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-xs text-slate-900">{s.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {s.contactPerson ? `${s.contactPerson} • ` : ''}{s.phone || s.email || 'Tanpa Kontak'}
                                </p>
                                <p className="text-[10px] text-emerald-700 mt-0.5">
                                  Syarat: {s.paymentTerms || 'Tempo 30 Hari'}
                                </p>
                              </div>
                              <span className="text-[11px] font-bold text-amber-600 shrink-0">
                                ★ {s.rating || 5}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* TABLE PREVIEW FOR SUPPLIERS */}
                        <div className={`${previewLayout === 'table' ? 'block' : 'hidden sm:block'} overflow-x-auto max-h-60 text-xs`}>
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3">Nama Supplier</th>
                                <th className="py-2 px-3">Kontak Person</th>
                                <th className="py-2 px-3">No. Telepon / WA</th>
                                <th className="py-2 px-3">Email</th>
                                <th className="py-2 px-3">Syarat Pembayaran</th>
                                <th className="py-2 px-3 text-center">Rating</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {parseResult.parsedSuppliers.slice(0, 8).map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80">
                                  <td className="py-2 px-3 font-semibold text-slate-900">{s.name}</td>
                                  <td className="py-2 px-3 text-slate-600">{s.contactPerson || '-'}</td>
                                  <td className="py-2 px-3 text-slate-600">{s.phone || '-'}</td>
                                  <td className="py-2 px-3 text-slate-500">{s.email || '-'}</td>
                                  <td className="py-2 px-3 text-slate-600">{s.paymentTerms || '-'}</td>
                                  <td className="py-2 px-3 text-center font-bold text-amber-600">
                                    ★ {s.rating || 5}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Import Mode Selection */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Metode Penggabungan Data:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <label 
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'merge'
                            ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            Gabungkan & Perbarui (Aman)
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Data lama tetap ada. Menambah produk/vendor baru atau memperbarui harga jika supplier sama.
                          </p>
                        </div>
                      </label>

                      <label 
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'overwrite'
                            ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="overwrite"
                          checked={importMode === 'overwrite'}
                          onChange={() => setImportMode('overwrite')}
                          className="mt-1 text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            Gantikan Seluruh Data (Reset)
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Menghapus seluruh data yang ada dan menggantikannya murni dengan isi file Excel baru.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Flexible Tips section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Format Kolom Fleksibel & Cerdas</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sistem mengenali variasi judul: <em>"Nama Produk / Obat"</em>, <em>"Pabrik / Company"</em>, <em>"Kemasan / Satuan"</em>, <em>"Supplier / Vendor"</em>, <em>"Harga Jadi / HNA"</em>. Penulisan Rp atau koma/titik ribuan otomatis dibersihkan.
            </p>
          </div>

        </div>

        {/* Modal Footer - Sticky & Mobile Accessible */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-white sm:bg-slate-50/90 shrink-0 gap-3">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors cursor-pointer min-h-[44px]"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!parseResult || (!hasQuotes && !hasSuppliers) || hasErrors}
            onClick={handleApply}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <span>Impor Data Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
