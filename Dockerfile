# Stage 1: Build static web bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm matching project version
RUN npm install -g pnpm@10.14.0

# Copy dependency specifications and patch files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application source code
COPY . .

# Build production bundle with release flag
RUN pnpm build:release

# Stage 2: Production web server
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built bundle from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy Nginx configuration template and entrypoint
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Environment variables with defaults
ENV PORT=80
ENV BACKEND_URL=http://localhost:3000
ENV CLIENT_MAX_BODY_SIZE=100M

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
