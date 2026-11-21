import { get, set, del } from 'idb-keyval';
import { Track, Playlist } from './types';

const TRACKS_KEY = 'miml_tracks_meta';
const PLAYLISTS_KEY = 'miml_playlists';

export async function getStoredTracks(): Promise<Track[]> {
  try {
    const list = await get<Track[]>(TRACKS_KEY);
    return list || [];
  } catch (err) {
    console.error('Failed to load tracks from IndexedDB:', err);
    return [];
  }
}

export async function saveTrack(track: Track, audioBlob?: Blob): Promise<void> {
  const tracks = await getStoredTracks();
  const existingIdx = tracks.findIndex(t => t.id === track.id);
  
  // Save blob separately to keep metadata query fast
  if (audioBlob) {
    await set(`miml_blob_${track.id}`, audioBlob);
  }

  // Metadata without in-memory blob
  const meta: Track = {
    ...track,
    audioBlob: undefined,
  };

  if (existingIdx >= 0) {
    tracks[existingIdx] = meta;
  } else {
    tracks.push(meta);
  }

  await set(TRACKS_KEY, tracks);
}

export async function getTrackBlob(trackId: string): Promise<Blob | null> {
  try {
    const blob = await get<Blob>(`miml_blob_${trackId}`);
    return blob || null;
  } catch (err) {
    console.error('Failed to get track audio blob:', err);
    return null;
  }
}

export async function deleteTrack(trackId: string): Promise<void> {
  const tracks = await getStoredTracks();
  const updated = tracks.filter(t => t.id !== trackId);
  await set(TRACKS_KEY, updated);
  await del(`miml_blob_${trackId}`);

  // Also remove from all playlists
  const playlists = await getStoredPlaylists();
  const updatedPlaylists = playlists.map(p => ({
    ...p,
    trackIds: p.trackIds.filter(id => id !== trackId)
  }));
  await set(PLAYLISTS_KEY, updatedPlaylists);
}

export async function getStoredPlaylists(): Promise<Playlist[]> {
  try {
    const list = await get<Playlist[]>(PLAYLISTS_KEY);
    return list || [];
  } catch (err) {
    console.error('Failed to load playlists:', err);
    return [];
  }
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const playlists = await getStoredPlaylists();
  const existingIdx = playlists.findIndex(p => p.id === playlist.id);
  if (existingIdx >= 0) {
    playlists[existingIdx] = playlist;
  } else {
    playlists.push(playlist);
  }
  await set(PLAYLISTS_KEY, playlists);
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const playlists = await getStoredPlaylists();
  const updated = playlists.filter(p => p.id !== playlistId);
  await set(PLAYLISTS_KEY, updated);
}
