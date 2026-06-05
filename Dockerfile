# syntax=docker/dockerfile:1.7

# --- Build stage ---------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps using the lockfile for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build the static bundle.
COPY . .
RUN npm run build

# --- Runtime stage -------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Custom nginx config (SPA-friendly, gzip, healthcheck endpoint).
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
