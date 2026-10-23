# ==============================================================================
# Oops, Renewed! — Single-Container Production Dockerfile for Synology NAS
# Base: Node.js 22 Alpine (Optimized for minimal RAM usage < 100MB)
# ==============================================================================

# Stage 1: Build Frontend and Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Install native dependencies required by better-sqlite3 compilation
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build Vite React client (dist/client) and TypeScript backend (dist/server.js)
RUN npm run build:client && npm run build:server

# ==============================================================================
# Stage 2: Production Minimal Runtime
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Copy dependency manifests first for clean npm production installation
COPY package.json package-lock.json* ./

# Install native dependencies to compile better-sqlite3 for production, then remove compiler tools
RUN apk add --no-cache python3 make g++ \
    && npm ci --omit=dev \
    && apk del python3 make g++ \
    && rm -rf /root/.npm

# Copy built application assets and code from builder stage
COPY --from=builder /app/dist ./dist

# Create persistent data directory for SQLite database mount
RUN mkdir -p /app/data

# Default environment configuration
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/radar.db \
    DEFAULT_CURRENCY=PLN \
    TZ=Europe/Warsaw

EXPOSE 3000

# Built-in Alpine health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Graceful shutdown handler is registered directly in server.js (SIGTERM / SIGINT)
CMD ["node", "dist/server.js"]

