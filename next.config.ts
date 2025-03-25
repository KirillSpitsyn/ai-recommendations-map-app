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
};

export default nextConfig;
