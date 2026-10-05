# syntax=docker/dockerfile:1
# Example Dockerfile for a Node.js application using Alpine Linux

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3443

CMD ["node", "src/server.js"]
