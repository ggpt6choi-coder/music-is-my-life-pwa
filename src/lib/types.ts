export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  audioBlob?: Blob; // stored in IndexedDB
  audioUrl?: string; // object URL or stream URL
  artworkUrl?: string;
  dateAdded: number;
  source: 'upload' | 'youtube' | 'sample';
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';
