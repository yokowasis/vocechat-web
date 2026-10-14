#!/bin/sh
set -e

# Default environment variables
export PORT="${PORT:-80}"
export BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
export CLIENT_MAX_BODY_SIZE="${CLIENT_MAX_BODY_SIZE:-100M}"

# Remove any trailing slash from BACKEND_URL
export BACKEND_URL="$(echo "$BACKEND_URL" | sed 's:/*$::')"

echo "Starting VoceChat Web Client..."
echo "  Port:            ${PORT}"
echo "  Backend URL:     ${BACKEND_URL}"
echo "  Max upload size: ${CLIENT_MAX_BODY_SIZE}"

# Substitute only the specified environment variables into nginx config
envsubst '${PORT} ${BACKEND_URL} ${CLIENT_MAX_BODY_SIZE}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
