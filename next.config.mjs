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
  webpack: (config, { isServer, webpack }) => {
    // Fix for FHEVM SDK browser compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
      
      // Define global for browser environment
      config.plugins.push(
        new webpack.DefinePlugin({
          global: 'globalThis',
        })
      )
      
      // Enable WASM support for FHEVM SDK
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      }
      
      // Add WASM file support
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      })
    }
    return config
  },
}

export default nextConfig