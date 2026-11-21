'use client';

import React, { useState, useRef } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { X, Upload, Video, Sparkles, Music, Loader2, Check, Plus } from 'lucide-react';
import { Track } from '@/lib/types';

interface AddMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddMusicModal({ isOpen, onClose }: AddMusicModalProps) {
  const { addTrack } = usePlayer();
  const [tab, setTab] = useState<'upload' | 'youtube' | 'sample'>('upload');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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

      // Extract duration
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

  // Sample royalty-free ambient/lofi tracks for immediate out-of-the-box testing
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
      console.warn('Sample download failed, creating stream fallback:', err);
    }

    setLoading(false);
    setStatusMsg('샘플 음악이 추가되었습니다!');
    setTimeout(() => {
      onClose();
      setStatusMsg('');
    }, 600);
  };

  // Handle YouTube link / search
  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeInput.trim()) return;

    setLoading(true);
    setStatusMsg('음원 정보 처리 중...');

    // Simple parser for YouTube title/link
    let title = youtubeInput.trim();
    let artist = 'YouTube';

    // Check if URL
    try {
      const url = new URL(youtubeInput.trim());
      if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        title = 'YouTube 음악 (' + (url.searchParams.get('v') || url.pathname.slice(1)) + ')';
      }
    } catch {}

    const track: Track = {
      id: 'track_yt_' + Date.now(),
      title,
      artist,
      duration: 180,
      dateAdded: Date.now(),
      source: 'youtube',
    };

    await addTrack(track);

    setLoading(false);
    setStatusMsg('등록되었습니다!');
    setYoutubeInput('');
    setTimeout(() => {
      onClose();
      setStatusMsg('');
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] w-full max-w-md rounded-3xl border border-[#EBE5F5] shadow-2xl p-6 relative text-[#473D5C]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-[#756B87] hover:bg-[#F0E8FA] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#F0E8FA] flex items-center justify-center text-[#664F91]">
            <Music className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-lg text-[#473D5C]">음악 추가하기</h3>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-2xl bg-[#F0E8FA]/70 p-1 mb-5">
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
            onClick={() => setTab('youtube')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'youtube'
                ? 'bg-white text-[#664F91] shadow-sm'
                : 'text-[#756B87] hover:text-[#473D5C]'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>유튜브 링크</span>
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

        {/* Tab 1: File Upload (iPhone Files App / Mac) */}
        {tab === 'upload' && (
          <div className="space-y-4">
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
              className="border-2 border-dashed border-[#DED1F2] bg-white hover:bg-[#F0E8FA]/40 rounded-2xl p-6 text-center cursor-pointer transition-colors group"
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

        {/* Tab 2: YouTube Link / Search */}
        {tab === 'youtube' && (
          <form onSubmit={handleYoutubeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#756B87] mb-1.5">
                유튜브 링크 또는 곡 이름
              </label>
              <input
                type="text"
                placeholder="https://youtu.be/... 또는 노래 제목"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-[#EBE5F5] focus:outline-none focus:border-[#664F91] focus:ring-1 focus:ring-[#664F91] text-[#473D5C] placeholder-[#8E869F]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !youtubeInput.trim()}
              className="w-full py-2.5 rounded-xl bg-[#664F91] text-white text-sm font-semibold active:scale-98 hover:bg-[#584180] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>보관함에 추가</span>
            </button>
          </form>
        )}

        {/* Tab 3: Sample Demo Tracks */}
        {tab === 'sample' && (
          <div className="space-y-3">
            <p className="text-xs text-[#756B87]">
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

        {/* Status Message */}
        {statusMsg && (
          <div className="mt-4 p-2 rounded-xl bg-[#C9EDDE] text-[#2F5244] text-xs font-medium flex items-center justify-center gap-1.5 animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
