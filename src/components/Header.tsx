'use client';

import React from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { Music, Search, Plus, X } from 'lucide-react';

interface HeaderProps {
  onOpenAddModal: () => void;
}

export function Header({ onOpenAddModal }: HeaderProps) {
  const { searchQuery, setSearchQuery } = usePlayer();

  return (
    <header className="sticky top-0 z-20 bg-[#FAF8F5]/90 backdrop-blur-md px-4 pt-3 pb-3 border-b border-[#EBE5F5]">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#F0E8FA] flex items-center justify-center text-[#664F91]">
            <Music className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg text-[#473D5C] tracking-tight hidden sm:inline">
            Music Is My Life
          </span>
        </div>

        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#756B87]" />
          <input
            type="text"
            placeholder="음악 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm rounded-full bg-white border border-[#EBE5F5] focus:outline-none focus:border-[#664F91] focus:ring-1 focus:ring-[#664F91] text-[#473D5C] placeholder-[#8E869F] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E869F] hover:text-[#473D5C] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Add Music Button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#664F91] text-white text-sm font-medium shadow-sm active:scale-95 hover:bg-[#584180] transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>음악 추가</span>
        </button>
      </div>
    </header>
  );
}
