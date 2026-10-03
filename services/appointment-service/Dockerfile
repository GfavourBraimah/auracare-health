# syntax=docker/dockerfile:1
# AuraCare Health - Appointment Service
# Production Dockerfile: multi-stage build, non-root runtime user.

# ---------- Stage 1: deps ----------
# Installs production-only node_modules in an isolated layer.
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# node:20-alpine already ships a non-root "node" user (uid 1000, gid 1000);
# reuse it instead of creating a new one.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node index.js db.js ./
COPY --chown=node:node routes ./routes
COPY --chown=node:node db ./db

USER node

EXPOSE 3000

# Container-level health check hitting the same endpoint the ALB uses.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/api/appointments/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "index.js"]
