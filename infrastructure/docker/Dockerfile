# 単一ステージビルド
FROM node:20-alpine

WORKDIR /app

# 依存関係インストール
COPY package*.json tsconfig.json ./
COPY config/ ./config/
RUN npm install

# ソースコピー & ビルド
COPY src/ ./src/
RUN npm run build 

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "run", "start"]
