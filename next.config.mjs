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
      
      // Enable WASM support for FHEVM SDK bundle
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