import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true, // Skips ESLint errors during production build
  },
  images: {
    domains: [
      'maps.googleapis.com',
      'maps.gstatic.com',
      'lh3.googleusercontent.com',
      'streetviewpixels-pa.googleapis.com'
    ],
  },
  // Google Maps specific CSP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com;
              style-src 'self' 'unsafe-inline' https://*.googleapis.com;
              img-src 'self' data: https://*.googleapis.com https://*.gstatic.com https://lh3.googleusercontent.com https://streetviewpixels-pa.googleapis.com;
              font-src 'self' https://fonts.gstatic.com;
              frame-src 'self' https://*.google.com;
              connect-src 'self' https://*.googleapis.com https://*.gstatic.com;
              worker-src 'self' blob:;
            `.replace(/\s+/g, ' ').trim()
          },
        ],
      },
    ];
  },
  // Optional: Webpack configuration to better handle Google Maps
  webpack: (config: any) => {
    // This helps with handling certain modules
    if (config.resolve && config.resolve.fallback) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    } else if (config.resolve) {
      config.resolve.fallback = { fs: false };
    }
    return config;
  },
};

export default nextConfig;
