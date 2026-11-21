'use client';

import React, { useState, useEffect } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { X, Cloud, FolderOpen, RefreshCw, Loader2, Check } from 'lucide-react';

interface AddMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddMusicModal({ isOpen, onClose }: AddMusicModalProps) {
  const { addTrack } = usePlayer();
  const [statusMsg, setStatusMsg] = useState('');
  const [gdriveInput, setGdriveInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [gdriveError, setGdriveError] = useState('');
  const [savedFolderUrl, setSavedFolderUrl] = useState('');

  // Load saved Google Drive Folder on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('miml_gdrive_folder');
      if (saved) setSavedFolderUrl(saved);
    }
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGdriveSubmit = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    setGdriveError('');
    const input = (customUrl || gdriveInput).trim();
    if (!input) return;

    setIsSyncing(true);

    try {
      const lines = input.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let importedCount = 0;

      for (const line of lines) {
        const res = await fetch('/api/gdrive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: line }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || '구글 드라이브 파일/폴더를 읽어오지 못했습니다.');
        }

        if (data.type === 'folder' && Array.isArray(data.tracks)) {
          for (const t of data.tracks) {
            await addTrack(t);
            importedCount++;
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('miml_gdrive_folder', line);
            setSavedFolderUrl(line);
          }
        } else if (data.track) {
          await addTrack(data.track);
          importedCount++;
        }
      }

      setGdriveInput('');
      setStatusMsg(`🎉 ${importedCount}곡을 보관함에 동기화했습니다!`);
      setTimeout(() => {
        setStatusMsg('');
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('GDrive import error:', msg);
      setGdriveError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EBE5F5] overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F0EBF7]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F0E8FA] text-[#664F91] flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#473D5C]">구글 드라이브 음악 추가</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#756B87] hover:text-[#473D5C] hover:bg-[#EBE5F5] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Linked Folder Quick Sync Card */}
          {savedFolderUrl && (
            <div className="p-3.5 bg-[#FAF8FD] border border-[#EBE5F5] rounded-2xl flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#664F91] flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  <span>연동된 드라이브 폴더</span>
                </p>
                <p className="text-[11px] text-[#756B87] truncate mt-1 font-mono">
                  {savedFolderUrl}
                </p>
              </div>
              <button
                onClick={() => handleGdriveSubmit(undefined, savedFolderUrl)}
                disabled={isSyncing}
                className="px-3 py-2 rounded-xl bg-[#664F91] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#584180] active:scale-95 transition-all disabled:opacity-50 flex-shrink-0 shadow-xs"
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>새 음악 동기화</span>
              </button>
            </div>
          )}

          {/* Link Input Form */}
          <form onSubmit={handleGdriveSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#756B87] mb-1.5">
                구글 드라이브 폴더 또는 파일 공유 링크
              </label>
              <textarea
                rows={2}
                placeholder="https://drive.google.com/drive/folders/... 또는 https://drive.google.com/file/d/..."
                value={gdriveInput}
                onChange={(e) => {
                  setGdriveInput(e.target.value);
                  setGdriveError('');
                }}
                className="w-full p-3 text-xs rounded-2xl bg-[#FAF8F5] border border-[#EBE5F5] focus:outline-none focus:border-[#664F91] focus:ring-1 focus:ring-[#664F91] text-[#473D5C] placeholder-[#A49BAE] resize-none leading-relaxed transition-all"
              />
              {gdriveError && (
                <p className="text-xs text-rose-500 mt-1.5 font-medium">{gdriveError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSyncing || !gdriveInput.trim()}
              className="w-full py-3 rounded-2xl bg-[#664F91] text-white text-xs font-bold active:scale-98 hover:bg-[#584180] disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>드라이브 음악 불러오는 중...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>보관함에 드라이브 음악 추가</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="px-5 py-3 bg-[#E7F6EE] border-t border-[#C9EDDE] text-xs font-semibold text-[#1F513A] flex items-center justify-center gap-1.5 animate-in slide-in-from-bottom duration-200">
            <Check className="w-4 h-4 text-[#2E7D56]" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
