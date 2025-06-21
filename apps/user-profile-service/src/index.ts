#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express'; // Expressをインポート

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin SDKの初期化
const rawAdmin = process.env.CREDENTIALS_ADMIN;
if (!rawAdmin) {
  console.error('CREDENTIALS_ADMIN が未設定です。環境変数を確認してください。');
  throw new Error('CREDENTIALS_ADMIN が未設定です');
}
const decodedAdmin = Buffer.from(rawAdmin, 'base64').toString('utf-8');
let serviceAccount;
try {
  serviceAccount = JSON.parse(decodedAdmin);
} catch (err) {
  console.error('CREDENTIALS_ADMIN のデコード結果:', decodedAdmin);
  throw err;
}

try {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_URL,
  });
  console.error('Firebase Admin SDK initialized successfully.');
} catch (error) {
  if (error instanceof Error && error.message.includes('already exists')) {
    console.warn('Firebase app already initialized.');
  } else {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

const db = getDatabase();

const USER_PROFILE_PATH = 'userProfiles';

interface UserProfile {
  userId: string;
  name: string | null;
  favoriteFood: string | null;
  [key: string]: any;
}

class UserProfileServer {
  private server: Server; // MCP SDKのServerインスタンスは保持するが、直接は使わない

  constructor() {
    this.server = new Server(
      {
        name: 'user-profile-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Error handling
    this.server.onerror = (error: any) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      // await this.server.close(); // HTTPサーバーの場合は不要
      process.exit(0);
    });
  }

  private async handleGetUserProfile(args: any) {
    if (typeof args.userId !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid userId');
    }
    const userId = args.userId;

    try {
      const userRef = db.ref(`${USER_PROFILE_PATH}/${userId}`);
      const snapshot = await userRef.once('value');

      const userProfile: UserProfile = snapshot.exists()
        ? snapshot.val()
        : { userId, name: null, favoriteFood: null };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(userProfile, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to retrieve user profile: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleUpdateUserProfile(args: any) {
    if (typeof args.userId !== 'string' || typeof args.profileData !== 'object' || args.profileData === null) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid userId or profileData');
    }
    const userId = args.userId;
    const profileData = args.profileData;

    try {
      const userRef = db.ref(`${USER_PROFILE_PATH}/${userId}`);
      await userRef.update(profileData);

      const updatedSnapshot = await userRef.once('value');
      const updatedProfile: UserProfile = updatedSnapshot.val();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(updatedProfile, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to update user profile: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async startHttpServer() {
    const app = express();
    app.use(express.json()); // JSONボディをパースするために必要

    // ヘルスチェックエンドポイント
    app.get('/', (req, res) => {
      res.status(200).send('User Profile MCP server is running.');
    });

    // get_user_profile ツールエンドポイント
    app.post('/get_user_profile', async (req, res) => {
      try {
        const result = await this.handleGetUserProfile(req.body);
        res.json(result);
    } catch (error: unknown) { // error を unknown 型として明示
      console.error('Error in /get_user_profile:', error);
      if (error instanceof McpError) {
        res.status(400).json({ error: error.message, code: error.code });
      } else if (error instanceof Error) { // Error インスタンスの場合
        res.status(500).json({ error: error.message });
      } else { // その他の unknown なエラー
        res.status(500).json({ error: 'Internal Server Error' });
      }
      }
    });

    // update_user_profile ツールエンドポイント
    app.post('/update_user_profile', async (req, res) => {
      try {
        const result = await this.handleUpdateUserProfile(req.body);
        res.json(result);
    } catch (error: unknown) { // error を unknown 型として明示
      console.error('Error in /update_user_profile:', error);
      if (error instanceof McpError) {
        res.status(400).json({ error: error.message, code: error.code });
      } else if (error instanceof Error) { // Error インスタンスの場合
        res.status(500).json({ error: error.message });
      } else { // その他の unknown なエラー
        res.status(500).json({ error: 'Internal Server Error' });
      }
      }
    });

    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log(`User Profile MCP server listening on port ${port}`);
    });
  }
}

const server = new UserProfileServer();
server.startHttpServer().catch(console.error);
