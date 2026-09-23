import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Percent, 
  DollarSign, 
  Sparkles, 
  HelpCircle, 
  Check, 
  RotateCcw,
  Receipt,
  TrendingUp,
  Sliders,
  ShieldCheck,
  Calculator
} from 'lucide-react';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types';
import { calculateSellingPrice, formatRupiah } from '../utils/formatters';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [ppnPercent, setPpnPercent] = useState<number>(settings.ppnPercent);
  const [ppnEnabled, setPpnEnabled] = useState<boolean>(settings.ppnEnabled);
  const [marginPercent, setMarginPercent] = useState<number>(settings.marginPercent);
  const [marginCalculationMode, setMarginCalculationMode] = useState<'on_cost_plus_ppn' | 'markup'>(
    settings.marginCalculationMode
  );
  const [roundingOption, setRoundingOption] = useState<'none' | 'hundred' | 'thousand'>(
    settings.roundingOption || 'none'
  );

  // Live test preview value
  const [simulationCost, setSimulationCost] = useState<number>(100000);

  useEffect(() => {
    if (isOpen) {
      setPpnPercent(settings.ppnPercent);
      setPpnEnabled(settings.ppnEnabled);
      setMarginPercent(settings.marginPercent);
      setMarginCalculationMode(settings.marginCalculationMode);
      setRoundingOption(settings.roundingOption || 'none');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const currentPreviewSettings: AppSettings = {
    ppnPercent: Number(ppnPercent) || 0,
    ppnEnabled,
    marginPercent: Number(marginPercent) || 0,
    marginCalculationMode,
    roundingOption,
  };

  const preview = calculateSellingPrice(simulationCost, currentPreviewSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(currentPreviewSettings);
    onClose();
  };

  const handleReset = () => {
    setPpnPercent(DEFAULT_APP_SETTINGS.ppnPercent);
    setPpnEnabled(DEFAULT_APP_SETTINGS.ppnEnabled);
    setMarginPercent(DEFAULT_APP_SETTINGS.marginPercent);
    setMarginCalculationMode(DEFAULT_APP_SETTINGS.marginCalculationMode);
    setRoundingOption(DEFAULT_APP_SETTINGS.roundingOption);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <SettingsIcon className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Pengaturan PPN & Margin Harga Jual
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Konfigurasi persentase pajak dan margin keuntungan toko / apotek
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Section 1: PPN Settings */}
          <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200/80">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <label className="text-sm font-bold text-slate-800">
                  Pajak Pertambahan Nilai (PPN)
                </label>
              </div>

              {/* Toggle PPN */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ppnEnabled}
                  onChange={(e) => setPpnEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-xs font-semibold text-slate-700">
                  {ppnEnabled ? 'PPN Aktif' : 'Non-PPN (0%)'}
                </span>
              </label>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Atur persentase tarif PPN yang berlaku untuk faktur pembelian obat dan barang dari supplier.
            </p>

            {ppnEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-200/70">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-[180px]">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={ppnPercent}
                      onChange={(e) => setPpnPercent(parseFloat(e.target.value) || 0)}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      %
                    </span>
                  </div>

                  {/* Preset PPN buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '0% (Bebas)', val: 0 },
                      { label: '11% (Standar)', val: 11 },
                      { label: '12% (PPN 12%)', val: 12 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setPpnPercent(preset.val)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          ppnPercent === preset.val
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Margin Keuntungan Settings */}
          <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <label className="text-sm font-bold text-slate-800">
                Persentase Margin Keuntungan (Markup Harga Jual)
              </label>
            </div>
            
            <p className="text-xs text-slate-500 mb-3">
              Persentase keuntungan yang otomatis ditambahkan ke harga modal untuk menentukan rekomendasi harga jual ke konsumen/pasien.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-[180px]">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="500"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    %
                  </span>
                </div>

                {/* Preset Margin buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: '15%', val: 15 },
                    { label: '20%', val: 20 },
                    { label: '25%', val: 25 },
                    { label: '30%', val: 30 },
                    { label: '35%', val: 35 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setMarginPercent(preset.val)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        marginPercent === preset.val
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculation method selector */}
              <div className="pt-3 border-t border-slate-200/70 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Metode Perhitungan Margin:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label 
                    className={`flex items-start gap-2 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      marginCalculationMode === 'on_cost_plus_ppn'
                        ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="calcMode"
                      checked={marginCalculationMode === 'on_cost_plus_ppn'}
                      onChange={() => setMarginCalculationMode('on_cost_plus_ppn')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">
                        (Modal + PPN) + Margin %
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Rekomendasi Apotek: Margin dihitung dari total kas modal sesudah terkena PPN.
                      </span>
                    </div>
                  </label>

                  <label 
                    className={`flex items-start gap-2 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      marginCalculationMode === 'markup'
                        ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="calcMode"
                      checked={marginCalculationMode === 'markup'}
                      onChange={() => setMarginCalculationMode('markup')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">
                        Modal Pokok + Margin %
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Margin dihitung dari harga dasar sebelum PPN, lalu PPN ditambahkan.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Rounding option */}
              <div className="pt-3 border-t border-slate-200/70 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Pembulatan Harga Jual (Kasir):
                </label>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {[
                    { id: 'none', label: 'Tanpa Pembulatan (Pas)' },
                    { id: 'hundred', label: 'Bulatkan ke atas Rp 100' },
                    { id: 'thousand', label: 'Bulatkan ke atas Rp 1.000' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer font-medium ${
                        roundingOption === opt.id
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="roundingOpt"
                        checked={roundingOption === opt.id}
                        onChange={() => setRoundingOption(opt.id as any)}
                        className="sr-only"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Interactive Live Preview Card */}
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-inner">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Simulasi Live Perhitungan Harga Jual
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                Preview Realtime
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Contoh Modal Beli (Box / Unit):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    value={simulationCost}
                    onChange={(e) => setSimulationCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {[50000, 100000, 250000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSimulationCost(amt)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results Breakdown */}
              <div className="bg-black/30 rounded-xl p-3 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Harga Modal Beli:</span>
                  <span className="font-mono">{formatRupiah(preview.costPrice)}</span>
                </div>
                
                {ppnEnabled && (
                  <div className="flex justify-between text-slate-300">
                    <span>PPN ({preview.ppnRate * 100}%):</span>
                    <span className="font-mono text-amber-300">+{formatRupiah(preview.ppnAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-300">
                  <span>Margin ({preview.marginPercent}%):</span>
                  <span className="font-mono text-emerald-300">+{formatRupiah(preview.marginAmount)}</span>
                </div>

                <div className="pt-2 border-t border-white/20 flex justify-between items-baseline">
                  <span className="font-bold text-emerald-200">
                    Harga Rekomendasi Jual:
                  </span>
                  <span className="text-base font-extrabold text-emerald-400 font-mono">
                    {formatRupiah(preview.sellingPrice)}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-emerald-200/90 pt-0.5">
                  <span>Estimasi Laba per Unit:</span>
                  <span className="font-bold">+{formatRupiah(preview.profitPerUnit)}</span>
                </div>
              </div>
            </div>
          </div>

        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar (PPN 11%, Margin 25%)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
