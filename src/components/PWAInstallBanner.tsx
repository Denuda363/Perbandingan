import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  onOpenInstallModal: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  onOpenInstallModal,
}) => {
  const { isInstalled, isIOS, isAndroid, isInstallable, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed previously in this session
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (!dismissed && !isInstalled) {
      setIsDismissed(false);
    }
  }, [isInstalled]);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const handleQuickInstall = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'manual_guide') {
        onOpenInstallModal();
      }
    } else {
      onOpenInstallModal();
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border-b border-emerald-800/40 px-3 sm:px-6 py-2.5 shadow-md relative overflow-hidden transition-all duration-300">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-40 h-full bg-emerald-500/10 blur-xl pointer-events-none" />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src="/pwa-192x192.png"
              alt="Icon CekHargaPBF"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md border border-emerald-400/30 object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -top-1 -right-1 bg-emerald-400 text-slate-950 p-0.5 rounded-full shadow-2xs">
              <Sparkles className="w-2.5 h-2.5" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-white tracking-tight truncate">
                Pasang di Layar Utama HP
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 hidden xs:inline-block">
                Akses 1-Klik & Offline
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate hidden sm:block">
              Buka cepat tanpa browser, hemat kuota, dan tampilan luas full-screen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleQuickInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer min-h-[36px]"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Pasang Sekarang</span>
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
