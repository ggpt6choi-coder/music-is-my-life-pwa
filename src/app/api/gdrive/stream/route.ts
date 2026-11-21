import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Missing file ID', { status: 400 });
  }

  try {
    const upstreamUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

    // Forward Range header if present (crucial for iOS Safari!)
    const range = req.headers.get('range');
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    };
    if (range) {
      headers['Range'] = range;
    }

    const upstreamRes = await fetch(upstreamUrl, {
      headers,
      redirect: 'follow',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse('Failed to fetch audio stream from Google Drive', {
        status: upstreamRes.status,
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'audio/mp4');
    responseHeaders.set('Content-Disposition', 'inline');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=86400');

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
    console.error('GDrive stream proxy error:', msg);
    return new NextResponse(`Stream error: ${msg}`, { status: 500 });
  }
}
