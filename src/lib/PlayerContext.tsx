'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Track, Playlist, RepeatMode } from './types';
import { getStoredTracks, getStoredPlaylists, getTrackBlob, saveTrack, deleteTrack as dbDeleteTrack, savePlaylist, deletePlaylist as dbDeletePlaylist } from './db';

interface PlayerContextType {
  tracks: Track[];
  playlists: Playlist[];
  currentTrack: Track | null;
  currentPlaylistId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setCurrentPlaylistId: (id: string | null) => void;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (time: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  addTrack: (track: Track, audioBlob?: Blob) => Promise<void>;
  removeTrack: (trackId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  removePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef<boolean>(false);
  const ytPollTimerRef = useRef<any>(null);

  // Initialize YouTube Player
  const initYouTubePlayer = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player && !ytPlayerRef.current) {
      try {
        ytPlayerRef.current = new window.YT.Player('yt-player-container', {
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              ytReadyRef.current = true;
            },
            onStateChange: (event: any) => {
              // 1: PLAYING, 2: PAUSED, 0: ENDED
              if (event.data === 1) {
                setIsPlaying(true);
                if ('mediaSession' in navigator) {
                  navigator.mediaSession.playbackState = 'playing';
                }
              } else if (event.data === 2) {
                setIsPlaying(false);
                if ('mediaSession' in navigator) {
                  navigator.mediaSession.playbackState = 'paused';
                }
              } else if (event.data === 0) {
                handleTrackEnded();
              }
            },
          },
        });
      } catch (e) {
        console.warn('YouTube player init failed:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initYouTubePlayer();
    } else {
      window.onYouTubeIframeAPIReady = initYouTubePlayer;
    }

    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player && !ytPlayerRef.current) {
        initYouTubePlayer();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [initYouTubePlayer]);

