'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { X, Search, Link2, Upload, Music, Loader2, Check, Plus, Sparkles } from 'lucide-react';
import { Track } from '@/lib/types';
import { SearchResultItem } from '@/app/api/youtube/search/route';

interface AddMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddMusicModal({ isOpen, onClose }: AddMusicModalProps) {
  const { addTrack } = usePlayer();
  const [tab, setTab] = useState<'upload' | 'search' | 'link'>('upload');
  const [statusMsg, setStatusMsg] = useState('');
  
  // File Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Direct Link state
  const [directUrl, setDirectUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle local audio file selection (iPhone Files app / iCloud / Downloads)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatusMsg(`${files.length}개 파일 보관함에 담는 중...`);

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
          resolve(audio.duration || 180);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objUrl);
          resolve(180);
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

    setIsUploading(false);
    setStatusMsg('완료되었습니다! 백그라운드에서 끊김 없이 재생됩니다.');
    setTimeout(() => {
      onClose();
      setStatusMsg('');
    }, 900);
  };

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

  // Add YouTube Track from search
  const handleAddYoutubeTrack = async (item: SearchResultItem) => {
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

  // Add Track from Direct YouTube Link
  const handleDirectLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    const input = directUrl.trim();
    if (!input) return;

    let videoId = '';
    try {
      const url = new URL(input);
      if (url.hostname.includes('youtube.com')) {
        videoId = url.searchParams.get('v') || '';
      } else if (url.hostname.includes('youtu.be')) {
        videoId = url.pathname.slice(1).split('?')[0];
      }
    } catch {
      if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
        videoId = input;
      }
    }

    if (!videoId) {
      setLinkError('올바른 유튜브 링크(URL) 형식이 아닙니다.');
      return;
    }

    setIsAddingLink(true);

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      let title = `YouTube 음악 (${videoId})`;
      let artist = 'YouTube';
      let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || title;
        artist = data.author_name || artist;
        thumbnail = data.thumbnail_url || thumbnail;
      }

      const track: Track = {
        id: 'yt_' + videoId,
        title,
        artist,
        duration: 180,
        artworkUrl: thumbnail,
        dateAdded: Date.now(),
        source: 'youtube',
      };

      await addTrack(track);
      setDirectUrl('');
      setStatusMsg(`'${title.substring(0, 18)}...' 곡이 추가되었습니다!`);
      setTimeout(() => {
        setStatusMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to add direct link:', err);
      setLinkError('영상 정보를 불러오지 못했습니다. 링크를 확인해주세요.');
    } finally {
      setIsAddingLink(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      {/* Modal Dialog Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF8F5] w-full sm:max-w-lg h-[86dvh] sm:h-[80dvh] max-h-[86dvh] sm:max-h-[80dvh] rounded-t-[32px] sm:rounded-3xl border border-[#EBE5F5] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Sticky Header Section */}
        <div className="p-4 sm:p-5 pb-3 bg-[#FAF8F5] border-b border-[#EBE5F5]/70 flex-shrink-0">
          {/* Mobile Handle Pill */}
          <div className="w-10 h-1.5 rounded-full bg-[#DED1F2] mx-auto mb-3 sm:hidden" />

          {/* Top Title & Close Button Row */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F0E8FA] flex items-center justify-center text-[#664F91]">
                <Music className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-[#473D5C]">음악 추가하기</h3>
            </div>
            
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F0E8FA]/80 hover:bg-[#F0E8FA] text-[#756B87] hover:text-[#473D5C] flex items-center justify-center transition-all active:scale-95"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selector: File Upload (100% Background) vs YouTube Search vs Direct Link */}
          <div className="flex rounded-2xl bg-[#F0E8FA]/70 p-1 mb-3">
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                tab === 'upload'
                  ? 'bg-white text-[#664F91] shadow-xs'
                  : 'text-[#756B87] hover:text-[#473D5C]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>파일 담기 (백그라운드)</span>
            </button>
            <button
              onClick={() => setTab('search')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                tab === 'search'
                  ? 'bg-white text-[#664F91] shadow-xs'
                  : 'text-[#756B87] hover:text-[#473D5C]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>유튜브 검색</span>
            </button>
            <button
              onClick={() => setTab('link')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                tab === 'link'
                  ? 'bg-white text-[#664F91] shadow-xs'
                  : 'text-[#756B87] hover:text-[#473D5C]'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>링크</span>
            </button>
          </div>

          {/* Search Form when Tab === 'search' */}
          {tab === 'search' && (
            <form onSubmit={handleYoutubeSearch} className="flex gap-2">
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
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2.5 no-scrollbar pb-10">
          {/* Tab 1: File Upload (iPhone Files App / Downloads - 100% Native Background Playback) */}
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
                className="border-2 border-dashed border-[#DED1F2] bg-white hover:bg-[#F0E8FA]/40 rounded-2xl p-7 text-center cursor-pointer transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#F0E8FA] text-[#664F91] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-semibold text-sm text-[#473D5C]">
                  아이폰에서 오디오 파일 선택
                </p>
                <p className="text-xs text-[#756B87] mt-1">
                  아이폰 '파일' 앱, 다운로드 폴더, MP3 / M4A 지원
                </p>
              </div>

              <div className="bg-white/80 border border-[#EBE5F5] rounded-2xl p-4 text-xs text-[#756B87] space-y-2 leading-relaxed">
                <p className="font-bold text-[#473D5C] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#664F91]" />
                  <span>진짜 100% 무중단 백그라운드 재생</span>
                </p>
                <p>
                  아이폰 파일 앱에 있는 음원을 담으시면, <strong>화면을 끄거나 홈으로 나가도 1초도 안 멈추는 순정 백그라운드 재생</strong>이 가능합니다. (아이폰 내부에 안전하게 오프라인 저장되어 데이터도 소모되지 않습니다.)
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: YouTube Search */}
          {tab === 'search' && (
            isSearching ? (
              <div className="py-16 text-center text-[#8E869F] text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#664F91]" />
                <span>유튜브에서 검색 중...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) => {
                const isAdded = addedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-[#EBE5F5] hover:border-[#DED1F2] transition-colors gap-3 shadow-2xs"
                  >
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

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#473D5C] line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#756B87] truncate mt-0.5">
                        {item.channel}
                      </p>
                    </div>

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
              <div className="py-16 text-center text-[#8E869F] text-xs">
                <p>듣고 싶은 노래 제목이나 아티스트를 검색해 보세요.</p>
                <p className="text-[11px] mt-1 text-[#756B87]">예: 퇴사할게여, 아이유, NewJeans, Lo-fi</p>
              </div>
            )
          )}

          {/* Tab 3: Direct Link */}
          {tab === 'link' && (
            <form onSubmit={handleDirectLinkSubmit} className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-[#756B87] mb-1.5">
                  유튜브 영상 링크 URL
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#756B87]" />
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
                    value={directUrl}
                    onChange={(e) => {
                      setDirectUrl(e.target.value);
                      setLinkError('');
                    }}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-white border border-[#EBE5F5] focus:outline-none focus:border-[#664F91] focus:ring-1 focus:ring-[#664F91] text-[#473D5C] placeholder-[#8E869F]"
                  />
                </div>
                {linkError && (
                  <p className="text-xs text-rose-500 mt-1.5">{linkError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isAddingLink || !directUrl.trim()}
                className="w-full py-2.5 rounded-xl bg-[#664F91] text-white text-sm font-semibold active:scale-98 hover:bg-[#584180] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                {isAddingLink ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>보관함에 추가</span>
              </button>

              <div className="bg-white/80 border border-[#EBE5F5] rounded-2xl p-4 text-xs text-[#756B87] space-y-1">
                <p className="font-semibold text-[#473D5C]">💡 팁</p>
                <p>유튜브 앱이나 브라우저에서 [공유 ➔ 링크 복사]한 주소를 여기에 붙여넣으시면 썸네일과 곡 정보가 자동으로 등록됩니다.</p>
              </div>
            </form>
          )}
        </div>

        {/* Status Toast Banner */}
        {statusMsg && (
          <div className="p-2.5 bg-[#C9EDDE] text-[#2F5244] text-xs font-medium flex items-center justify-center gap-1.5 border-t border-[#C9EDDE] flex-shrink-0 animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
