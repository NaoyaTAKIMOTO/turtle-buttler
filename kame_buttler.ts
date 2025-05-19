import express, { Application, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import * as admin from 'firebase-admin';
require('dotenv').config();

// Firebase Admin SDKの初期化
const rawAdmin = process.env.CREDENTIALS_ADMIN;
if (!rawAdmin) throw new Error('CREDENTIALS_ADMIN が未設定です');
const decodedAdmin = Buffer.from(rawAdmin, 'base64').toString('utf-8');
let serviceAccount;
try {
  serviceAccount = JSON.parse(decodedAdmin);
} catch (err) {
  console.error('CREDENTIALS_ADMIN のデコード結果:', decodedAdmin);
  throw err;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL,
});

const db = admin.database();

// テスト環境用のストア
const testUserInfoStore = new Map<string, UserInfo>();
const testMessageStore = new Map<string, string>();

const app: Application = express();
const port: number = 8080;

app.use(bodyParser.json());
app.post(
  '/',
  async (req: Request, res: Response) => {
    await doPost(req, res);
  }
);

export default app;

// スプレッドシートのID
const SPREADSHEET_ID: string = process.env.SPREADSHEET_ID || "";
// LINE Botのチャネルアクセストークンとチャネルシークレット
const CHANNEL_ACCESS_TOKEN: string = process.env.CHANNEL_ACCESS || "";
const CHANNEL_SECRET: string = process.env.CHANNEL_SECRET || "";

import { BASE_SYSTEM_PROMPT, USER_INFO_PROMPT_TEMPLATE } from './prompts';

interface LineRequestBody {
  events: any[];
}

interface UserInfo {
  userId: string;
  userName: string;
  chatHistory: any[];
  recentTopics: string[];
  preferences: {
    favoriteFood: string;
    language: string;
    favoriteColor?: string;
    favoriteMusic?: string;
    favoritePlace?: string;
  };
  sentiment?: string;
}

/**
 * doPost関数：HTTP POSTリクエストを処理し、LINEからのメッセージを解析して応答を返します。
 * @param {object} req - リクエストオブジェクト。POSTリクエストの情報を含みます。
 */
export async function doPost(req: Request, res: Response) {
  console.log('Function Input', req.body);
  const isLineWebhook = Array.isArray(req.body.events) && req.body.events[0]?.replyToken;
  if (isLineWebhook) {
    try {
      await handleLineRequest(req.body);
    } catch (e) {
      console.error('handleLineRequest error', e);
    }
    return res.status(200).send('OK');
  } else {
    return handleNonLineRequest(req, res);
  }
}

async function enableAppsScriptAPI() {
  const rawCred = process.env.CREDENTIALS;
  if (!rawCred) throw new Error('CREDENTIALS が未設定です');
  const decodedCred = Buffer.from(rawCred, 'base64').toString('utf-8');
  let credentials;
  try {
    credentials = JSON.parse(decodedCred);
  } catch (err) {
    console.error('CREDENTIALS のデコード結果:', decodedCred);
    throw err;
  }
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/script.projects'],
  });

  // Apps Script API クライアントを初期化（認証情報を auth に渡す）
  const script = google.script({ version: 'v1', auth });

  try {
    const res = await script.projects.create({
      requestBody: {
        title: 'AIカメ執事',
      },
    });
    console.log('Apps Script API が有効になりました。', res.data);
  } catch (error) {
    console.error('Apps Script API の有効化エラー:', error);
  }
}

/**
 * handleLineRequest関数：LINEからのリクエストを処理します。
 * @param {object} body - リクエストボディ。POSTリクエストの情報を含みます。
 */
