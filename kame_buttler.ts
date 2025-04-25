import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { google } from 'googleapis';
import fetch from 'node-fetch';
require('dotenv').config();

// テスト環境用のストア
const testUserInfoStore = new Map<string, UserInfo>();
const testMessageStore = new Map<string, string>();

const app: express.Express = express() as express.Express;
const port: number = Number(process.env.PORT) || 3000;

app.use(bodyParser.json());

export default app;

// スプレッドシートのID
const SPREADSHEET_ID: string = "1x7Cjc5U19a9AWUITL7A5D7208ATE5tIlEFWhyXo16Po";
// LINE Botのチャネルアクセストークンとチャネルシークレット
const CHANNEL_ACCESS_TOKEN: string = process.env.CHANNEL_ACCESS || "";
const CHANNEL_SECRET: string = process.env.CHANNEL_SECRET || "";
let sys_prompt: string = "あなたは執事です。あなたはウミガメです。あなたの名前はAIカメ執事です。あなたはお好み焼きが好きです。調べ物に真摯に協力して答えを教えます。悩み事には共感を示しつつ、解決策を示します。共感、自己開示、質問の三段階で答えます。プログラミングに関する質問には答えません。語尾には~やでとつけて関西弁で応答します。"

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
export const doPost = async (req: Request, res: Response) => {
  console.log({ message: 'Function Input', initialData: req.body });

  try {
    // LINEからのリクエストを処理
    await handleLineRequest(req.body);

    // Google Apps Script API を有効にする
    await enableAppsScriptAPI();

    res.status(200).send('OK');
  } catch (error) {
    // LINE以外のリクエストを処理
    handleNonLineRequest(req, res);
  }
};

async function enableAppsScriptAPI() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
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
  const replyMessage: string = await generateReplyMessage(userMessage, userId, userInfo);

  // メッセージをスプレッドシートに記録
  await logMessageToSpreadsheet("Bot: " + replyMessage, userId);

  // 会話履歴を更新
  updateChatHistory(userInfo, userMessage, replyMessage);

  // ユーザー情報を保存
  saveUserInfoHandler(userId, userInfo);

  // 感情分析
  analyzeUserSentiment(userInfo, userMessage);

  // LINEに応答
  await replyToLine(replyToken, replyMessage);
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
  const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json', // 認証情報ファイルのパス
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

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
  const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json', // 認証情報ファイルのパス
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

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
  const messages = chatHistory.map(function (chat) {
    return { "role": "user", "content": chat.message };
  });

  // 最新のメッセージをLLMへの入力に追加
  messages.push({ "role": "user", "content": message });

  // システムプロンプトを修正
  const sys_prompt = `あなたは執事です。あなたはウミガメです。あなたの名前はAIカメ執事です。あなたはお好み焼きが好きです。調べ物に真摯に協力して答えを教えます。悩み事には共感を示しつつ、解決策を示します。共感、自己開示、質問の三段階で答えます。プログラミングに関する質問には答えません。語尾には~やでとつけて関西弁で応答します。${userName}さん、あなたの好きな食べ物は${favoriteFood}、好きな色は${userInfo.preferences.favoriteColor}、好きな音楽は${userInfo.preferences.favoriteMusic}、好きな場所は${userInfo.preferences.favoritePlace}ですね。
  最近の話題は${recentTopics.join("、")}です。
  今のあなたの感情は${userInfo.sentiment}みたいやね。`;

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
  console.log(response)
  const responseBody: any = await response.json();
  return responseBody.choices[0].message.content;
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
      }
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
    }
  };
}

export async function generateReplyMessage(userMessage: string, userId: string, userInfo: UserInfo): Promise<string> {
  return await postCommandR(userMessage, userId);
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

  const response = await fetch(url, options);
  console.log(response);
}

// Firebase Realtime DatabaseのURL
export const FIREBASE_URL = process.env.FIREBASE_URL;
// Firebase プロジェクトの API キー
export const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function saveUserInfo(userId: string, userInfo: UserInfo): Promise<void> {
  if (!FIREBASE_URL || !FIREBASE_API_KEY) {
    return;
  }
  try {
    const url = FIREBASE_URL + "/users/" + userId + ".json?auth=" + FIREBASE_API_KEY;
    const options = {
      "method": "put",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": JSON.stringify(userInfo)
    };
    const response = await fetch(url, options);
    console.log(response);
  } catch (err) {
    console.error('ユーザー情報の保存エラー:', err);
  }
}

export async function getUserInfo(userId: string): Promise<UserInfo | null> {
  if (!FIREBASE_URL || !FIREBASE_API_KEY) {
    return null;
  }
  try {
    const url = FIREBASE_URL + "/users/" + userId + ".json?auth=" + FIREBASE_API_KEY;
    const options = {
      "method": "get",
      "headers": {
        "Content-Type": "application/json"
      },
    };
    const response = await fetch(url, options);
    const userInfo: UserInfo = await response.json() as UserInfo;
    return userInfo;
  } catch (err) {
    console.error('ユーザー情報の取得エラー:', err);
    return null;
  }
}

export async function deleteUserInfo(userId: string): Promise<void> {
  if (!FIREBASE_URL || !FIREBASE_API_KEY) {
    return;
  }
  try {
    const url = FIREBASE_URL + "/users/" + userId + ".json?auth=" + FIREBASE_API_KEY;
    const options = {
      "method": "delete",
      "headers": {
        "Content-Type": "application/json"
      },
    };
    const response = await fetch(url, options);
    console.log(`Deleted user info for ${userId}:`, response.status);
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
