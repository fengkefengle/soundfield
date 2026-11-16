FROM node:24-bookworm-slim AS build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/src/ ./src/
COPY --from=build /app/client/dist/ /app/client/dist/
COPY client/src/imported-bank.json /app/client/src/imported-bank.json
RUN mkdir -p /app/server/data && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