export async function handleLineRequest(body: LineRequestBody) {
  const eventData: any = body.events[0];
  console.log(eventData);

  //取得したデータから、応答用のトークンを取得
  const replyToken: string = eventData.replyToken;
  //取得したデータから、メッセージ種別を取得
  const messageType: string = eventData.message.type;
  //取得したデータから、ユーザーが投稿したメッセージを取得
  const userMessage: string = eventData.message.text;
  const userId: string = eventData.source.userId;

  // ユーザー名更新
  await updateUserNameHandler(userMessage, userId, replyToken);

  // 好きな食べ物更新
  await updateFavoriteFoodHandler(userMessage, userId, replyToken);

  // メッセージをスプレッドシートに記録
  await logMessageToSpreadsheet(userMessage, userId);

  // ユーザー情報を取得または初期化
  const userInfo: UserInfo = await getUserInfoHandler(userId);

  // 最近の話題を更新
  userInfo.recentTopics.push(userMessage);
  // recentTopicsの要素数が5を超えた場合は、古い要素を削除
  if (userInfo.recentTopics.length > 5) {
    userInfo.recentTopics.shift();
  }

  // 応答メッセージを生成
  let replyMessage: string;

  replyMessage = await generateReplyMessage(userMessage, userId, userInfo);

  console.log('Reply message:', replyMessage);

  // メッセージをスプレッドシートに記録
  await logMessageToSpreadsheet("Bot: " + replyMessage, userId);

  // 会話履歴を更新
  updateChatHistory(userInfo, userMessage, replyMessage);

  // ユーザー情報を保存
  saveUserInfoHandler(userId, userInfo);
  console.log('DB:', userInfo);

  // 感情分析
  analyzeUserSentiment(userInfo, userMessage);

  // テスト環境では返信をスキップ
  if (process.env.NODE_ENV !== 'test') {
    await replyToLine(replyToken, replyMessage);
  }
}

/**
 * handleNonLineRequest関数：LINE以外からのリクエストを処理します。
 * @param {object} req - リクエストオブジェクト。
 * @param {object} res - レスポンスオブジェクト。
 */
export function handleNonLineRequest(req: Request, res: Response) {
  const requestBody = JSON.stringify(req.body);
  console.log("LINE以外のリクエストを受信しました: " + requestBody);
  // ContentServiceを使用してJSON形式で応答を返す
  res.status(200).json({ "message": "LINE以外からのリクエストを受け付けました。" });
}

