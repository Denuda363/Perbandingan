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
  Database
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Import Data dari Excel / CSV
              </h2>
              <p className="text-xs text-slate-500">
                Unggah data produk, perbandingan harga, dan kontak supplier sekaligus
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Template Download Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5 sm:mt-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-950">
                  Belum punya format Excel yang sesuai?
                </h3>
                <p className="text-xs text-emerald-800/90 mt-0.5">
                  Unduh template Excel resmi lengkap dengan contoh data perbandingan harga (Paracetamol, dsb) & master supplier.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadCompleteExcelTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer w-full sm:w-auto justify-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template Excel (.xlsx)</span>
            </button>
          </div>

          {/* Upload Area / Dropzone */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-2xs">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm sm:text-base font-semibold text-slate-800">
                Pilih atau Tarik File Excel ke sini
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Mendukung format Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) atau file Comma Separated Values (<strong>.csv</strong>)
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg shadow-2xs">
                  Cari File di Komputer / Ponsel
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* File Info Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-100 rounded-xl border border-slate-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {parseResult?.sheetNames.length || 1} sheet terdeteksi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ganti File</span>
                  </button>
                </div>
              </div>

              {/* Parsing status loader */}
              {isParsing && (
                <div className="py-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Membaca dan memvalidasi lembar kerja Excel...</span>
                </div>
              )}

              {/* Error messages */}
              {hasErrors && parseResult && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Perhatian saat membaca file:</span>
                  </div>
                  {parseResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-rose-700 pl-6">
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              {/* Parsed Statistics Chips */}
              {parseResult && !hasErrors && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Baris</p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">{parseResult.totalRows}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Penawaran Produk</p>
                      <p className="text-lg font-bold text-emerald-900 mt-0.5">{parseResult.parsedQuotes.length}</p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">Master Supplier</p>
                      <p className="text-lg font-bold text-blue-900 mt-0.5">
                        {parseResult.parsedSuppliers.length > 0 
                          ? parseResult.parsedSuppliers.length 
                          : new Set(parseResult.parsedQuotes.map(q => q.supplierName).filter(Boolean)).size
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Lembar Sheet</p>
                      <p className="text-lg font-bold text-amber-900 mt-0.5">{parseResult.sheetNames.length}</p>
                    </div>
                  </div>

                  {/* Preview Tabs */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        {hasQuotes && (
                          <button
                            type="button"
                            onClick={() => setPreviewTab('products')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              previewTab === 'products'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Data Produk & Harga ({parseResult.parsedQuotes.length})
                          </button>
                        )}
                        {hasSuppliers && (
                          <button
                            type="button"
                            onClick={() => setPreviewTab('suppliers')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              previewTab === 'suppliers'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Data Master Supplier ({parseResult.parsedSuppliers.length})
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        Menampilkan pratinjau 8 baris pertama
                      </span>
                    </div>

                    {/* Preview Table: Products */}
                    {previewTab === 'products' && hasQuotes && (
                      <div className="overflow-x-auto max-h-60 text-xs">
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
                    )}

                    {/* Preview Table: Suppliers */}
                    {previewTab === 'suppliers' && hasSuppliers && (
                      <div className="overflow-x-auto max-h-60 text-xs">
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
                    )}
                  </div>

                  {/* Import Mode Selection */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Pilih Metode Penggabungan Data:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label 
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'merge'
                            ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            Gabungkan & Perbarui (Rekomendasi)
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Data yang sudah ada tetap aman. Penawaran harga baru akan ditambahkan atau diperbarui jika ada kecocokan supplier.
                          </p>
                        </div>
                      </label>

                      <label 
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'overwrite'
                            ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="overwrite"
                          checked={importMode === 'overwrite'}
                          onChange={() => setImportMode('overwrite')}
                          className="mt-1 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            Gantikan Seluruh Data (Overwrite)
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Menghapus data saat ini dan mengisi database hanya dengan data dari file Excel yang baru diunggah.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Tips section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Format Kolom Fleksibel</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sistem secara cerdas mendeteksi variasi judul kolom seperti: <em>"Nama Produk"</em> / <em>"Obat"</em>, <em>"Supplier"</em> / <em>"Vendor"</em>, <em>"Harga"</em> / <em>"Tarif"</em>, <em>"Satuan"</em> / <em>"Kemasan"</em>, serta syarat pembayaran (TOP). Angka dengan tulisan "Rp" atau titik/koma ribuan juga diformat secara otomatis.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!parseResult || (!hasQuotes && !hasSuppliers) || hasErrors}
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Impor Data Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
