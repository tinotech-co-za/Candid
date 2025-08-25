/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  images: {
    domains: ["files.convex.dev"],
  },
};

module.exports = nextConfig;
