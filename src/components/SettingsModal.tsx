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
  Calculator,
  ArrowRight,
  Info
} from 'lucide-react';
import { AppSettings, DEFAULT_APP_SETTINGS, DiscountType, MarginType } from '../types';
import { calculateMarginFormula, formatRupiah } from '../utils/formatters';

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
  // PPN state
  const [ppnPercent, setPpnPercent] = useState<number>(settings.ppnPercent);
  const [ppnEnabled, setPpnEnabled] = useState<boolean>(settings.ppnEnabled);

  // Margin state
  const [marginType, setMarginType] = useState<MarginType>(settings.marginType || 'percent');
  const [marginPercent, setMarginPercent] = useState<number>(settings.marginPercent);
  const [marginAmountValue, setMarginAmountValue] = useState<number>(settings.marginAmountValue || 15000);

  // Default Diskon 1 state
  const [defaultDiscount1Type, setDefaultDiscount1Type] = useState<DiscountType>(settings.defaultDiscount1Type || 'percent');
  const [defaultDiscount1Value, setDefaultDiscount1Value] = useState<number>(settings.defaultDiscount1Value || 0);

  // Default Diskon 2 state
  const [defaultDiscount2Type, setDefaultDiscount2Type] = useState<DiscountType>(settings.defaultDiscount2Type || 'percent');
  const [defaultDiscount2Value, setDefaultDiscount2Value] = useState<number>(settings.defaultDiscount2Value || 0);

  const [marginCalculationMode, setMarginCalculationMode] = useState<'on_cost_plus_ppn' | 'markup'>(
    settings.marginCalculationMode || 'on_cost_plus_ppn'
  );
  const [roundingOption, setRoundingOption] = useState<'none' | 'hundred' | 'thousand'>(
    settings.roundingOption || 'none'
  );

  // Live test preview state
  const [simulationCost, setSimulationCost] = useState<number>(100000);
  const [simD1Val, setSimD1Val] = useState<number>(10);
  const [simD1Type, setSimD1Type] = useState<DiscountType>('percent');
  const [simD2Val, setSimD2Val] = useState<number>(5000);
  const [simD2Type, setSimD2Type] = useState<DiscountType>('amount');

  useEffect(() => {
    if (isOpen) {
      setPpnPercent(settings.ppnPercent);
      setPpnEnabled(settings.ppnEnabled);
      setMarginType(settings.marginType || 'percent');
      setMarginPercent(settings.marginPercent);
      setMarginAmountValue(settings.marginAmountValue || 15000);
      setDefaultDiscount1Type(settings.defaultDiscount1Type || 'percent');
      setDefaultDiscount1Value(settings.defaultDiscount1Value || 0);
      setDefaultDiscount2Type(settings.defaultDiscount2Type || 'percent');
      setDefaultDiscount2Value(settings.defaultDiscount2Value || 0);
      setMarginCalculationMode(settings.marginCalculationMode || 'on_cost_plus_ppn');
      setRoundingOption(settings.roundingOption || 'none');
      setSimD1Val(settings.defaultDiscount1Value || 10);
      setSimD1Type(settings.defaultDiscount1Type || 'percent');
      setSimD2Val(settings.defaultDiscount2Value || 0);
      setSimD2Type(settings.defaultDiscount2Type || 'amount');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const currentPreviewSettings: AppSettings = {
    ppnPercent: Number(ppnPercent) || 0,
    ppnEnabled,
    marginPercent: Number(marginPercent) || 0,
    marginType,
    marginAmountValue: Number(marginAmountValue) || 0,
    defaultDiscount1Type,
    defaultDiscount1Value: Number(defaultDiscount1Value) || 0,
    defaultDiscount2Type,
    defaultDiscount2Value: Number(defaultDiscount2Value) || 0,
    marginCalculationMode,
    roundingOption,
  };

  // Run live calculation using the official formula: (Modal - diskon 1 - diskon 2 + ppn) + margin
  const preview = calculateMarginFormula({
    modal: simulationCost,
    discount1Value: simD1Val,
    discount1Type: simD1Type,
    discount2Value: simD2Val,
    discount2Type: simD2Type,
    ppnPercent: Number(ppnPercent) || 0,
    ppnEnabled,
    marginValue: marginType === 'percent' ? Number(marginPercent) : Number(marginAmountValue),
    marginType,
    roundingOption,
    subUnitCount: 10,
    subUnitName: 'lembar',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(currentPreviewSettings);
    onClose();
  };

  const handleReset = () => {
    setPpnPercent(DEFAULT_APP_SETTINGS.ppnPercent);
    setPpnEnabled(DEFAULT_APP_SETTINGS.ppnEnabled);
    setMarginPercent(DEFAULT_APP_SETTINGS.marginPercent);
    setMarginType(DEFAULT_APP_SETTINGS.marginType);
    setMarginAmountValue(DEFAULT_APP_SETTINGS.marginAmountValue);
    setDefaultDiscount1Type(DEFAULT_APP_SETTINGS.defaultDiscount1Type);
    setDefaultDiscount1Value(DEFAULT_APP_SETTINGS.defaultDiscount1Value);
    setDefaultDiscount2Type(DEFAULT_APP_SETTINGS.defaultDiscount2Type);
    setDefaultDiscount2Value(DEFAULT_APP_SETTINGS.defaultDiscount2Value);
    setMarginCalculationMode(DEFAULT_APP_SETTINGS.marginCalculationMode);
    setRoundingOption(DEFAULT_APP_SETTINGS.roundingOption);
    setSimD1Val(10);
    setSimD1Type('percent');
    setSimD2Val(5000);
    setSimD2Type('amount');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <Calculator className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight">
                  Pengaturan Rumus Margin & Harga Jual
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Formula Apotek
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5 font-mono">
                (Modal - Diskon 1 - Diskon 2 + PPN) + Margin
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
          
          {/* Formula Banner Info */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl p-3.5 sm:p-4 text-slate-800 text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                  Metode Perhitungan Harga Jual:
                </span>
                <div className="mt-1.5 p-2 bg-white/80 rounded-lg border border-emerald-200/80 font-mono font-bold text-xs sm:text-sm text-emerald-900 inline-block shadow-2xs">
                  (Modal − Diskon 1 − Diskon 2 + PPN) + Margin
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5">
                  Diskon 1 dan Diskon 2 dapat diisi dalam persentase (<span className="font-semibold text-emerald-800">%</span>) atau nilai nominal Rupiah (<span className="font-semibold text-emerald-800">Rp</span>). Margin keuntungan dapat berupa persentase markup maupun nominal Rupiah.
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Margin Keuntungan Settings */}
          <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <label className="text-sm font-bold text-slate-800">
                  Margin Keuntungan Apotek / Toko
                </label>
              </div>

              {/* Toggle Margin Type (% or Rp) */}
              <div className="inline-flex items-center bg-white p-0.5 rounded-lg border border-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setMarginType('percent')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    marginType === 'percent'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Persentase (%)
                </button>
                <button
                  type="button"
                  onClick={() => setMarginType('amount')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    marginType === 'amount'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nominal (Rp)
                </button>
              </div>
            </div>
            
            <p className="text-xs text-slate-500">
              {marginType === 'percent' 
                ? 'Margin dihitung sebagai persentase keuntungan dari total modal setelah diskon dan PPN.'
                : 'Margin ditambahkan dalam nominal Rupiah tetap (misal +Rp 15.000) ke modal setelah diskon dan PPN.'}
            </p>

            {/* Input Margin */}
            <div className="flex items-center gap-3 pt-1">
              {marginType === 'percent' ? (
                <>
                  <div className="relative flex-1 max-w-[200px]">
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

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[15, 20, 25, 30, 35].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMarginPercent(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          marginPercent === preset
                            ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex-1 max-w-[220px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={marginAmountValue}
                      onChange={(e) => setMarginAmountValue(parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[5000, 10000, 15000, 20000, 25000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMarginAmountValue(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          marginAmountValue === preset
                            ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {formatRupiah(preset)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 2: PPN Settings */}
          <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200/80">
            <div className="flex items-center justify-between gap-2 mb-2">
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
              PPN dihitung dari modal bersih setelah dikurangi Diskon 1 dan Diskon 2: <code className="text-emerald-800 font-bold font-mono">(Modal - D1 - D2) × Tarif PPN</code>.
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

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '0% (Bebas)', val: 0 },
                      { label: '11% (Standar Faktur)', val: 11 },
                      { label: '12% (PPN 12%)', val: 12 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setPpnPercent(preset.val)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          ppnPercent === preset.val
                            ? 'bg-emerald-600 text-white shadow-2xs font-bold'
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

          {/* Section 3: Default Diskon 1 & Diskon 2 (Opsional Bawaan Saat Tambah Penawaran) */}
          <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <label className="text-sm font-bold text-slate-800">
                Nilai Diskon Bawaan (Default Input Form)
              </label>
            </div>
            
            <p className="text-xs text-slate-500">
              Nilai standar yang otomatis terisi ketika Anda memasukkan penawaran baru dari supplier. Bisa diubah sewaktu-waktu per produk.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Default Diskon 1 */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Diskon 1 (Reguler)</span>
                  <div className="inline-flex items-center bg-slate-100 p-0.5 rounded text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDefaultDiscount1Type('percent')}
                      className={`px-2 py-0.5 rounded font-bold ${
                        defaultDiscount1Type === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultDiscount1Type('amount')}
                      className={`px-2 py-0.5 rounded font-bold ${
                        defaultDiscount1Type === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Rp
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={defaultDiscount1Type === 'percent' ? '0.1' : '100'}
                    min="0"
                    value={defaultDiscount1Value}
                    onChange={(e) => setDefaultDiscount1Value(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {defaultDiscount1Type === 'percent' ? '%' : 'Rp'}
                  </span>
                </div>
              </div>

              {/* Default Diskon 2 */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Diskon 2 (Tambahan / Cash)</span>
                  <div className="inline-flex items-center bg-slate-100 p-0.5 rounded text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDefaultDiscount2Type('percent')}
                      className={`px-2 py-0.5 rounded font-bold ${
                        defaultDiscount2Type === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultDiscount2Type('amount')}
                      className={`px-2 py-0.5 rounded font-bold ${
                        defaultDiscount2Type === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Rp
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={defaultDiscount2Type === 'percent' ? '0.1' : '100'}
                    min="0"
                    value={defaultDiscount2Value}
                    onChange={(e) => setDefaultDiscount2Value(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {defaultDiscount2Type === 'percent' ? '%' : 'Rp'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Rounding */}
          <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200/80 space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Pembulatan Rekomendasi Harga Jual (Kasir):
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
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold ring-1 ring-emerald-400'
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

          {/* Section 5: Live Interactive Simulator Card */}
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-lg border border-emerald-800/40">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Simulasi Live Rumus: (Modal − D1 − D2 + PPN) + Margin
                </span>
              </div>
              <span className="text-[11px] text-emerald-200 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/60 font-mono">
                Hasil Realtime
              </span>
            </div>

            {/* Simulation Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {/* Modal Input */}
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  1. Modal Pokok / HNA:
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    value={simulationCost}
                    onChange={(e) => setSimulationCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-8 pr-2 py-1.5 bg-black/40 border border-white/20 rounded text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* Diskon 1 Simulator */}
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-300 font-semibold">
                    2. Diskon 1:
                  </label>
                  <div className="inline-flex bg-black/40 rounded p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSimD1Type('percent')}
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        simD1Type === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimD1Type('amount')}
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        simD1Type === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Rp
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={simD1Type === 'percent' ? '0.5' : '1000'}
                    min="0"
                    value={simD1Val}
                    onChange={(e) => setSimD1Val(parseFloat(e.target.value) || 0)}
                    className="w-full pl-2 pr-8 py-1.5 bg-black/40 border border-white/20 rounded text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    {simD1Type === 'percent' ? '%' : 'Rp'}
                  </span>
                </div>
              </div>

              {/* Diskon 2 Simulator */}
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-300 font-semibold">
                    3. Diskon 2:
                  </label>
                  <div className="inline-flex bg-black/40 rounded p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSimD2Type('percent')}
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        simD2Type === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimD2Type('amount')}
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        simD2Type === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Rp
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={simD2Type === 'percent' ? '0.5' : '500'}
                    min="0"
                    value={simD2Val}
                    onChange={(e) => setSimD2Val(parseFloat(e.target.value) || 0)}
                    className="w-full pl-2 pr-8 py-1.5 bg-black/40 border border-white/20 rounded text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    {simD2Type === 'percent' ? '%' : 'Rp'}
                  </span>
                </div>
              </div>
            </div>

            {/* Results Calculation Table */}
            <div className="bg-black/40 rounded-xl p-4 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Modal Pokok:</span>
                <span className="font-mono">{formatRupiah(preview.modal)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>− Diskon 1 ({preview.discount1Type === 'percent' ? `${preview.discount1Value}%` : 'Rp'}):</span>
                <span className="font-mono text-emerald-300">−{formatRupiah(preview.discount1Amount)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>− Diskon 2 ({preview.discount2Type === 'percent' ? `${preview.discount2Value}%` : 'Rp'}):</span>
                <span className="font-mono text-emerald-300">−{formatRupiah(preview.discount2Amount)}</span>
              </div>

              <div className="flex justify-between text-slate-200 font-semibold pt-1 border-t border-white/10">
                <span>Modal Bersih (Setelah Diskon):</span>
                <span className="font-mono text-white">{formatRupiah(preview.netCostAfterDiscounts)}</span>
              </div>

              {ppnEnabled && (
                <div className="flex justify-between text-slate-300">
                  <span>+ PPN ({preview.ppnPercent}%):</span>
                  <span className="font-mono text-amber-300">+{formatRupiah(preview.ppnAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-cyan-200 font-bold pt-1 border-t border-white/10">
                <span>Modal Setelah Diskon + PPN:</span>
                <span className="font-mono">{formatRupiah(preview.costWithPpn)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>+ Margin Keuntungan ({preview.marginType === 'percent' ? `${preview.marginValue}%` : formatRupiah(preview.marginValue)}):</span>
                <span className="font-mono text-emerald-300 font-bold">+{formatRupiah(preview.marginAmount)}</span>
              </div>

              <div className="pt-3 border-t border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-950/60 p-3 rounded-lg border border-emerald-500/30">
                <div>
                  <span className="font-bold text-emerald-200 block text-xs uppercase tracking-wider">
                    Rekomendasi Harga Jual Akhir:
                  </span>
                  <span className="text-[11px] text-emerald-300/80 font-mono">
                    ~{formatRupiah(preview.sellingPricePerSubUnit)} / lembar (isi 10)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
                    {formatRupiah(preview.sellingPrice)}
                  </span>
                  <div className="text-[11px] text-emerald-300">
                    Laba: <span className="font-bold text-white">+{formatRupiah(preview.profitPerUnit)}</span> ({preview.profitPercentage}%)
                  </div>
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
