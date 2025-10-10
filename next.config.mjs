/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add headers for WASM and worker thread support (FHEVM v0.8.1)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer, webpack }) => {
    // Fix for FHEVM SDK browser compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: 'path-browserify',
        // Add polyfills for web version
        buffer: 'buffer',
        process: 'process/browser',
        // Fix for tfhe_bg.wasm
        'tfhe_bg.wasm': 'tfhe/tfhe_bg.wasm',
      }
      
      // Define global for browser environment and add polyfills
      config.plugins.push(
        new webpack.DefinePlugin({
          global: 'globalThis',
          process: 'process',
        }),
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      )
      
      // Enable WASM support for FHEVM SDK
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      }
      
      // Handle WASM files properly
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
      })
    }
    return config
  },
}

export default nextConfig