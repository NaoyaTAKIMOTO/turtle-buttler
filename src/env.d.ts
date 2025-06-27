declare namespace NodeJS {
  interface ProcessEnv {
    FIREBASE_URL: string;
    CREDENTIALS_ADMIN: string;
    CHANNEL_ACCESS: string;
    CHANNEL_SECRET: string;
    NODE_ENV?: string;
  }
}
