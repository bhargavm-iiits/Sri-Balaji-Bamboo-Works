FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY dist ./dist
COPY backend ./backend
COPY scripts ./scripts
COPY tests ./tests
COPY build-offline.mjs server.mjs ./
RUN npm run build && npm run check && npm test

FROM node:24-alpine
RUN apk add --no-cache su-exec
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/backend ./backend
COPY --from=build --chown=node:node /app/server.mjs /app/package.json ./
COPY docker-entrypoint.sh /usr/local/bin/storefront-entrypoint
RUN chmod 755 /usr/local/bin/storefront-entrypoint && mkdir -p /app/storage && chown node:node /app/storage
ENV NODE_ENV=production HOST=0.0.0.0 PORT=10000 DATA_DIR=/app/storage INDEXING_ENABLED=false
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["storefront-entrypoint"]
CMD ["node", "server.mjs"]
