'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Track } from '@/lib/types';
import { usePlayer } from '@/lib/PlayerContext';
import { Play, Pause, MoreHorizontal, Plus, Trash2, Check } from 'lucide-react';

interface TrackCardProps {
  track: Track;
  index: number;
}

export function TrackCard({ track }: TrackCardProps) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    removeTrack,
    playlists,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    currentPlaylistId,
  } = usePlayer();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCurrent = currentTrack?.id === track.id;

  // Playlists this track belongs to
  const trackPlaylists = playlists.filter(pl => pl.trackIds.includes(track.id));

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleCardClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border ${
        isCurrent
          ? 'bg-[#F0E8FA]/70 border-[#DED1F2] shadow-sm'
          : 'bg-white border-[#EBE5F5] hover:border-[#DED1F2] hover:bg-[#FAF8F5]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Play/Pause Indicator */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            isCurrent
              ? 'bg-[#664F91] text-white shadow-sm'
              : 'bg-[#F0E8FA] text-[#664F91] group-hover:bg-[#664F91] group-hover:text-white'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </div>

        {/* Title & Artist & Tags */}
        <div className="min-w-0 flex-1 pr-2">
          <p className="font-semibold text-sm text-[#473D5C] truncate">
            {track.title}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-xs text-[#756B87] truncate">
              {track.artist || 'Google Drive'}
            </span>
            {trackPlaylists.map(pl => (
              <span
                key={pl.id}
                className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#F0E8FA] text-[#664F91] font-medium"
              >
                🏷️ {pl.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Controls: Duration & Single Clean ••• Menu Button */}
      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-[#8E869F] tabular-nums hidden sm:inline">
          {formatDuration(track.duration)}
        </span>

        {/* Single ••• Menu Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#756B87] hover:text-[#473D5C] hover:bg-[#F0E8FA] transition-colors"
            title="더 보기"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-[#EBE5F5] py-1.5 z-30 text-xs text-[#473D5C] animate-in fade-in zoom-in-95 duration-100">
              {/* Playlists option */}
              {playlists.length > 0 && (
                <div className="px-3 py-1.5 border-b border-[#F0E8FA]">
                  <p className="text-[11px] font-semibold text-[#8E869F] mb-1">
                    플레이리스트 담기
                  </p>
                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                    {playlists.map((pl) => {
                      const inPl = pl.trackIds.includes(track.id);
                      return (
                        <button
                          key={pl.id}
                          onClick={() => {
                            if (inPl) {
                              removeTrackFromPlaylist(pl.id, track.id);
                            } else {
                              addTrackToPlaylist(pl.id, track.id);
                            }
                          }}
                          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#F0E8FA] text-left transition-colors"
                        >
                          <span className="truncate">{pl.name}</span>
                          {inPl && <Check className="w-3.5 h-3.5 text-[#664F91]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Remove from current playlist if inside one */}
              {currentPlaylistId && (
                <button
                  onClick={() => {
                    removeTrackFromPlaylist(currentPlaylistId, track.id);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#756B87] hover:bg-[#F0E8FA] transition-colors text-left"
                >
                  <Plus className="w-3.5 h-3.5 rotate-45" />
                  <span>목록에서 제외</span>
                </button>
              )}

              {/* Delete completely */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (confirm(`'${track.title}' 곡을 보관함에서 삭제하시겠습니까?`)) {
                    removeTrack(track.id);
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-rose-50 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>보관함에서 삭제</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
