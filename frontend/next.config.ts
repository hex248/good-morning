import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.googleusercontent.com",
            },
        ],
    },
};

export default withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
})(nextConfig);
