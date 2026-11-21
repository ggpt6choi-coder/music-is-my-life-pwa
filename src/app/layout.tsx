import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PlayerProvider } from '@/lib/PlayerContext';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Music Is My Life',
  description: '오프라인 감성 음악 플레이어',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Music Is My Life',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FAF8F5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="min-h-screen bg-[#FAF8F5] text-[#473D5C] antialiased flex flex-col justify-between">
        <PlayerProvider>
          {children}
        </PlayerProvider>
        
        {/* Anti-zoom & Anti-gesture Script for iOS App-like Experience */}
        <Script id="prevent-zoom" strategy="afterInteractive">
          {`
            // Prevent pinch-to-zoom gestures
            document.addEventListener('gesturestart', function(e) {
              e.preventDefault();
            }, { passive: false });
            document.addEventListener('gesturechange', function(e) {
              e.preventDefault();
            }, { passive: false });
            document.addEventListener('gestureend', function(e) {
              e.preventDefault();
            }, { passive: false });

            // Prevent double-tap to zoom
            let lastTouchEnd = 0;
            document.addEventListener('touchend', function(event) {
              const now = Date.now();
              if (now - lastTouchEnd <= 300) {
                // If it's not inside an input
                if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                  event.preventDefault();
                }
              }
              lastTouchEnd = now;
            }, { passive: false });

            // Service worker registration
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('ServiceWorker registration successful:', registration.scope);
                  },
                  function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
