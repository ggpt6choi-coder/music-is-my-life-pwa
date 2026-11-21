'use client';

import React, { useState } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Music } from 'lucide-react';
import { FullScreenPlayer } from './FullScreenPlayer';

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeatMode,
  } = usePlayer();

  const [fullScreenOpen, setFullScreenOpen] = useState(false);

  if (!currentTrack) {
    return null;
  }

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-[#EBE5F5] shadow-lg safe-bottom transition-all">
        {/* Progress Bar (Clickable / Draggable Top Strip) */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            seekTo(pos * (duration || 100));
          }}
          className="relative w-full h-1.5 bg-[#EBE5F5] cursor-pointer group"
        >
          <div
            className="h-full bg-[#664F91] transition-all group-hover:h-2"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Track Info (Click to open Fullscreen) */}
          <div
            onClick={() => setFullScreenOpen(true)}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F0E8FA] border border-[#DED1F2] flex items-center justify-center text-[#664F91] flex-shrink-0 group-hover:scale-105 transition-transform">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#473D5C] truncate group-hover:text-[#664F91] transition-colors">
                {currentTrack.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-[#756B87] truncate">
                <span>{currentTrack.artist || '알 수 없는 아티스트'}</span>
                <span className="text-[#8E869F] tabular-nums hidden xs:inline">
                  • {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Shuffle Button (with pill highlight) */}
            <button
              onClick={toggleShuffle}
              className={`w-8 h-8 rounded-full hidden sm:flex items-center justify-center transition-all ${
                isShuffle
                  ? 'bg-[#F0E8FA] text-[#664F91] ring-1 ring-[#DED1F2]'
                  : 'text-[#8E869F] hover:text-[#473D5C]'
              }`}
              title="셔플"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous Track (Loops to last track!) */}
            <button
              onClick={prevTrack}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#473D5C] hover:bg-[#F0E8FA] active:scale-95 transition-all"
              title="이전 곡 (순환)"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[#664F91] text-white flex items-center justify-center shadow-md active:scale-95 hover:bg-[#584180] transition-all"
              title={isPlaying ? '일시정지' : '재생'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={nextTrack}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#473D5C] hover:bg-[#F0E8FA] active:scale-95 transition-all"
              title="다음 곡"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Repeat Button (with pill highlight) */}
            <button
              onClick={cycleRepeatMode}
              className={`w-8 h-8 rounded-full hidden sm:flex items-center justify-center transition-all ${
                repeatMode !== 'off'
                  ? 'bg-[#F0E8FA] text-[#664F91] ring-1 ring-[#DED1F2]'
                  : 'text-[#8E869F] hover:text-[#473D5C]'
              }`}
              title="반복 모드"
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Player Modal */}
      <FullScreenPlayer
        isOpen={fullScreenOpen}
        onClose={() => setFullScreenOpen(false)}
      />
    </>
  );
}