  // Polling playback time for YouTube Player
  useEffect(() => {
    if (currentTrack?.source === 'youtube' && isPlaying) {
      ytPollTimerRef.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const t = ytPlayerRef.current.getCurrentTime() || 0;
            const d = ytPlayerRef.current.getDuration() || currentTrack.duration || 0;
            setCurrentTime(t);
            if (d > 0) setDuration(d);
          } catch {}
        }
      }, 500);
    } else {
      if (ytPollTimerRef.current) {
        clearInterval(ytPollTimerRef.current);
        ytPollTimerRef.current = null;
      }
    }

    return () => {
      if (ytPollTimerRef.current) clearInterval(ytPollTimerRef.current);
    };
  }, [currentTrack, isPlaying]);

  // Initialize Native Audio Element (for uploads / local audio files)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const onPause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const onEnded = () => {
      handleTrackEnded();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }
    };
  }, []);

  // Load Initial Data
  const refreshData = useCallback(async () => {
    const loadedTracks = await getStoredTracks();
    const loadedPlaylists = await getStoredPlaylists();
    setTracks(loadedTracks);
    setPlaylists(loadedPlaylists);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Compute Active Queue
  useEffect(() => {
    let list: Track[] = [];
    if (currentPlaylistId === null) {
      list = tracks;
    } else {
      const pl = playlists.find(p => p.id === currentPlaylistId);
      if (pl) {
        const idSet = new Set(pl.trackIds);
        list = tracks.filter(t => idSet.has(t.id));
      }
    }
    setQueue(list);
  }, [tracks, playlists, currentPlaylistId]);

  // Play a Track
  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    if (newQueue) {
      setQueue(newQueue);
    }

    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 0);

    // 1. YouTube Track
    if (track.source === 'youtube') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const videoId = track.id.replace('yt_', '');
      
      const playYt = () => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(videoId);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      };

      if (ytReadyRef.current) {
        playYt();
      } else {
        initYouTubePlayer();
        setTimeout(playYt, 800);
      }
    } else {
      // 2. Local File / Sample Track
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }

      const audio = audioRef.current;
      if (!audio) return;

      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }

      let url: string | undefined = track.audioUrl;
      // Auto-rewrite any raw Google Drive URLs to our same-origin streaming proxy
      if (url && (url.includes('drive.google.com') || url.includes('drive.usercontent.google.com'))) {
        const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch) {
          url = `/api/gdrive/stream?id=${idMatch[1]}`;
        }
      }
      if (!url) {
        const blob = await getTrackBlob(track.id);
        if (blob) {
          url = URL.createObjectURL(blob);
          currentBlobUrlRef.current = url;
        }
      }

      if (!url) {
        console.error('No audio source found for track:', track.title);
        return;
      }

      audio.src = url;
      audio.volume = 1;
      audio.muted = false;
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    }

    // MediaSession API setup
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Music Is My Life',
        album: 'Music Is My Life',
        artwork: [
          { src: track.artworkUrl || '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: track.artworkUrl || '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    }
  }, [initYouTubePlayer]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (!currentTrack) {
      if (queue.length > 0) playTrack(queue[0]);
      return;
    }

    if (currentTrack.source === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(console.warn);
      }
    }
  }, [currentTrack, queue, isPlaying, playTrack]);

  // Seek
  const seekTo = useCallback((time: number) => {
    if (currentTrack?.source === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(time, true);
        setCurrentTime(time);
      }
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = time;
        setCurrentTime(time);
      }
    }
  }, [currentTrack]);

  // Next Track
  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (repeatMode === 'one' && currentTrack) {
      seekTo(0);
      togglePlay();
      return;
    }

    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * queue.length);
      playTrack(queue[randomIdx]);
      return;
    }

    const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
    const nextIndex = (currentIndex + 1) % queue.length;
    playTrack(queue[nextIndex]);
  }, [queue, currentTrack, isShuffle, repeatMode, seekTo, togglePlay, playTrack]);

  // Previous Track (Loops to last track!)
  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : 0;
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    playTrack(queue[prevIndex]);
  }, [queue, currentTrack, currentTime, seekTo, playTrack]);

  // Track Ended Handler
  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'off') {
      const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
      if (currentIndex < queue.length - 1) {
        nextTrack();
      } else {
        setIsPlaying(false);
      }
    } else {
      nextTrack();
    }
  }, [repeatMode, currentTrack, queue, nextTrack]);

  // MediaSession Action Handlers (Allows Lock Screen / Control Center Resume!)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        seekTo(details.seekTime);
      }
    });

    return () => {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [togglePlay, prevTrack, nextTrack, seekTo]);

  // Toggles
  const toggleShuffle = () => setIsShuffle(prev => !prev);
  const cycleRepeatMode = () => {
    setRepeatMode(prev => {
      if (prev === 'all') return 'one';
      if (prev === 'one') return 'off';
      return 'all';
    });
  };

  // Track Actions
  const addTrack = async (track: Track, audioBlob?: Blob) => {
    await saveTrack(track, audioBlob);
    await refreshData();
  };

  const removeTrack = async (trackId: string) => {
    if (currentTrack?.id === trackId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
      setIsPlaying(false);
      setCurrentTrack(null);
    }
    await dbDeleteTrack(trackId);
    await refreshData();
  };

  const createPlaylist = async (name: string): Promise<Playlist> => {
    const newPl: Playlist = {
      id: 'pl_' + Date.now(),
      name,
      trackIds: [],
      createdAt: Date.now(),
    };
    await savePlaylist(newPl);
    await refreshData();
    return newPl;
  };

  const removePlaylist = async (id: string) => {
    if (currentPlaylistId === id) {
      setCurrentPlaylistId(null);
    }
    await dbDeletePlaylist(id);
    await refreshData();
  };

  const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    if (!pl.trackIds.includes(trackId)) {
      const updated: Playlist = {
        ...pl,
        trackIds: [...pl.trackIds, trackId],
      };
      await savePlaylist(updated);
      await refreshData();
    }
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    const updated: Playlist = {
      ...pl,
      trackIds: pl.trackIds.filter(id => id !== trackId),
    };
    await savePlaylist(updated);
    await refreshData();
  };

  return (
    <PlayerContext.Provider
      value={{
        tracks,
        playlists,
        currentTrack,
        currentPlaylistId,
        isPlaying,
        currentTime,
        duration,
        isShuffle,
        repeatMode,
        searchQuery,
        setSearchQuery,
        setCurrentPlaylistId,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        toggleShuffle,
        cycleRepeatMode,
        addTrack,
        removeTrack,
        createPlaylist,
        removePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        refreshData,
      }}
    >
      {/* YouTube Player Container (Inline Player with Picture-in-Picture & PlaysInline) */}
      <div
        style={{
          position: 'fixed',
          bottom: 74,
          right: 12,
          width: 140,
          height: 80,
          zIndex: 25,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          border: '1.5px solid #DED1F2',
          display: currentTrack?.source === 'youtube' ? 'block' : 'none',
          backgroundColor: '#000',
        }}
      >
        <div id="yt-player-container" style={{ width: '100%', height: '100%' }} />
      </div>

      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
}
