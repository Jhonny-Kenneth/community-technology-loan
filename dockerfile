FROM node:22-alpine AS build
WORKDIR /app

# The deploy context is the repository root, but the API is a workspace under
# backend/. Install from its lockfile so Render builds the intended service.
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache curl
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Render supplies PORT (10000 by default); the API reads it at runtime.
EXPOSE 10000
CMD ["node", "dist/server.js"]
