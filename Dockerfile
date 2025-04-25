FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# ソースコードをコピー
COPY . .

# 必要なパッケージをインストール
RUN npm install

# 環境変数を設定
ENV CHANNEL_ACCESS_TOKEN=${CHANNEL_ACCESS_TOKEN}
ENV CHANNEL_SECRET=${CHANNEL_SECRET}
ENV CO_API_KEY=${CO_API_KEY}
ENV FIREBASE_URL=${FIREBASE_URL}
ENV FIREBASE_API_KEY=${FIREBASE_API_KEY}
ENV GOOGLE_API_KEY=${GOOGLE_API_KEY}

# ポートを設定
EXPOSE 3000

# 起動コマンド
CMD ["node", "kame_butler.js"]
