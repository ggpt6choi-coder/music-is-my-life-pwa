import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url, apiKey } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: '올바른 링크를 입력해주세요.' }, { status: 400 });
    }

    const trimmed = url.trim();

    // 1. Check if it's a Google Apps Script Web App URL
    if (trimmed.includes('script.google.com') && trimmed.includes('/exec')) {
      try {
        const gasRes = await fetch(trimmed, { headers: { Accept: 'application/json' } });
        if (gasRes.ok) {
          const files = await gasRes.json();
          if (Array.isArray(files) && files.length > 0) {
            const tracks = files.map((f: any) => {
              const nameWithoutExt = (f.name || '구글 드라이브 음악').replace(/\.[^/.]+$/, '');
              const parts = nameWithoutExt.split(' - ');
              const artist = parts.length > 1 ? parts[0].trim() : 'Google Drive';
              const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : nameWithoutExt;
              const fileId = f.id || f.fileId;
              const streamUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

              return {
                id: 'gdrive_' + fileId,
                title,
                artist,
                duration: 180,
                audioUrl: streamUrl,
                source: 'upload',
                dateAdded: Date.now(),
              };
            });

            return NextResponse.json({ tracks, count: tracks.length, type: 'folder' });
          }
        }
      } catch (gasErr) {
        console.warn('GAS fetch failed:', gasErr);
      }
    }

    // 2. Check if it is a Google Drive Folder Link
    // Format: https://drive.google.com/drive/folders/FOLDER_ID or /folders/FOLDER_ID?...
    const folderMatch = trimmed.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      const folderId = folderMatch[1];
      const key = apiKey || process.env.GOOGLE_DRIVE_API_KEY;

      if (!key) {
        return NextResponse.json({
          error: '폴더 안의 파일들을 자동으로 한 번에 읽어오려면 Google API 키가 필요하거나, 폴더 내 개별 파일 링크를 넣어주세요.',
          needsApiKey: true,
          folderId,
        }, { status: 400 });
      }

      // Query Google Drive API v3
      const gDriveApiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size)&key=${key}`;
      const apiRes = await fetch(gDriveApiUrl);
      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        return NextResponse.json({
          error: errJson.error?.message || '구글 드라이브 폴더를 조회하지 못했습니다. 폴더 공유 설정을 확인해주세요.',
        }, { status: 400 });
      }

      const data = await apiRes.json();
      const files = data.files || [];
      const audioFiles = files.filter((f: any) => {
        const isAudioMime = f.mimeType?.startsWith('audio/');
        const isAudioExt = /\.(mp3|m4a|wav|aac|flac|ogg)$/i.test(f.name || '');
        return isAudioMime || isAudioExt;
      });

      if (audioFiles.length === 0) {
        return NextResponse.json({
          error: '폴더 안에 MP3/M4A 음악 파일이 없습니다.',
        }, { status: 404 });
      }

      const tracks = audioFiles.map((f: any) => {
        const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
        const parts = nameWithoutExt.split(' - ');
        const artist = parts.length > 1 ? parts[0].trim() : 'Google Drive';
        const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : nameWithoutExt;
        const streamUrl = `https://drive.usercontent.google.com/download?id=${f.id}&export=download`;

        return {
          id: 'gdrive_' + f.id,
          title,
          artist,
          duration: 180,
          audioUrl: streamUrl,
          source: 'upload', // Plays natively through <audio>
          dateAdded: Date.now(),
        };
      });

      return NextResponse.json({ tracks, count: tracks.length, type: 'folder' });
    }

    // 3. Check if it is a Single File Link
    // Format: https://drive.google.com/file/d/FILE_ID/view... or id=FILE_ID
    let fileId = '';
    const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    } else {
      const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch) fileId = idMatch[1];
    }

    if (!fileId && /^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
      fileId = trimmed;
    }

    if (!fileId) {
      return NextResponse.json({
        error: '올바른 구글 드라이브 파일 또는 폴더 링크 형식이 아닙니다.',
      }, { status: 400 });
    }

    const streamUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

    return NextResponse.json({
      track: {
        id: 'gdrive_' + fileId,
        title: `Google Drive 음악 (${fileId.substring(0, 8)})`,
        artist: 'Google Drive',
        duration: 180,
        audioUrl: streamUrl,
        source: 'upload',
        dateAdded: Date.now(),
      },
      type: 'file',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GDrive route error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
