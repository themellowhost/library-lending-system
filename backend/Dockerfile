FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/index.ts ./src/index.ts

EXPOSE 5001
ENV PORT=5001
ENV NODE_ENV=production

CMD ["npx", "tsx", "src/index.ts"]
