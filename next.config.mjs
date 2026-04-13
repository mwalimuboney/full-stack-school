/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},

  webpack: (config, { dev }, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "node:async_hooks": false,
      };
    }

    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [{ hostname: "images.pexels.com" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: [
        'improved-capybara-g4vxwqq65449fgp9-3000.app.github.dev', // Your specific Codespace URL
        'localhost:3000'
      ],
    },
  },
  serverExternalPackages: ["@prisma/client", "pg"],
};

export default nextConfig;
