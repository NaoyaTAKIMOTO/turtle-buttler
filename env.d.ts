declare namespace NodeJS {
  interface ProcessEnv {
    FIREBASE_URL: string;
    CREDENTIALS_ADMIN: string;
    SPREADSHEET_ID: string;
    CHANNEL_ACCESS: string;
    CHANNEL_SECRET: string;
    CO_API_KEY: string;
    CREDENTIALS?: string;
    CREDENTIALS_JSON?: string;
    NODE_ENV?: string;
  }
}
