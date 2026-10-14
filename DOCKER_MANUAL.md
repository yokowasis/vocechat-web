# VoceChat Web Client - Docker Manual

This document explains how to build, configure, and run the customized **VoceChat Web Client** using Docker.

---

## 1. Overview & Architecture

The VoceChat Web Client Docker image uses a multi-stage build:
1. **Builder Stage (`node:22-alpine`)**: Installs dependencies with `pnpm` (including patches for `@toast-ui/editor` and `slate-react`) and compiles the production-ready React 19 bundle with Webpack.
2. **Server Stage (`nginx:alpine`)**: Serves the compiled static files using high-performance Nginx, while acting as a reverse proxy for the backend API and real-time Server-Sent Events (SSE).

### Network Flow:
```
[ User Browser ]
       │
       ▼ (Port 80/8080)
[ Nginx (vocechat-web) ]
  ├── Static Files (HTML / JS / CSS / Audio UI) -> Served directly
  └── /api/* -> Proxied to VoceChat Backend (e.g. http://vocechat-server:3000)
       ├── API Endpoints (Auth, Messages, Users, Uploads)
       └── Real-time SSE Stream (/api/user/events)
```

---

## 2. Environment Variables

All environment variables can be configured at runtime when starting the container without rebuilding the image:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `BACKEND_URL` | `http://localhost:3000` | The URL of the VoceChat backend server (e.g., `http://vocechat-server:3000` or `http://host.docker.internal:3000`). |
| `PORT` | `80` | The internal HTTP port Nginx listens on inside the container. |
| `CLIENT_MAX_BODY_SIZE` | `100M` | Maximum allowed request size for uploads (audio recordings, avatars, file resources). |

---

## 3. Building the Docker Image

To build the Docker image locally:

```bash
docker build -t vocechat-web:latest .
```

To build with a specific tag (e.g., your GitHub Docker registry or custom version):

```bash
docker build -t yokowasis/vocechat:latest .
docker push yokowasis/vocechat:latest
```

---

## 4. Running the Container

### Option A: Running against a VoceChat backend on the host

If your VoceChat backend is already running on the host machine at `http://localhost:3000`:

```bash
docker run -d \
  --name vocechat-web \
  -p 8080:80 \
  -e BACKEND_URL=http://host.docker.internal:3000 \
  --add-host=host.docker.internal:host-gateway \
  yokowasis/vocechat:latest
```

Open your browser at `http://localhost:8080`.

---

### Option B: Running in an existing Docker network

If your backend is already running in a Docker network:

```bash
# 1. Inspect or create your Docker network
docker network create vocechat-net

# 2. Connect your existing backend (e.g. vocechat-server) to the network
docker network connect vocechat-net vocechat-server

# 3. Run vocechat-web inside the same network
docker run -d \
  --name vocechat-web \
  --network vocechat-net \
  -p 8080:80 \
  -e BACKEND_URL=http://vocechat-server:3000 \
  yokowasis/vocechat:latest
```

---

## 5. Running Full Stack with Docker Compose

A ready-to-run compose configuration is provided in `docker-compose.yml` (and an example in `docker-compose.example.yml`).

### Quick Start:
```bash
docker compose up -d
```

### `docker-compose.yml` Content:
```yaml
services:
  vocechat-server:
    image: privoce/vocechat-server:latest
    container_name: vocechat-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - vocechat-data:/home/vocechat-server/data

  vocechat-web:
    image: yokowasis/vocechat:latest
    container_name: vocechat-web
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      - BACKEND_URL=http://vocechat-server:3000
      - PORT=80
      - CLIENT_MAX_BODY_SIZE=100M
    depends_on:
      - vocechat-server

volumes:
  vocechat-data:
```

Access the web client at `http://localhost:8080`.

---

## 6. Key Features & Modifications Included

1. **Audio Message Recording**:
   - Built-in audio recorder button in the chat input toolbar.
   - Click to start recording, live timer display, cancel (`✕`) or confirm & send (`✓`).
   - In-chat waveform audio player powered by WaveSurfer.
2. **Simplified Chat UI**:
   - Forward message button removed from message hover toolbar, context menu, and multi-selection mode.
   - File attach/upload button removed from toolbar.
   - File drag-and-drop and clipboard paste upload listeners removed.
3. **Nginx Reverse Proxy & SSE Optimization**:
   - Unbuffered SSE streaming (`proxy_buffering off;`) to preserve real-time updates and low latency.
   - Static asset compression (Gzip) and immutable caching for hashed chunks.
