'use client';

import React, { useState } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { Header } from '@/components/Header';
import { PlaylistTabs } from '@/components/PlaylistTabs';
import { TrackCard } from '@/components/TrackCard';
import { PlayerBar } from '@/components/PlayerBar';
import { AddMusicModal } from '@/components/AddMusicModal';
import { PlaylistModal } from '@/components/PlaylistModal';
import { Music, Plus, Sparkles, Share, Smartphone } from 'lucide-react';

export default function Home() {
  const { tracks, playlists, currentPlaylistId, searchQuery } = usePlayer();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(true);

  // Filter tracks by active playlist
  let currentList = tracks;
  let activePlaylistName = '전체 음악';

  if (currentPlaylistId) {
    const pl = playlists.find(p => p.id === currentPlaylistId);
    if (pl) {
      activePlaylistName = pl.name;
      const idSet = new Set(pl.trackIds);
      currentList = tracks.filter(t => idSet.has(t.id));
    }
  }

  // Filter tracks by search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    currentList = currentList.filter(
      t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF8F5]">
      {/* Top Fixed Header */}
      <Header onOpenAddModal={() => setAddModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 space-y-4">
        {/* iOS PWA Install Hint Banner (Dismissible) */}
        {showPwaBanner && (
          <div className="relative bg-[#F0E8FA] border border-[#DED1F2] rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white text-[#664F91] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs text-[#473D5C] space-y-0.5">
                <p className="font-bold">아이폰 홈 화면에 앱으로 추가하기</p>
                <p className="text-[#756B87] leading-relaxed">
                  Safari 하단 <Share className="w-3 h-3 inline mx-0.5 text-[#664F91]" /> [공유] 버튼 ➔ <strong>[홈 화면에 추가]</strong>를 누르면 전체 화면 단독 앱으로 설치되며, 잠금화면 & 백그라운드 재생을 영구 무료로 지원합니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPwaBanner(false)}
              className="text-[#8E869F] hover:text-[#473D5C] text-xs p-1"
            >
              닫기
            </button>
          </div>
        )}

        {/* Playlist Tabs Bar */}
        <PlaylistTabs onCreatePlaylist={() => setPlaylistModalOpen(true)} />

        {/* Section Title & Track Count */}
        <div className="flex items-center justify-between pt-2 px-1">
          <div>
            <h2 className="text-base font-bold text-[#473D5C] tracking-tight">
              {activePlaylistName}
            </h2>
            <p className="text-xs text-[#756B87]">
              {searchQuery ? `검색 결과 ${currentList.length}곡` : `총 ${currentList.length}곡`}
            </p>
          </div>
        </div>

        {/* Tracks List */}
        {currentList.length > 0 ? (
          <div className="space-y-2.5 pb-24">
            {currentList.map((track, idx) => (
              <TrackCard key={track.id} track={track} index={idx} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white border border-[#EBE5F5] rounded-3xl p-10 text-center my-6 shadow-xs max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#F0E8FA] text-[#664F91] flex items-center justify-center mx-auto mb-4">
              <Music className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-[#473D5C] mb-1">
              {searchQuery ? '검색 결과가 없습니다' : '보관함이 비어있습니다'}
            </h3>
            <p className="text-xs text-[#756B87] mb-6 leading-relaxed">
              {searchQuery
                ? '다른 검색어로 검색해보세요.'
                : '소장하고 계신 오디오 파일을 추가하거나, 추천 샘플 음악으로 바로 들어보세요.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#664F91] text-white text-xs font-semibold shadow-sm active:scale-95 hover:bg-[#584180] transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>음악 추가하기</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Persistent Bottom Audio Player Bar */}
      <PlayerBar />

      {/* Modals */}
      <AddMusicModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
      <PlaylistModal
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
      />
    </div>
  );
}
