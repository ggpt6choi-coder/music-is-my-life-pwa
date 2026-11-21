import { NextRequest, NextResponse } from 'next/server';

export interface SearchResultItem {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q || !q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const encoded = encodeURIComponent(q.trim());
    const res = await fetch(`https://www.youtube.com/results?search_query=${encoded}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 300 }, // Cache search results for 5 mins
    });

    if (!res.ok) {
      throw new Error(`YouTube responded with ${res.status}`);
    }

    const html = await res.text();
    const start = html.indexOf('ytInitialData = ');
    if (start === -1) {
      return NextResponse.json({ results: [] });
    }

    const jsonStart = start + 'ytInitialData = '.length;
    const jsonEnd = html.indexOf(';</script>', jsonStart);
    const jsonStr = html.substring(jsonStart, jsonEnd);
    const data = JSON.parse(jsonStr);

    const sections =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const results: SearchResultItem[] = [];
    const seen = new Set<string>();

    for (const section of sections) {
      const items = section.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (v && v.videoId && !seen.has(v.videoId)) {
          seen.add(v.videoId);
          results.push({
            id: v.videoId,
            title: v.title?.runs?.[0]?.text || '',
            channel: v.ownerText?.runs?.[0]?.text || '',
            duration: v.lengthText?.simpleText || '',
            thumbnail: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          });
        }
      }
    }

    return NextResponse.json({ results: results.slice(0, 15) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('YouTube search error:', msg);
    return NextResponse.json({ error: 'Search failed', details: msg }, { status: 500 });
  }
}
