# syntax=docker/dockerfile:1
# AuraCare Health - Patient Portal frontend
# Production Dockerfile: multi-stage build, non-root nginx runtime.

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
# nginxinc/nginx-unprivileged already runs as a non-root user (uid 101)
# and, because non-root processes cannot bind to privileged ports (<1024)
# without extra Linux capabilities, it listens on 8080 by default rather
# than 80. We keep that default here and map host port 80 -> container
# port 8080 at the docker-compose / `docker run -p 80:8080` level, so the
# service is still reachable on port 80 externally without granting
# CAP_NET_BIND_SERVICE or running as root.
FROM nginxinc/nginx-unprivileged:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Image already runs as the non-root "nginx" user (uid 101) by default.

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O- http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
