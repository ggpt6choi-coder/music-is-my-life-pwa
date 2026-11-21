'use client';

import React, { useState, useEffect } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { X, Search, Check, ListMusic, Music2 } from 'lucide-react';

interface ManagePlaylistTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string | null;
}

export function ManagePlaylistTracksModal({
  isOpen,
  onClose,
  playlistId,
}: ManagePlaylistTracksModalProps) {
  const {
    tracks,
    playlists,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
  } = usePlayer();

  const [query, setQuery] = useState('');

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

  if (!isOpen || !playlistId) return null;

  const currentPl = playlists.find((p) => p.id === playlistId);
  if (!currentPl) return null;

  const selectedIds = new Set(currentPl.trackIds);

  // Search filter with Unicode NFC normalization
  const normalizedQuery = query.normalize('NFC').toLowerCase().trim();
  const cleanQ = normalizedQuery.replace(/\s+/g, '');

  const filteredTracks = tracks.filter((t) => {
    if (!normalizedQuery) return true;
    const title = (t.title || '').normalize('NFC').toLowerCase();
    const artist = (t.artist || '').normalize('NFC').toLowerCase();
    if (title.includes(normalizedQuery) || artist.includes(normalizedQuery)) return true;
    if (title.replace(/\s+/g, '').includes(cleanQ) || artist.replace(/\s+/g, '').includes(cleanQ)) return true;
    return false;
  });

  const toggleTrack = (trackId: string) => {
    if (selectedIds.has(trackId)) {
      removeTrackFromPlaylist(playlistId, trackId);
    } else {
      addTrackToPlaylist(playlistId, trackId);
    }
  };

  const handleSelectAll = () => {
    for (const t of filteredTracks) {
      if (!selectedIds.has(t.id)) {
        addTrackToPlaylist(playlistId, t.id);
      }
    }
  };

  const handleDeselectAll = () => {
    for (const t of filteredTracks) {
      if (selectedIds.has(t.id)) {
        removeTrackFromPlaylist(playlistId, t.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#EBE5F5] overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F0EBF7] flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#F0E8FA] text-[#664F91] flex items-center justify-center flex-shrink-0">
              <ListMusic className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#473D5C] truncate">
                '{currentPl.name}' 곡 담기
              </h2>
              <p className="text-[11px] text-[#756B87] truncate">
                전체 음악에서 체크하여 플레이리스트로 분류 (중복 다운로드 없음)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#756B87] hover:text-[#473D5C] hover:bg-[#EBE5F5] flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-[#F0EBF7] space-y-2 flex-shrink-0 bg-[#FAF8F5]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756B87]" />
            <input
              type="text"
              placeholder="보관함 음악 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-white border border-[#EBE5F5] focus:outline-none focus:border-[#664F91] focus:ring-1 focus:ring-[#664F91] text-[#473D5C] placeholder-[#8E869F] transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E869F] hover:text-[#473D5C] p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs px-1 pt-1">
            <span className="text-[11px] font-semibold text-[#756B87]">
              선택됨: <strong className="text-[#664F91]">{selectedIds.size}</strong> / 총 {tracks.length}곡
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-[#664F91] hover:underline font-semibold"
              >
                모두 선택
              </button>
              <span className="text-[#DED1F2]">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] text-[#756B87] hover:underline"
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>

        {/* Tracks Checklist */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredTracks.length > 0 ? (
            filteredTracks.map((t) => {
              const isChecked = selectedIds.has(t.id);
              // Other playlists this track belongs to
              const otherPls = playlists.filter(
                (p) => p.id !== playlistId && p.trackIds.includes(t.id)
              );

              return (
                <div
                  key={t.id}
                  onClick={() => toggleTrack(t.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-[#F0E8FA]/70 border-[#DED1F2] shadow-2xs'
                      : 'bg-white border-[#EBE5F5] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox indicator */}
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                        isChecked
                          ? 'bg-[#664F91] text-white shadow-xs'
                          : 'border-2 border-[#DED1F2] bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Title & Artist & Tags */}
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-[#473D5C] truncate">
                        {t.title}
                      </p>
                      <p className="text-[11px] text-[#756B87] truncate mt-0.5">
                        {t.artist || 'Google Drive'}
                      </p>

                      {/* Playlist tags */}
                      {otherPls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {otherPls.map((op) => (
                            <span
                              key={op.id}
                              className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#FAF8F5] text-[#8E869F] border border-[#EBE5F5]"
                            >
                              🏷️ {op.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-[#8E869F]">
              <Music2 className="w-6 h-6 mx-auto mb-2 text-[#C4B7D9]" />
              <p>검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F0EBF7] bg-[#FAF8F5] flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#664F91] text-white text-xs font-bold shadow-xs hover:bg-[#584180] active:scale-95 transition-all"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
