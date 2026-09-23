import React from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

interface CloudSyncStatusProps {
  status: 'connected' | 'syncing' | 'offline' | 'error';
  lastSyncedAt?: Date | null;
  onRefresh?: () => void;
}

export const CloudSyncStatus: React.FC<CloudSyncStatusProps> = ({
  status,
}) => {
  return (
    <div 
      className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium transition-all bg-slate-100/90 border border-slate-200/80 text-slate-700"
      title={status === 'connected' ? 'Terhubung Online ke Firebase Firestore' : status === 'syncing' ? 'Sedang menyinkronkan data...' : 'Mode Offline'}
    >
      {status === 'connected' && (
        <>
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0 hidden xs:block" />
          <span className="hidden sm:inline font-semibold text-emerald-800">
            Realtime Firebase
          </span>
          <span className="sm:hidden font-bold text-emerald-800 text-[10px]">Online</span>
        </>
      )}

      {status === 'syncing' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
          <span className="font-medium text-amber-700 text-[10px] sm:text-xs">
            <span className="hidden sm:inline">Sinkronisasi...</span>
            <span className="sm:hidden">Sync</span>
          </span>
        </>
      )}

      {status === 'offline' && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 text-[10px] sm:text-xs">
            <span className="hidden sm:inline">Offline (Lokal)</span>
            <span className="sm:hidden">Offline</span>
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
          <span className="text-rose-700 text-[10px] sm:text-xs">Gagal</span>
        </>
      )}
    </div>
  );
};
