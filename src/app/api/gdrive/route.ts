import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url, apiKey } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: '올바른 링크를 입력해주세요.' }, { status: 400 });
    }

    const trimmed = url.trim();

    // 1. Google Apps Script Web App URL
    if (trimmed.includes('script.google.com') && trimmed.includes('/exec')) {
      try {
        const gasRes = await fetch(trimmed, {
          redirect: 'follow',
          headers: { Accept: 'application/json, text/plain, */*' },
        });

        if (gasRes.ok) {
          const text = await gasRes.text();
          let files: any[] = [];
          try {
            files = JSON.parse(text);
          } catch {
            // Not json
          }

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

    // 2. Google Drive Folder Link (Zero API Key Automatic Scraping & API fallback)
    const folderMatch = trimmed.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      const folderId = folderMatch[1];

      // Try zero-API-key direct folder HTML parsing first
      try {
        const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
        const folderRes = await fetch(folderUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (folderRes.ok) {
          const html = await folderRes.text();

          // Check if Google redirected to sign-in page
          if (html.includes('Google Drive: Sign-in') || html.includes('accounts.google.com/ServiceLogin')) {
            return NextResponse.json(
              {
                error:
                  "구글 드라이브 폴더가 '비공개(제한됨)' 상태입니다. 구글 드라이브에서 해당 폴더 [공유] ➔ [일반 액세스]를 '링크가 있는 모든 사용자'로 설정해 주세요.",
              },
              { status: 403 }
            );
          }

          // Regex parse audio files and IDs from Google Drive HTML
          const regex =
            /aria-label="([^"]+\.(?:mp3|m4a|wav|aac|flac|ogg))[^"]*"[\s\S]*?ssk=\x27[^\x27]*?:([a-zA-Z0-9_-]{28,35})/g;
          let match;
          const foundFiles: { name: string; id: string }[] = [];
          const seenIds = new Set<string>();

          while ((match = regex.exec(html)) !== null) {
            const rawId = match[2];
            const cleanId = rawId.split('-')[0];
            if (!seenIds.has(cleanId)) {
              seenIds.add(cleanId);
              foundFiles.push({ name: match[1], id: cleanId });
            }
          }

          if (foundFiles.length > 0) {
            const tracks = foundFiles.map((f) => {
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
                source: 'upload', // Plays natively through HTML5 <audio> with mediaSession
                dateAdded: Date.now(),
              };
            });

            return NextResponse.json({ tracks, count: tracks.length, type: 'folder' });
          }
        }
      } catch (parseErr) {
        console.warn('Direct folder parsing attempt error:', parseErr);
      }

      // Fallback: Check if Google Drive API Key is provided
      const key = apiKey || process.env.GOOGLE_DRIVE_API_KEY;
      if (key) {
        const gDriveApiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size)&key=${key}`;
        const apiRes = await fetch(gDriveApiUrl);
        if (apiRes.ok) {
          const data = await apiRes.json();
          const files = data.files || [];
          const audioFiles = files.filter((f: any) => {
            const isAudioMime = f.mimeType?.startsWith('audio/');
            const isAudioExt = /\.(mp3|m4a|wav|aac|flac|ogg)$/i.test(f.name || '');
            return isAudioMime || isAudioExt;
          });

          if (audioFiles.length > 0) {
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
                source: 'upload',
                dateAdded: Date.now(),
              };
            });

            return NextResponse.json({ tracks, count: tracks.length, type: 'folder' });
          }
        }
      }

      return NextResponse.json(
        {
          error:
            "폴더에서 음악 파일을 찾지 못했습니다. 폴더 안에 MP3/M4A 음악이 들어있는지, 그리고 [공유]가 '링크가 있는 모든 사용자'로 되어 있는지 확인해주세요.",
        },
        { status: 404 }
      );
    }

    // 3. Single File Link
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
      return NextResponse.json(
        {
          error: '올바른 구글 드라이브 파일 또는 폴더 링크 형식이 아닙니다.',
        },
        { status: 400 }
      );
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
