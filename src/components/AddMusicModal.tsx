'use client';

import React, { useState, useRef } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { X, Upload, Video, Sparkles, Music, Loader2, Check, Plus, Search } from 'lucide-react';
import { Track } from '@/lib/types';
import { SearchResultItem } from '@/app/api/youtube/search/route';

interface AddMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddMusicModal({ isOpen, onClose }: AddMusicModalProps) {
  const { addTrack } = usePlayer();
  const [tab, setTab] = useState<'youtube' | 'upload' | 'sample'>('youtube');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  // YouTube Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Search YouTube
  const handleYoutubeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch (err) {
      console.error('YouTube search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Add YouTube Track
  const handleAddYoutubeTrack = async (item: SearchResultItem) => {
    // Parse duration string (e.g., "3:45" or "1:15:20") into seconds
    let sec = 180;
    if (item.duration) {
      const parts = item.duration.split(':').map(Number);
      if (parts.length === 2) sec = parts[0] * 60 + parts[1];
      else if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    const track: Track = {
      id: 'yt_' + item.id,
      title: item.title,
      artist: item.channel,
      duration: sec,
      artworkUrl: item.thumbnail,
      dateAdded: Date.now(),
      source: 'youtube',
    };

    await addTrack(track);
    setAddedIds((prev) => new Set([...prev, item.id]));
    setStatusMsg(`'${item.title.substring(0, 18)}...' 곡이 추가되었습니다!`);
    setTimeout(() => setStatusMsg(''), 2500);
  };

  // Handle local audio file selection (iPhone Files app / Mac files)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setStatusMsg(`${files.length}개 파일 추가 중...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const parts = nameWithoutExt.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : '보관함 음악';
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : nameWithoutExt;

      const duration = await new Promise<number>((resolve) => {
        const audio = new Audio();
        const objUrl = URL.createObjectURL(file);
        audio.src = objUrl;
        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(objUrl);
          resolve(audio.duration || 0);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objUrl);
          resolve(0);
        };
      });

      const newTrack: Track = {
        id: 'track_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        title,
        artist,
        duration,
        dateAdded: Date.now(),
        source: 'upload',
      };

      await addTrack(newTrack, file);
    }

