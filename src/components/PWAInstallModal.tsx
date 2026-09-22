import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  MoreVertical, 
  WifiOff, 
  Zap, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'auto' | 'android' | 'ios'>(
    isIOS ? 'ios' : isAndroid ? 'android' : 'auto'
  );
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success'>('idle');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstallStatus('installing');
    const result = await install();
    if (result === 'accepted') {
      setInstallStatus('success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } else if (result === 'manual_guide') {
      setInstallStatus('idle');
      setActiveTab(isIOS ? 'ios' : 'android');
    } else {
      setInstallStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700">
              <Smartphone className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Aplikasi Smartphone (PWA)
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 active:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Hero App Showcase with Cool Icon */}
          <div className="flex items-center gap-4 bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 p-4 sm:p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="Icon Aplikasi CekHargaPBF"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-xl border-2 border-emerald-400/40 object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-full shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Resmi PWA
                </span>
                <span className="text-[10px] text-slate-300 font-medium">Versi 1.2.0</span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mt-1 leading-snug">
                Perbandingan Harga Supplier
              </h3>
              <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                Cek & bandingkan harga obat antar PBF langsung dari layar HP tanpa buka browser.
              </p>
            </div>
          </div>

          {/* Key Advantages */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <Zap className="w-5 h-5 mx-auto text-amber-500 mb-1" />
              <p className="text-[11px] font-bold text-slate-900">Akses Cepat</p>
              <p className="text-[10px] text-slate-500 leading-tight">1 tap di Home Screen</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <WifiOff className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-[11px] font-bold text-slate-900">Offline Ready</p>
              <p className="text-[10px] text-slate-500 leading-tight">Tetap bisa dibuka</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <ShieldCheck className="w-5 h-5 mx-auto text-teal-600 mb-1" />
              <p className="text-[11px] font-bold text-slate-900">Hemat Memori</p>
              <p className="text-[10px] text-slate-500 leading-tight">Sangat ringan &lt; 2 MB</p>
            </div>
          </div>

          {/* Interactive Install Action / Tabs */}
          <div className="space-y-3">
            {isInstalled ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm text-emerald-950">Aplikasi Sudah Terpasang!</p>
                <p className="text-xs text-emerald-800">
                  Anda sudah menggunakan aplikasi ini dalam mode terinstal di perangkat Anda.
                </p>
              </div>
            ) : isInstallable ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={installStatus === 'installing'}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200 cursor-pointer transition-all min-h-[48px]"
                >
                  <Download className="w-5 h-5" />
                  <span>
                    {installStatus === 'installing' ? 'Memproses Instalasi...' : 'Pasang di Layar Utama HP Sekarang'}
                  </span>
                </button>
                <p className="text-[11px] text-center text-slate-500">
                  Kompatibel dengan semua browser modern (Google Chrome, Edge, Samsung Internet)
                </p>
              </div>
            ) : (
              /* Guide Tabs when automated prompt is unavailable or for iOS */
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="text-xs font-bold text-slate-800">
                    Panduan Pasang di Smartphone:
                  </span>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveTab('android')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        activeTab === 'android'
                          ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Android
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ios')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        activeTab === 'ios'
                          ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      iPhone / iPad (iOS)
                    </button>
                  </div>
                </div>

                {activeTab === 'ios' ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          Buka di browser <span className="font-bold text-blue-600">Safari</span>, lalu ketuk tombol 
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-blue-600 font-bold">
                            <Share className="w-3.5 h-3.5" /> Bagikan (Share)
                          </span>
                          di bilah bawah layar.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          Gulir ke bawah dan pilih 
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-900 font-bold">
                            <PlusSquare className="w-3.5 h-3.5 text-emerald-600" /> Tambah ke Layar Utama (Add to Home Screen)
                          </span>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          Ketuk <span className="font-bold text-blue-600">Tambah (Add)</span> di pojok kanan atas. Ikon aplikasi akan langsung terpasang di menu utama iPhone Anda!
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          Ketuk tombol menu 
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-900 font-bold">
                            <MoreVertical className="w-3.5 h-3.5 text-slate-600" /> Titik Tiga
                          </span> 
                          di pojok kanan atas browser Google Chrome / Samsung Internet.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          Pilih 
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-emerald-700 font-bold">
                            <Download className="w-3.5 h-3.5" /> Instal Aplikasi
                          </span> 
                          atau 
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-900 font-bold">
                            <PlusSquare className="w-3.5 h-3.5 text-slate-700" /> Tambahkan ke Layar Utama
                          </span>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          Konfirmasi dengan menekan <strong>Instal</strong>. Aplikasi akan otomatis muncul seperti aplikasi bawaan di HP Anda.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
