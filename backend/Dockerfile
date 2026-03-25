# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 (requires native compilation)
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package.json ./

# Create data directory and set permissions
RUN mkdir -p /data && chown -R appuser:appgroup /data /app

USER appuser

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/feraille.db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/app.js"]
