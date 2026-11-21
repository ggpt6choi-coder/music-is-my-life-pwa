'use client';

import React from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { Plus, ListMusic, Trash2 } from 'lucide-react';

interface PlaylistTabsProps {
  onCreatePlaylist: () => void;
}

export function PlaylistTabs({ onCreatePlaylist }: PlaylistTabsProps) {
  const { tracks, playlists, currentPlaylistId, setCurrentPlaylistId, removePlaylist } = usePlayer();

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-4 max-w-3xl mx-auto">
      {/* All Tracks Tab */}
      <button
        onClick={() => setCurrentPlaylistId(null)}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
          currentPlaylistId === null
            ? 'bg-[#664F91] text-white shadow-sm'
            : 'bg-white border border-[#EBE5F5] text-[#473D5C] hover:bg-[#F0E8FA]'
        }`}
      >
        <ListMusic className="w-3.5 h-3.5" />
        <span>전체 음악</span>
        <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
          currentPlaylistId === null ? 'bg-white/20 text-white' : 'bg-[#F0E8FA] text-[#664F91]'
        }`}>
          {tracks.length}
        </span>
      </button>

      {/* User Playlists */}
      {playlists.map((pl) => {
        const isSelected = currentPlaylistId === pl.id;
        return (
          <div
            key={pl.id}
            className={`flex items-center gap-1 pl-3.5 pr-2 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
              isSelected
                ? 'bg-[#664F91] text-white border-[#664F91] shadow-sm'
                : 'bg-white border-[#EBE5F5] text-[#473D5C] hover:bg-[#F0E8FA]'
            }`}
          >
            <button
              onClick={() => setCurrentPlaylistId(pl.id)}
              className="flex items-center gap-1.5"
            >
              <span>{pl.name}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isSelected ? 'bg-white/20 text-white' : 'bg-[#F0E8FA] text-[#664F91]'
              }`}>
                {pl.trackIds.length}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`'${pl.name}' 플레이리스트를 삭제하시겠습니까?`)) {
                  removePlaylist(pl.id);
                }
              }}
              className={`p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity ${
                isSelected ? 'hover:bg-white/20' : 'hover:bg-[#F0E8FA]'
              }`}
              title="플레이리스트 삭제"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* Create New Playlist Button */}
      <button
        onClick={onCreatePlaylist}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-white/70 border border-dashed border-[#DED1F2] text-[#664F91] hover:bg-[#F0E8FA] transition-all flex-shrink-0"
      >
        <Plus className="w-3 h-3" />
        <span>새 플레이리스트</span>
      </button>
    </div>
  );
}
