'use client';

import React from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Music } from 'lucide-react';

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FullScreenPlayer({ isOpen, onClose }: FullScreenPlayerProps) {
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

  if (!isOpen || !currentTrack) return null;

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF8F5] flex flex-col justify-between px-6 pt-6 pb-10 safe-top safe-bottom animate-in slide-in-from-bottom duration-300">
      {/* Top Bar with Dismiss */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#756B87] hover:bg-[#F0E8FA] active:scale-95 transition-all"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#8E869F]">
          지금 재생 중
        </span>
        <div className="w-10" />
      </div>

      {/* Main Art & Info */}
      <div className="flex flex-col items-center my-auto w-full max-w-sm mx-auto">
        {/* Album Artwork Card */}
        <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-gradient-to-br from-[#F0E8FA] to-[#DED1F2] border border-[#DED1F2] shadow-xl flex items-center justify-center p-8 mb-8 transition-transform duration-500">
          <div className="w-24 h-24 rounded-2xl bg-white/60 backdrop-blur-md flex items-center justify-center text-[#664F91] shadow-inner">
            <Music className="w-12 h-12" />
          </div>
        </div>

        {/* Title & Artist */}
        <div className="w-full text-center px-4">
          <h2 className="text-xl font-bold text-[#473D5C] truncate">
            {currentTrack.title}
          </h2>
          <p className="text-sm text-[#756B87] mt-1 truncate">
            {currentTrack.artist || '알 수 없는 아티스트'}
          </p>
        </div>
      </div>

      {/* Controls Container */}
      <div className="w-full max-w-sm mx-auto space-y-6">
        {/* Scrubber / Progress Bar */}
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="w-full h-1.5 bg-[#EBE5F5] rounded-lg appearance-none cursor-pointer accent-[#664F91]"
          />
          <div className="flex justify-between text-[11px] font-medium text-[#8E869F] tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-2">
          {/* Shuffle Button with pill highlight */}
          <button
            onClick={toggleShuffle}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isShuffle
                ? 'bg-[#F0E8FA] text-[#664F91] ring-1 ring-[#DED1F2]'
                : 'text-[#8E869F] hover:text-[#473D5C]'
            }`}
            title="셔플"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous Track */}
          <button
            onClick={prevTrack}
            className="w-12 h-12 rounded-full flex items-center justify-center text-[#473D5C] hover:bg-[#F0E8FA] active:scale-95 transition-all"
            title="이전 곡 (순환)"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-[#664F91] text-white flex items-center justify-center shadow-lg active:scale-95 hover:bg-[#584180] transition-all"
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={nextTrack}
            className="w-12 h-12 rounded-full flex items-center justify-center text-[#473D5C] hover:bg-[#F0E8FA] active:scale-95 transition-all"
            title="다음 곡"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>

          {/* Repeat Button with pill highlight */}
          <button
            onClick={cycleRepeatMode}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              repeatMode !== 'off'
                ? 'bg-[#F0E8FA] text-[#664F91] ring-1 ring-[#DED1F2]'
                : 'text-[#8E869F] hover:text-[#473D5C]'
            }`}
            title="반복 모드"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
