import React from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

interface CloudSyncStatusProps {
  status: 'connected' | 'syncing' | 'offline' | 'error';
  lastSyncedAt?: Date | null;
  onRefresh?: () => void;
}

export const CloudSyncStatus: React.FC<CloudSyncStatusProps> = ({
  status,
  lastSyncedAt,
  onRefresh,
}) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all bg-slate-100 border border-slate-200 text-slate-700">
      {status === 'connected' && (
        <>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline font-semibold text-emerald-800">
            Realtime Firebase
          </span>
          <span className="sm:hidden font-bold text-emerald-800">Online</span>
        </>
      )}

      {status === 'syncing' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
          <span className="font-medium text-amber-700">Sinkronisasi...</span>
        </>
      )}

      {status === 'offline' && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500">Offline (Lokal)</span>
        </>
      )}

      {status === 'error' && (
        <>
          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
          <span className="text-rose-700">Gagal Sinkron</span>
        </>
      )}
    </div>
  );
};
