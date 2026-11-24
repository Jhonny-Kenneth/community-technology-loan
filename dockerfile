FROM node:22-alpine AS build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/tsconfig.json ./
COPY frontend/src ./src
RUN npm run build

FROM nginx:1.29-alpine AS runtime
ENV NGINX_ENVSUBST_FILTER="^(PORT|API_UPSTREAM)$"
COPY frontend/index.html /usr/share/nginx/html/index.html
COPY frontend/css /usr/share/nginx/html/css
COPY --from=build /app/frontend/js /usr/share/nginx/html/js
COPY deploy/nginx-render.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 10000
