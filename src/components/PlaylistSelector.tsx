'use client';

import React from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { Plus, ChevronDown, Trash2 } from 'lucide-react';

interface PlaylistSelectorProps {
  onCreatePlaylist: () => void;
}

export function PlaylistSelector({ onCreatePlaylist }: PlaylistSelectorProps) {
  const {
    tracks,
    playlists,
    currentPlaylistId,
    setCurrentPlaylistId,
    removePlaylist,
  } = usePlayer();

  const activePlaylist = playlists.find(p => p.id === currentPlaylistId);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 max-w-3xl mx-auto w-full">
      {/* Left: 새 플레이리스트 추가 버튼 */}
      <button
        onClick={onCreatePlaylist}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#DED1F2] text-[#664F91] hover:bg-[#F0E8FA] active:scale-95 shadow-xs transition-all flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>새 플레이리스트</span>
      </button>

      {/* Right: 플레이리스트 셀렉트 박스 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative">
          <select
            value={currentPlaylistId || ''}
            onChange={(e) => {
              const val = e.target.value;
              setCurrentPlaylistId(val === '' ? null : val);
            }}
            className="appearance-none bg-white border border-[#EBE5F5] hover:border-[#DED1F2] text-[#473D5C] text-xs font-semibold py-2 pl-3.5 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#664F91] shadow-xs cursor-pointer transition-all min-w-[140px] max-w-[200px] truncate"
          >
            <option value="">
              전체 음악 ({tracks.length}곡)
            </option>
            {playlists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name} ({pl.trackIds.length}곡)
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#756B87] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Delete button if custom playlist is selected */}
        {activePlaylist && (
          <button
            onClick={() => {
              if (confirm(`'${activePlaylist.name}' 플레이리스트를 삭제하시겠습니까?`)) {
                removePlaylist(activePlaylist.id);
              }
            }}
            className="w-8 h-8 rounded-xl bg-white border border-[#EBE5F5] hover:bg-rose-50 text-rose-500 flex items-center justify-center active:scale-95 shadow-xs transition-all"
            title="현재 플레이리스트 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
