import { NextRequest, NextResponse } from 'next/server';
import { Ytdl } from '@distube/ytdl-core';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Missing video ID', { status: 400 });
  }

  try {
    const ytdl = new Ytdl();
    const info = await ytdl.getInfo(id);
    
    // Pick the best audio-only format (prefer audio/mp4 or highest audioBitrate)
    const audioFormats = info.formats.filter(
      (f: any) => f.hasAudio && !f.hasVideo && f.url
    );

    if (audioFormats.length === 0) {
      return new NextResponse('No audio format found', { status: 404 });
    }

    // Sort to pick best quality mp4 audio
    audioFormats.sort((a: any, b: any) => {
      const aIsMp4 = a.mimeType?.includes('audio/mp4') ? 1 : 0;
      const bIsMp4 = b.mimeType?.includes('audio/mp4') ? 1 : 0;
      if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4;
      return (b.audioBitrate || 0) - (a.audioBitrate || 0);
    });

    const target = audioFormats[0];
    const streamUrl = target.url;

    if (!streamUrl) {
      return new NextResponse('Stream URL not found', { status: 404 });
    }

    // Check if client requested a Range
    const rangeHeader = req.headers.get('range');
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(streamUrl, { headers });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', target.mimeType?.split(';')[0] || 'audio/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=3600');

    if (upstreamRes.headers.get('content-range')) {
      responseHeaders.set('Content-Range', upstreamRes.headers.get('content-range')!);
    }
    if (upstreamRes.headers.get('content-length')) {
      responseHeaders.set('Content-Length', upstreamRes.headers.get('content-length')!);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Audio stream extraction error:', msg);
    return new NextResponse(`Stream error: ${msg}`, { status: 500 });
  }
}
