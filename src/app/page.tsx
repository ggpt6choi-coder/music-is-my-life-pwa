'use client';

import React, { useState } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { Header } from '@/components/Header';
import { PlaylistSelector } from '@/components/PlaylistSelector';
import { TrackCard } from '@/components/TrackCard';
import { PlayerBar } from '@/components/PlayerBar';
import { AddMusicModal } from '@/components/AddMusicModal';
import { PlaylistModal } from '@/components/PlaylistModal';
import { Music, Plus } from 'lucide-react';

export default function Home() {
  const { tracks, playlists, currentPlaylistId, searchQuery } = usePlayer();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

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

  // Filter tracks by search query (Unicode NFC normalized + space/case insensitive)
  if (searchQuery.trim()) {
    const rawQ = searchQuery.normalize('NFC').toLowerCase().trim();
    const cleanQ = rawQ.replace(/\s+/g, '');

    currentList = currentList.filter(t => {
      const titleNFC = (t.title || '').normalize('NFC').toLowerCase();
      const artistNFC = (t.artist || '').normalize('NFC').toLowerCase();

      // 1. Exact substring match
      if (titleNFC.includes(rawQ) || artistNFC.includes(rawQ)) return true;

      // 2. Whitespace-insensitive match (e.g. "어른이" matches "어른 이" or vice versa)
      const titleNoSpace = titleNFC.replace(/\s+/g, '');
      const artistNoSpace = artistNFC.replace(/\s+/g, '');
      if (titleNoSpace.includes(cleanQ) || artistNoSpace.includes(cleanQ)) return true;

      // 3. Decomposed NFD match fallback (for Apple NFD filenames)
      const rawNFD = searchQuery.normalize('NFD').toLowerCase().trim();
      const titleNFD = (t.title || '').normalize('NFD').toLowerCase();
      const artistNFD = (t.artist || '').normalize('NFD').toLowerCase();
      if (titleNFD.includes(rawNFD) || artistNFD.includes(rawNFD)) return true;

      return false;
    });
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF8F5]">
      {/* Top Fixed Header */}
      <Header onOpenAddModal={() => setAddModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-3 space-y-3">
        {/* Playlist Selector: Left (+ 새 플레이리스트), Right (Select Dropdown) */}
        <PlaylistSelector onCreatePlaylist={() => setPlaylistModalOpen(true)} />

        {/* Section Title & Track Count */}
        <div className="flex items-center justify-between pt-1 px-1">
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
                : '듣고 싶은 노래를 유튜브나 구글 드라이브에서 추가해보세요.'}
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