// 受信したメッセージの内容と送信元のユーザーIDをスプレッドシートに記録する
export async function logMessageToSpreadsheet(message: string, userId: string) {
  // テスト環境では、スプレッドシートへの書き込みをスキップ
  if (process.env.NODE_ENV === "test") {
    testMessageStore.set(userId, message);
    return;
  }
  let auth: any;
  if (process.env.CREDENTIALS) {
    const decoded = Buffer.from(process.env.CREDENTIALS, 'base64').toString('utf-8');
    const credentials = JSON.parse(decoded);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    auth = new google.auth.GoogleAuth({
      keyFile: process.env.CREDENTIALS_JSON,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  //認証クライアントを作成
  const client = await auth.getClient();

  //Google Sheets APIにアクセス
  const googleSheets = google.sheets({ version: 'v4', auth: client as any });

  const spreadsheetId = SPREADSHEET_ID;

  // データの追加
  const appendOptions = {
    spreadsheetId: spreadsheetId,
    range: 'シート1!A1', // シート名と追加する範囲
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [
        [new Date(), userId, message],
      ],
    },
  };
  try {
    const appendResponse = await googleSheets.spreadsheets.values.append(appendOptions);
    console.log('スプレッドシートにデータを追加しました。', appendResponse.data);
  } catch (err) {
    console.error('スプレッドシートへのデータ追加エラー:', err);
  }
}

export async function getLatestMessageByUserId(userId: string): Promise<string | null> {
  // テスト環境では、メモリからメッセージを取得
  if (process.env.NODE_ENV === "test") {
    return testMessageStore.get(userId) || null;
  }
  let auth: any;
  if (process.env.CREDENTIALS) {
    const decoded = Buffer.from(process.env.CREDENTIALS, 'base64').toString('utf-8');
    const credentials = JSON.parse(decoded);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  } else {
    auth = new google.auth.GoogleAuth({
      keyFile: process.env.CREDENTIALS_JSON,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  //認証クライアントを作成
  const client = await auth.getClient();

  //Google Sheets APIにアクセス
  const googleSheets = google.sheets({ version: 'v4', auth: client as any });

  const spreadsheetId = SPREADSHEET_ID;
  const range = 'シート1!A1:C'; // 取得する範囲

  try {
    const getOptions = {
      spreadsheetId: spreadsheetId,
      range: range,
    };
    const getResponse = await googleSheets.spreadsheets.values.get(getOptions);
    const data = getResponse.data.values;

    let latestMessage: string | null = null;
    let latestTimestamp: Date = new Date(0); // 初期値を最も古い日付に設定
    let latestBotMessage: string | null = null;
    let latestBotTimestamp: Date = new Date(0);

    if (data) {
      for (const row of data) {
        const rowUserId = row[1]; // userIdが格納されている列のインデックスを指定します
        const message = row[2]; // messageが格納されている列のインデックスを指定します
        const timestamp = new Date(row[0]); // timestampが格納されている列のインデックスを指定します

        // userIdが一致し、最新のタイムスタンプである場合
        if (rowUserId === userId && !message.includes("Bot:") && timestamp > latestTimestamp) {
          latestMessage = message;
          latestTimestamp = timestamp;
        } else if (rowUserId === userId && message.includes("Bot:") && timestamp > latestTimestamp) {
          // うまくユーザの発話に対応したbotの発話を抜き出せないなぁ
          latestBotMessage = message;
          latestBotTimestamp = timestamp;
        }
      }
    }

    // 最新のメッセージを返す
    return latestMessage + "()" + latestBotMessage;
  } catch (err) {
    console.error('スプレッドシートからのデータ取得エラー:', err);
    return null;
  }
}

export function testGetLatestMessageByUserId() {
  console.log(getLatestMessageByUserId("Ubf4914e7aed629eac617ce8d66410f49"))
}

// 受信したメッセージに応じて応答を生成
export function getReplyMessage(message: string): string {
  // メッセージに応じて固定の応答を返す
  switch (message) {
    case "こんにちは":
      return "まいど！カメ執事のAIやで！";
    case "ありがとう":
      return "どういたしましてやで！お役に立てて嬉しいで！";
    default:
      return "すんまへん、ようわかりまへんでした。もっと詳しく教えてくれると嬉しいで！";
  }
}

/**
 * postCommandR関数：ユーザーのメッセージに基づいて、LLMに応答を生成させます。
 * @param {string} message - ユーザーからのメッセージ。
 * @param {string} userId - ユーザーID。
 * @return {string} - LLMからの応答。
 */
export async function postCommandR(message: string, userId: string): Promise<string> {
  console.log(message);
  // ユーザー情報を取得
  const userInfo = await getUserInfoHandler(userId);
  // LLMへのリクエストを生成
  const payload = createCoherePayload(message, userInfo);
  // LLMにリクエストを送信して応答を取得
  const response = await getCohereResponse(payload);
  return response;
}

/**
 * createCoherePayload関数：Cohere APIに送信するペイロードを生成します。
 * @param {string} message - ユーザーからのメッセージ。
 * @param {object} userInfo - ユーザー情報。
 * @return {object} - Cohere APIに送信するペイロード。
 */
export function createCoherePayload(message: string, userInfo: UserInfo) {
  const CO_API_KEY = process.env.CO_API_KEY;

  // ユーザー名を取得
  const userName = userInfo.userName || "";

  // 好きな食べ物を取得
  const favoriteFood = userInfo.preferences && userInfo.preferences.favoriteFood || "お好み焼き";

  // 最近の話題を取得
  const recentTopics = userInfo.recentTopics || [];

  // 会話履歴を取得
  const chatHistory = userInfo.chatHistory || [];

  // 会話履歴をLLMへの入力形式に変換
  const messages = chatHistory.flatMap(chat => [
    { "role": "user", "content": chat.message },
    { "role": "assistant", "content": chat.response }
  ]);

  // 最新のメッセージをLLMへの入力に追加
  messages.push({ "role": "user", "content": message });

  // システムプロンプトを生成
  const userInfoPrompt = USER_INFO_PROMPT_TEMPLATE
    .replace('${userName}', userName)
    .replace('${favoriteFood}', favoriteFood)
    .replace('${recentTopics}', recentTopics.join("、"))
    .replace('${sentiment}', userInfo.sentiment || "普通");

  const sys_prompt = BASE_SYSTEM_PROMPT + userInfoPrompt;

  const payload = JSON.stringify({
    "model": "command-r-plus",
    "messages": [
      { "role": "system", "content": sys_prompt },
      ...messages
    ]
  });
  return payload;
}

/**
 * getCohereResponse関数：Cohere APIにリクエストを送信して応答を取得します。
 * @param {object} payload - Cohere APIに送信するペイロード。
 * @return {string} - LLMからの応答。
 */
export async function getCohereResponse(payload: string): Promise<string> {
  const CO_API_KEY = process.env.CO_API_KEY;
  const url = "https://api.cohere.com/v2/chat";
  const headers: { [key: string]: string } = {
    "accept": "application/json",
    "content-type": "application/json",
    "Authorization": "Bearer " + CO_API_KEY
  };
  const options: { method: string; headers: { [key: string]: string }; body: string } = {
    "method": "post",
    "headers": headers,
    "body": payload
  };
  console.log(options)

  const response = await fetch(url, options);
  const responseBody: any = await response.json();
  console.log('Full Cohere response:', JSON.stringify(responseBody, null, 2));

  function extractText(raw: any): string {
    if (raw == null) return '';
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw.map(extractText).join('');
    if (typeof raw === 'object') {
      if ('text' in raw && typeof raw.text === 'string') return raw.text;
      if ('content' in raw) return extractText((raw as any).content);
      return JSON.stringify(raw);
    }
    return '';
  }

  // choices を優先
  if (Array.isArray(responseBody.choices) && responseBody.choices.length > 0) {
    const raw = responseBody.choices[0].message?.content ?? responseBody.choices[0].message ?? responseBody.choices[0];
    const text = extractText(raw);
    console.log('Resolved content:', text);
    return text;
  }
  // message.content をフォールバックで処理
  if (responseBody.message) {
    const raw = responseBody.message.content ?? responseBody.message;
    const text = extractText(raw);
    console.log('Resolved content:', text);
    return text;
  }
  throw new Error('Invalid Cohere responseBody');
}

/**
 * createGeminiPayload関数：Gemini APIに送信するペイロードを生成します。
 * @param {string} message - ユーザーからのメッセージ。
 * @param {object} userInfo - ユーザー情報。
 * @return {object} - Gemini APIに送信するペイロード。
 */
export function createGeminiPayload(message: string, userInfo: UserInfo) {
  // ユーザー名を取得
  const userName = userInfo.userName || "";

  // 好きな食べ物を取得
  const favoriteFood = userInfo.preferences && userInfo.preferences.favoriteFood || "お好み焼き";

  // 最近の話題を取得
  const recentTopics = userInfo.recentTopics || [];

  // 会話履歴を取得
  const chatHistory = userInfo.chatHistory || [];

  // 会話履歴をLLMへの入力形式に変換
  const history = chatHistory.flatMap(chat => [
    { "role": "user", "parts": [{ "text": chat.message }] },
    { "role": "model", "parts": [{ "text": chat.response }] }
  ]);

  // システムプロンプトを生成
  const userInfoPrompt = USER_INFO_PROMPT_TEMPLATE
    .replace('${userName}', userName)
    .replace('${favoriteFood}', favoriteFood)
    .replace('${recentTopics}', recentTopics.join("、"))
    .replace('${sentiment}', userInfo.sentiment || "普通");

  const sys_prompt = BASE_SYSTEM_PROMPT + userInfoPrompt;

  const contents = [
    { "role": "user", "parts": [{ "text": sys_prompt }] },
    { "role": "model", "parts": [{ "text": "承知いたしました。どのようなご用件でしょうか？" }] }, // システムプロンプトへの応答例
    ...history,
    { "role": "user", "parts": [{ "text": message }] }
  ];

  const payload = JSON.stringify({
    "contents": contents
  });
  return payload;
}

/**
 * getGeminiResponse関数：Gemini APIにリクエストを送信して応答を取得します。
 * @param {object} payload - Gemini APIに送信するペイロード。
 * @return {string} - LLMからの応答。
 */
export async function getGeminiResponse(payload: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY 環境変数が設定されていません。');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`; // クエリパラメータからキーを削除
  const headers: { [key: string]: string } = {
    "Content-Type": "application/json",
    "x-goog-api-key": GEMINI_API_KEY.replace(/^"|"$/g, '') // ヘッダーにキーを追加
  };
  const options: { method: string; headers: { [key: string]: string }; body: string } = {
    "method": "post",
    "headers": headers,
    "body": payload
  };
  console.log(options)

  const response = await fetch(url, options);
  const responseBody: any = await response.json();
  console.log('Full Gemini response:', JSON.stringify(responseBody, null, 2));
  console.log('Gemini response status:', response.status);
  console.log('Gemini response status text:', response.statusText);

  if (responseBody && responseBody.candidates && responseBody.candidates.length > 0) {
    const candidate = responseBody.candidates[0];
    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
      console.log('Gemini response text:', candidate.content.parts[0].text);
      return candidate.content.parts[0].text;
    }
  }
  throw new Error('Invalid Gemini responseBody');
}

/**
 * postGemini関数：ユーザーのメッセージに基づいて、Geminiに応答を生成させます。
 * @param {string} message - ユーザーからのメッセージ。
 * @param {string} userId - ユーザーID。
 * @return {string} - Geminiからの応答。
 */
export async function postGemini(message: string, userId: string): Promise<string> {
  console.log(message);
  // ユーザー情報を取得
  const userInfo = await getUserInfoHandler(userId);
  // LLMへのリクエストを生成
  const payload = createGeminiPayload(message, userInfo);
  // LLMにリクエストを送信して応答を取得
  const response = await getGeminiResponse(payload);
  return response;
}


export async function updateUserName(message: string, userId: string): Promise<string | null> {
  const userInfo = await getUserInfoHandler(userId);
  if (message.startsWith("名前は")) {
    const newName = message.substring(3).trim();
    userInfo.userName = newName;
    saveUserInfo(userId, userInfo);
    return newName + "やね！これからよろしくやで！";
  }
  return null;
}

export async function updateUserNameHandler(message: string, userId: string, replyToken: string): Promise<boolean> {
  const userNameUpdateResult = await updateUserName(message, userId);
  if (userNameUpdateResult) {
    await replyToLine(replyToken, userNameUpdateResult);
    return true;
  }
  return false;
}

export async function updateFavoriteFood(message: string, userId: string): Promise<string | null> {
  if (message.startsWith("好きな食べ物は")) {
    const newFood = message.substring(7).trim();
    let userInfo: any;
    if (process.env.NODE_ENV !== "test") {
      userInfo = await getUserInfoHandler(userId);
      userInfo.preferences.favoriteFood = newFood;
      await saveUserInfo(userId, userInfo);
    }
    return `${newFood}か！ええやん！`;
  }
  return null; // メッセージが一致しない場合は null を返す
}

export async function updateFavoriteFoodHandler(message: string, userId: string, replyToken: string): Promise<boolean> {
  const favoriteFoodUpdateResult = await updateFavoriteFood(message, userId);
  if (favoriteFoodUpdateResult) {
    await replyToLine(replyToken, favoriteFoodUpdateResult);
    return true;
  }
  return false;
}

export async function updateFavoriteColor(message: string, userId: string): Promise<string | null> {
  if (message.startsWith("好きな色は")) {
    const newColor = message.substring(5).trim();
    let userInfo: any;
    if (process.env.NODE_ENV !== "test") {
      userInfo = await getUserInfoHandler(userId);
      userInfo.preferences.favoriteColor = newColor;
      await saveUserInfo(userId, userInfo);
    }
    return `${newColor}か！素敵な色やね！`;
  }
  return null; // メッセージが一致しない場合は null を返す
}

export async function updateFavoriteMusic(message: string, userId: string): Promise<string | null> {
  if (message.startsWith("好きな音楽は")) {
    const newMusic = message.substring(6).trim();
    let userInfo: any;
    if (process.env.NODE_ENV !== "test") {
      userInfo = await getUserInfoHandler(userId);
      userInfo.preferences.favoriteMusic = newMusic;
      await saveUserInfo(userId, userInfo);
    }
    return `${newMusic}か！ええ趣味やね！`;
  }
  return null; // メッセージが一致しない場合は null を返す
}

export async function updateFavoritePlace(message: string, userId: string): Promise<string | null> {
  if (message.startsWith("好きな場所は")) {
    const newPlace = message.substring(6).trim();
    let userInfo: any;
    if (process.env.NODE_ENV !== "test") {
      userInfo = await getUserInfoHandler(userId);
      userInfo.preferences.favoritePlace = newPlace;
      await saveUserInfo(userId, userInfo);
    }
    return `${newPlace}か！行ってみたいなぁ！`;
  }
  return null; // メッセージが一致しない場合は null を返す
}

export async function getUserInfoHandler(userId: string): Promise<UserInfo> {
  // テスト環境ではデフォルト値を返す
  if (process.env.NODE_ENV === "test") {
    return {
      userId,
      userName: "",
      chatHistory: [],
      recentTopics: [],
      preferences: {
        favoriteFood: "お好み焼き",
        language: "関西弁",
        favoriteColor: "",
        favoriteMusic: "",
        favoritePlace: ""
      },
      sentiment: "普通"
    };
  }
  // 本番環境では Firebase から取得
  const stored = await getUserInfo(userId);
  return (stored as UserInfo) || {
    userId,
    userName: "",
    chatHistory: [],
    recentTopics: [],
    preferences: {
      favoriteFood: "お好み焼き",
      language: "関西弁",
      favoriteColor: "",
      favoriteMusic: "",
      favoritePlace: ""
    },
    sentiment: "普通"
  };
}

export async function generateReplyMessage(userMessage: string, userId: string, userInfo: UserInfo): Promise<string> {
  try {
    return await postGemini(userMessage, userId);
  } catch (err) {
    console.error('Gemini呼び出し失敗, Cohereにフォールバック:', err);
    return await postCommandR(userMessage, userId);
  }
}

export function updateChatHistory(userInfo: UserInfo, userMessage: string, replyMessage: string): void {
  userInfo.chatHistory.push({
    "timestamp": new Date().toISOString(),
    "message": userMessage,
    "response": replyMessage
  });
}

export function saveUserInfoHandler(userId: string, userInfo: UserInfo): void {
  saveUserInfo(userId, userInfo);
}

export function analyzeUserSentiment(userInfo: UserInfo, message: string): void {
  const userSentiment = analyzeSentiment(message);
  userInfo.sentiment = userSentiment;
}

// LINEに応答を返す
export async function replyToLine(replyToken: string, message: string) {
  const url = "https://api.line.me/v2/bot/message/reply";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
  };
  const data = {
    "replyToken": replyToken,
    "messages": [{
      "type": "text",
      "text": message
    }]
  };
  const options = {
    "method": "post",
    "headers": headers,
    "body": JSON.stringify(data)
  };
  console.log('ReplyToLine payload:', data);

  const response = await fetch(url, options);
  console.log(response);
}

// Firebase Realtime DatabaseのURL
export const FIREBASE_URL = process.env.FIREBASE_URL;

export async function saveUserInfo(userId: string, userInfo: UserInfo): Promise<void> {
  try {
    const userRef = db.ref("users/" + userId);
    await userRef.set(userInfo);
    console.log(`User info saved for ${userId}`);
  } catch (err) {
    console.error('ユーザー情報の保存エラー:', err);
  }
}

export async function getUserInfo(userId: string): Promise<UserInfo | null> {
  try {
    const userRef = db.ref("users/" + userId);
    const snapshot = await userRef.once("value");
    if (snapshot.exists()) {
      return snapshot.val() as UserInfo;
    } else {
      return null;
    }
  } catch (err) {
    console.error('ユーザー情報の取得エラー:', err);
    return null;
  }
}

export async function deleteUserInfo(userId: string): Promise<void> {
  try {
    const userRef = db.ref("users/" + userId);
    await userRef.remove();
    console.log(`Deleted user info for ${userId}`);
  } catch (err) {
    console.error('ユーザー情報の削除エラー:', err);
  }
}

// 感情分析を行う関数
export function analyzeSentiment(message: string): string {
  // 簡単なキーワードマッチングで感情を分析
  if (message.includes("嬉しい") || message.includes("楽しい") || message.includes("幸せ")) {
    return "positive";
  } else if (message.includes("悲しい") || message.includes("辛い") || message.includes("苦しい")) {
    return "negative";
  } else if (message.includes("怒り") || message.includes("ムカつく") || message.includes("イライラ")) {
    return "angry";
  } else {
    return "neutral";
  }
}

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Kame Butler listening on port ${port}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
