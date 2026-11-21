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

  // Initialize Native Audio Element (Configured for Background Playback)
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
    const audio = audioRef.current;
    if (!audio) return;

    if (newQueue) {
      setQueue(newQueue);
    }

    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 0);

    // Clean up previous blob URL
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    let url: string | undefined = track.audioUrl;

    // 1. If stored offline as blob in IndexedDB
    if (!url) {
      const blob = await getTrackBlob(track.id);
      if (blob) {
        url = URL.createObjectURL(blob);
        currentBlobUrlRef.current = url;
      }
    }

    // 2. If YouTube track, use the direct native audio stream endpoint
    if (!url && track.source === 'youtube') {
      const videoId = track.id.replace('yt_', '');
      url = `/api/youtube/stream?id=${videoId}`;
    }

    if (!url) {
      console.error('No audio source found for track:', track.title);
      return;
    }

    audio.src = url;

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn('Audio play error:', err);
    }

    // Setup MediaSession for background audio & lockscreen controls
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
  }, []);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (!currentTrack && queue.length > 0) {
        playTrack(queue[0]);
      } else {
        audio.play().catch(console.warn);
      }
    }
  }, [isPlaying, currentTrack, queue, playTrack]);

  // Seek
  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Next Track
  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (repeatMode === 'one' && currentTrack) {
      seekTo(0);
      const audio = audioRef.current;
      if (audio) audio.play().catch(console.warn);
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
  }, [queue, currentTrack, isShuffle, repeatMode, seekTo, playTrack]);

  // Previous Track (Loops to last track!)
  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || queue.length === 0) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      audio.play().catch(console.warn);
      return;
    }

    const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : 0;
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    playTrack(queue[prevIndex]);
  }, [queue, currentTrack, playTrack]);

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

  // MediaSession Action Handlers
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