    setLoading(false);
    setStatusMsg('완료되었습니다!');
    setTimeout(() => {
      onClose();
      setStatusMsg('');
    }, 500);
  };

  // Sample royalty-free demo tracks
  const addSampleTracks = async () => {
    setLoading(true);
    setStatusMsg('샘플 음악 불러오는 중...');

    const samples = [
      {
        title: 'Morning Coffee & Chill',
        artist: 'Lofi Cozy Cat',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        duration: 147,
      },
      {
        title: 'Sweet Dreams at Twilight',
        artist: 'Cloud Symphony',
        url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=chill-abstract-intention-12099.mp3',
        duration: 135,
      },
    ];

    try {
      for (const s of samples) {
        const resp = await fetch(s.url);
        const blob = await resp.blob();

        const track: Track = {
          id: 'track_sample_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          title: s.title,
          artist: s.artist,
          duration: s.duration,
          dateAdded: Date.now(),
          source: 'sample',
        };

        await addTrack(track, blob);
      }
    } catch (err) {
      console.warn('Sample download failed:', err);
    }

    setLoading(false);
    setStatusMsg('샘플 음악이 추가되었습니다!');
    setTimeout(() => {
      onClose();
      setStatusMsg('');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] w-full max-w-lg rounded-3xl border border-[#EBE5F5] shadow-2xl p-5 sm:p-6 relative text-[#473D5C] max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-[#756B87] hover:bg-[#F0E8FA] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[#F0E8FA] flex items-center justify-center text-[#664F91]">
            <Music className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-lg text-[#473D5C]">음악 추가하기</h3>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-2xl bg-[#F0E8FA]/70 p-1 mb-4 flex-shrink-0">
          <button
            onClick={() => setTab('youtube')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'youtube'
                ? 'bg-white text-[#664F91] shadow-sm'
                : 'text-[#756B87] hover:text-[#473D5C]'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>유튜브 검색</span>
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'upload'
                ? 'bg-white text-[#664F91] shadow-sm'
                : 'text-[#756B87] hover:text-[#473D5C]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>파일 업로드</span>
          </button>
          <button
            onClick={() => setTab('sample')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'sample'
                ? 'bg-white text-[#664F91] shadow-sm'
                : 'text-[#756B87] hover:text-[#473D5C]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>샘플 음악</span>
          </button>
        </div>

        {/* Tab 1: YouTube Search (Exact Match of Mac App!) */}
        {tab === 'youtube' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search Input Bar */}
            <form onSubmit={handleYoutubeSearch} className="flex gap-2 mb-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#756B87]" />
                <input
                  type="text"
                  placeholder="노래 제목이나 아티스트 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white border border-[#EBE5F5] focus:outline-none focus:border-[#664F91] focus:ring-1 focus:ring-[#664F91] text-[#473D5C] placeholder-[#8E869F]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2 rounded-xl bg-[#664F91] text-white text-xs font-semibold active:scale-95 hover:bg-[#584180] disabled:opacity-50 transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>검색</span>
              </button>
            </form>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {isSearching ? (
                <div className="py-12 text-center text-[#8E869F] text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#664F91]" />
                  <span>유튜브에서 검색 중...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const isAdded = addedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-[#EBE5F5] hover:border-[#DED1F2] transition-colors gap-3"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#F0E8FA] flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        {item.duration && (
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.2 rounded font-mono">
                            {item.duration}
                          </span>
                        )}
                      </div>

                      {/* Title & Channel */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#473D5C] line-clamp-1">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[#756B87] truncate mt-0.5">
                          {item.channel}
                        </p>
                      </div>

                      {/* Add Button */}
                      <button
                        onClick={() => handleAddYoutubeTrack(item)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                          isAdded
                            ? 'bg-[#C9EDDE] text-[#2F5244]'
                            : 'bg-[#F0E8FA] text-[#664F91] hover:bg-[#664F91] hover:text-white active:scale-95'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>추가됨</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>추가</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-[#8E869F] text-xs">
                  <p>듣고 싶은 노래 제목이나 아티스트를 검색해 보세요.</p>
                  <p className="text-[11px] mt-1 text-[#756B87]">예: 아이유, NewJeans, Lo-fi chill</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: File Upload (iPhone Files App / Mac) */}
        {tab === 'upload' && (
          <div className="space-y-4 py-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*,.mp3,.m4a,.wav,.aac,.flac"
              multiple
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#DED1F2] bg-white hover:bg-[#F0E8FA]/40 rounded-2xl p-8 text-center cursor-pointer transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F0E8FA] text-[#664F91] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm text-[#473D5C]">
                오디오 파일 선택하기
              </p>
              <p className="text-xs text-[#756B87] mt-1">
                아이폰 파일 앱, iCloud, MP3/M4A/WAV 지원
              </p>
            </div>
            <p className="text-[11px] text-[#8E869F] text-center">
              💡 추가된 파일은 아이폰 내부에 안전하게 오프라인 저장됩니다.
            </p>
          </div>
        )}

        {/* Tab 3: Sample Demo Tracks */}
        {tab === 'sample' && (
          <div className="space-y-3 py-4">
            <p className="text-xs text-[#756B87] leading-relaxed">
              테스트를 위해 편안한 고음질 로파이(Lofi) 샘플 음원을 보관함에 바로 불러옵니다.
            </p>
            <button
              onClick={addSampleTracks}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#664F91] text-white text-sm font-semibold active:scale-98 hover:bg-[#584180] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>샘플 2곡 즉시 추가하기</span>
            </button>
          </div>
        )}

        {/* Status Toast */}
        {statusMsg && (
          <div className="mt-3 p-2 rounded-xl bg-[#C9EDDE] text-[#2F5244] text-xs font-medium flex items-center justify-center gap-1.5 animate-in fade-in flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
