module.exports = {
  apps: [
    {
      name: "go-backend",
      script: "./backend/go.sh",
      cwd: "./backend",
      interpreter: "/bin/bash",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "next-frontend",
      script: "npm",
      args: "start",
      cwd: "./frontend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
