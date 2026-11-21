'use client';

import React, { useState, useEffect } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { X, ListPlus } from 'lucide-react';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistModal({ isOpen, onClose }: PlaylistModalProps) {
  const { createPlaylist, setCurrentPlaylistId } = usePlayer();
  const [name, setName] = useState('');

  // Lock body scroll
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPl = await createPlaylist(name.trim());
    setCurrentPlaylistId(newPl.id);
    setName('');
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF8F5] w-full max-w-sm rounded-3xl border border-[#EBE5F5] shadow-2xl p-5 sm:p-6 relative text-[#473D5C] animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#F0E8FA]/80 hover:bg-[#F0E8FA] text-[#756B87] hover:text-[#473D5C] flex items-center justify-center transition-all active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#F0E8FA] flex items-center justify-center text-[#664F91]">
            <ListPlus className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-base sm:text-lg text-[#473D5C]">새 플레이리스트</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#756B87] mb-1.5">
              플레이리스트 이름
            </label>
            <input
              type="text"
              placeholder="예: 산책할 때, 집중 코딩 음악"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-[#EBE5F5] focus:outline-none focus:border-[#664F91] focus:ring-1 focus:ring-[#664F91] text-[#473D5C] placeholder-[#8E869F]"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-2.5 rounded-xl bg-[#664F91] text-white text-sm font-semibold active:scale-98 hover:bg-[#584180] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <span>만들기</span>
          </button>
        </form>
      </div>
    </div>
  );
}
