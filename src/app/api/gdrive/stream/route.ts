import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for fast range responses & zero-latency audio buffering
const memoryCache = new Map<string, { buffer: Buffer; contentType: string; time: number }>();

async function getOrFetchAudio(id: string) {
  let cached = memoryCache.get(id);

  // Cache valid for 60 minutes in serverless instance
  if (!cached || Date.now() - cached.time > 3600000) {
    const upstreamUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
      redirect: 'follow',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      throw new Error(`Failed to fetch audio stream from Google Drive (status ${upstreamRes.status})`);
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = upstreamRes.headers.get('content-type') || 'audio/mp4';

    cached = { buffer, contentType, time: Date.now() };
    memoryCache.set(id, cached);
  }

  return cached;
}

export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const cached = await getOrFetchAudio(id);
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(cached.buffer.length),
        'Content-Type': cached.contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Missing file ID', { status: 400 });
  }

  try {
    const cached = await getOrFetchAudio(id);
    const total = cached.buffer.length;
    const rangeHeader = req.headers.get('range');

    // Handle HTTP 206 Partial Content (Strictly mandatory for iOS Safari smooth playback & seeking!)
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

      if (isNaN(start) || start >= total || end >= total || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${total}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        });
      }

      const chunk = cached.buffer.subarray(start, end + 1);

      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunk.length),
          'Content-Type': cached.contentType,
          'Content-Disposition': 'inline',
          // Notice: private no-store prevents Vercel Edge CDN from caching mismatched byte ranges
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Default 200 OK response with full content
    return new NextResponse(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(total),
        'Content-Type': cached.contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GDrive stream proxy error:', msg);
    return new NextResponse(`Stream error: ${msg}`, { status: 500 });
  }
}
