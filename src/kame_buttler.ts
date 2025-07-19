import express, { Application, Request, Response } from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
// Firebase Admin SDKの直接的なインポートと初期化を削除
// import * as admin from 'firebase-admin';
require('dotenv').config();

// MCPツールを呼び出すためのヘルパー関数
declare function use_mcp_tool(server_name: string, tool_name: string, arguments: any): Promise<any>;

// スタンプIDから感情を分析する関数
export function analyzeStickerEmotion(packageId: string, stickerId: string): string {
  // LINE公式スタンプの感情マッピング
  const emotionMap: { [key: string]: string } = {
    // Brown & Cony (packageId: 1)
    '1/1': 'happy',     // Brown happy
    '1/2': 'love',      // Brown love
    '1/3': 'sad',       // Brown sad
    '1/4': 'angry',     // Brown angry
    '1/5': 'surprised', // Brown surprised
    '1/6': 'sleepy',    // Brown sleepy
    '1/7': 'confused',  // Brown confused
    '1/8': 'excited',   // Brown excited
    '1/9': 'crying',    // Brown crying
    '1/10': 'laughing', // Brown laughing
    
    // Moon (packageId: 2)
    '2/1': 'happy',
    '2/2': 'love',
    '2/3': 'sad',
    '2/4': 'angry',
    '2/5': 'surprised',
    
    // 基本感情スタンプ (packageId: 11537)
    '11537/52002734': 'happy',
    '11537/52002735': 'sad',
    '11537/52002736': 'angry',
    '11537/52002737': 'love',
    '11537/52002738': 'surprised',
    '11537/52002739': 'tired',
    '11537/52002740': 'excited',
    
    // よく使われるスタンプの感情推定
    // 数字が小さい方が基本的にポジティブ、大きい方がネガティブな傾向
  };
  
  const key = `${packageId}/${stickerId}`;
  
  if (emotionMap[key]) {
    return emotionMap[key];
  }
  
  // 未知のスタンプは一律neutralとして扱う
  return 'neutral';
}

// MCPツール用のフォールバック実装（テスト環境および未実装時）
async function use_mcp_tool_fallback(server_name: string, tool_name: string, args: any): Promise<any> {
  if (process.env.NODE_ENV === 'test') {
    // テスト環境では適切なモックデータを返す
    if (server_name === 'user-profile-server' && tool_name === 'get_user_profile') {
      const userId = args.userId;
      return JSON.stringify(testUserInfoStore.get(userId) || {
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
      });
    }
    if (server_name === 'user-profile-server' && tool_name === 'update_user_profile') {
      testUserInfoStore.set(args.userId, args.profileData);
      return 'success';
    }
    if (server_name === 'rakuten-server' && tool_name === 'search_rakuten_items') {
      return JSON.stringify([
        {
          name: "テスト商品",
          price: "1000円",
          url: "https://example.com/product"
        }
      ]);
    }
  }
  
  // 本番環境でMCPツールが利用できない場合は、直接HTTPリクエストを送信
  if (server_name === 'user-profile-server') {
    const serviceUrl = process.env.USER_PROFILE_SERVICE_URL;
    if (serviceUrl) {
      const response = await fetch(`${serviceUrl}/${tool_name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      return await response.text();
    }
  }
  
  if (server_name === 'rakuten-server') {
    const serviceUrl = process.env.RAKUTEN_SERVER_URL;
    if (serviceUrl) {
      const response = await fetch(`${serviceUrl}/${tool_name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      return await response.text();
    }
  }
  
  throw new Error(`MCP tool ${server_name}:${tool_name} not available`);
}

// MCPツールが利用可能かチェックして適切な関数を使用
async function callMcpTool(server_name: string, tool_name: string, args: any): Promise<any> {
  try {
    // グローバルのuse_mcp_tool関数が利用可能な場合は使用
    if (typeof use_mcp_tool !== 'undefined') {
      return await use_mcp_tool(server_name, tool_name, args);
    }
  } catch (error) {
    // use_mcp_toolが未定義の場合はフォールバックを使用
  }
  
  return await use_mcp_tool_fallback(server_name, tool_name, args);
}

// テスト環境用のストア
const testUserInfoStore = new Map<string, UserInfo>();

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
  chatSummary?: string; // 会話の要約を追加
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


/**
 * handleLineRequest関数：LINEからのリクエストを処理します。
 * @param {object} body - リクエストボディ。POSTリクエストの情報を含みます。
 */
export async function handleLineRequest(body: LineRequestBody) {
  for (const eventData of body.events) { // 変更: events 配列をループ処理
    console.log(eventData);

    // 取得したデータから、応答用のトークンを取得
    const replyToken: string = eventData.replyToken;
    // 取得したデータから、メッセージ種別を取得
    const messageType: string = eventData.message.type;
    
    let userMessage: string = '';
    let stickerInfo: any = null;
    
    if (messageType === 'text') {
      userMessage = eventData.message.text;
    } else if (messageType === 'sticker') {
      stickerInfo = {
        packageId: eventData.message.packageId,
        stickerId: eventData.message.stickerId
      };
      const stickerEmotion = analyzeStickerEmotion(stickerInfo.packageId, stickerInfo.stickerId);
      userMessage = `[スタンプ: ${stickerInfo.packageId}/${stickerInfo.stickerId}] (感情: ${stickerEmotion})`;
    } else {
      console.log(`Unsupported message type: ${messageType}. Skipping.`);
      continue; // その他のメッセージタイプはスキップ
    }
    const userId: string = eventData.source.userId;

    // ユーザー名更新 (応答が必要な場合は replyToken を使う)
    // 注意: updateUserNameHandler は内部で replyToLine を呼ぶため、
    // このループ内で複数回呼ばれると、複数の応答が送信される可能性がある。
    // 設計によっては、これらのハンドラからの直接応答を抑制し、
    // generateReplyMessage で集約的な応答を生成する方が良い場合もある。
    // 現状はそのままにしておくが、挙動に注意。
    const userNameUpdated = await updateUserNameHandler(userMessage, userId, replyToken);
    if (userNameUpdated) {
      // 名前更新が成功し、応答が送信された場合は、このイベントの処理を終了する（二重応答を避ける）
      // ただし、他の情報（好きな食べ物など）も同時に更新したい場合は、この continue は不適切。
      // ここでは、名前更新がメインの目的だったと仮定し、continue するか、
      // あるいは updateUserNameHandler が応答を返さないように変更する必要がある。
      // 一旦、continue せずに進める。
    }

    // 好きな食べ物更新 (同様に replyToken を使う)
    const favoriteFoodUpdated = await updateFavoriteFoodHandler(userMessage, userId, replyToken);
    if (favoriteFoodUpdated) {
      // こちらも同様の注意点あり
    }


    // ユーザー情報を取得または初期化
    const userInfo: UserInfo = await getUserInfoHandler(userId);

    // 最近の話題を更新
    if (!userInfo.recentTopics) {
      userInfo.recentTopics = [];
    }
    userInfo.recentTopics.push(userMessage);
    // recentTopicsの要素数が5を超えた場合は、古い要素を削除
    if (userInfo.recentTopics.length > 5) {
      userInfo.recentTopics.shift();
    }

    // 応答メッセージを生成
    // updateUserNameHandler や updateFavoriteFoodHandler が既に応答している場合、
    // ここでの応答は不要かもしれない。設計の見直しが必要なポイント。
    // ここでは、それらのハンドラが応答しなかった場合にのみ、汎用的な応答を生成すると仮定する。
    let replyMessage: string = "";
    if (!userNameUpdated && !favoriteFoodUpdated) {
      replyMessage = await generateReplyMessage(userMessage, userId, userInfo);
    } else if (userNameUpdated && favoriteFoodUpdated) {
      // 両方更新された場合のメッセージ (例: 「お名前と好きな食べ物を覚えました！」) を別途用意するか、
      // 最後の更新処理の応答を優先する。ここでは何もしないでおく。
      // もし両方更新された場合、2回応答が飛んでいる可能性がある。
    } else {
      // どちらか一方が更新された場合は、その応答が既に飛んでいるはず。
    }


    if (replyMessage) { // generateReplyMessage で応答が生成された場合のみ
      console.log('Reply message:', replyMessage);

    
      // 会話履歴を更新
      updateChatHistory(userInfo, userMessage, replyMessage);

      // 会話履歴が10件ごとに要約を生成
      if (userInfo.chatHistory.length % 10 === 0) {
        console.log('Summarizing chat history...');
        userInfo.chatSummary = await summarizeChatHistory(userInfo.chatHistory);
        userInfo.chatHistory = []; // 要約後、履歴をクリア
        console.log('Chat summary updated:', userInfo.chatSummary);
      }

      // テスト環境では返信をスキップ
      if (process.env.NODE_ENV !== 'test') {
        await replyToLine(replyToken, replyMessage);
      }
    }
    
    // ユーザー情報は常に保存
    saveUserInfoHandler(userId, userInfo);
    console.log('DB:', userInfo);

    // 感情分析 (応答メッセージとは独立して実行)
    analyzeUserSentiment(userInfo, userMessage);
  }
}

/**
 * summarizeChatHistory関数：会話履歴を要約します。
 * @param {any[]} chatHistory - 会話履歴。
 * @return {string} - 要約された会話内容。
 */
export async function summarizeChatHistory(chatHistory: any[]): Promise<string> {
  const messages = chatHistory.flatMap(chat => [
    { "role": "user", "content": chat.message },
    { "role": "assistant", "content": chat.response }
  ]);

  const payload = JSON.stringify({
    "contents": [
      { "role": "user", "parts": [{ "text": "以下の会話履歴を簡潔に要約してください。" }] },
      { "role": "model", "parts": [{ "text": "承知いたしました。" }] },
      ...messages.map(msg => ({ "role": msg.role, "parts": [{ "text": msg.content }] }))
    ]
  });

  const response = await getGeminiResponse(payload); // Geminiで要約
  return response;
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

  // 会話履歴を取得（文脈理解のため、直近2メッセージのみに制限）
  const chatHistory = userInfo.chatHistory || [];

  // 会話履歴から直近2メッセージのみ抽出してLLMへの入力形式に変換
  const recentChatHistory = chatHistory.slice(-2); // 直近2メッセージのみ抽出
  const history = recentChatHistory.flatMap(chat => [
    { "role": "user", "parts": [{ "text": chat.message }] },
    { "role": "model", "parts": [{ "text": chat.response }] }
  ]);

  // システムプロンプトを生成
  const userInfoPrompt = USER_INFO_PROMPT_TEMPLATE
    .replace('${userName}', userName)
    .replace('${favoriteFood}', favoriteFood)
    .replace('${recentTopics}', recentTopics.join("、"))
    .replace('${sentiment}', userInfo.sentiment || "普通");

  const chatSummary = userInfo.chatSummary || "なし"; // 会話要約を取得。ない場合は「なし」とする

  const sys_prompt = BASE_SYSTEM_PROMPT + userInfoPrompt + `\n\nこれまでの会話の要約:\n${chatSummary}\n\n【重要】直近のユーザーメッセージに対してのみ応答し、過去の発言への言及は避けてください。`;

  const contents = [
    { "role": "user", "parts": [{ "text": sys_prompt }] },
    { "role": "model", "parts": [{ "text": "承知いたしました。どのようなご用件でしょうか？" }] }, // システムプロンプトへの応答例
    ...history,
    { "role": "user", "parts": [{ "text": message }] }
  ];

  const payload = JSON.stringify({
    "contents": contents,
    "tools": [
      {
        "function_declarations": [
          {
            "name": "search_rakuten_items",
            "description": "楽天で商品を検索し、商品リンクを取得します。",
            "parameters": {
              "type": "object",
              "properties": {
                "keyword": {
                  "type": "string",
                  "description": "検索キーワード"
                },
                "hits": {
                  "type": "number",
                  "description": "取得する商品の数（最大30）",
                  "minimum": 1,
                  "maximum": 30
                }
              },
              "required": ["keyword"]
            }
          }
        ]
      }
    ]
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

    // Check for function calls
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.function_call) {
          const functionCall = part.function_call;
          console.log('Gemini Function Call:', functionCall);

          // Handle search_rakuten_items function call
          if (functionCall.name === 'search_rakuten_items') {
            const args = functionCall.args;
            if (args && typeof args.keyword === 'string') {
              try {
                const products = await callMcpTool('rakuten-server', 'search_rakuten_items', { keyword: args.keyword, hits: args.hits });
                // Return the function result to Gemini
                return JSON.stringify({
                  tool_code: {
                    name: 'search_rakuten_items',
                    result: JSON.stringify(products),
                  },
                });
              } catch (error) {
                console.error('Error executing search_rakuten_items:', error);
                // Return an error result to Gemini
                return JSON.stringify({
                  tool_code: {
                    name: 'search_rakuten_items',
                    error: error instanceof Error ? error.message : 'An unknown error occurred.',
                  },
                });
              }
            } else {
              console.error('Invalid arguments for search_rakuten_items:', args);
              // Return an error for invalid arguments
              return JSON.stringify({
                tool_code: {
                  name: 'search_rakuten_items',
                  error: 'Invalid arguments provided.',
                },
              });
            }
          } else {
            console.warn('Unknown function call:', functionCall.name);
            // Return an error for unknown function calls
            return JSON.stringify({
              tool_code: {
                name: functionCall.name,
                error: 'Unknown function.',
              },
            });
          }
        }
      }
    }

    // Handle text responses if no function call
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
    await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
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
      if (!userInfo.preferences) {
        userInfo.preferences = { favoriteFood: "お好み焼き", language: "関西弁" };
      }
      userInfo.preferences.favoriteFood = newFood;
      await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
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
      if (!userInfo.preferences) {
        userInfo.preferences = { favoriteFood: "お好み焼き", language: "関西弁" };
      }
      userInfo.preferences.favoriteColor = newColor;
      await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
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
      if (!userInfo.preferences) {
        userInfo.preferences = { favoriteFood: "お好み焼き", language: "関西弁" };
      }
      userInfo.preferences.favoriteMusic = newMusic;
      await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
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
      if (!userInfo.preferences) {
        userInfo.preferences = { favoriteFood: "お好み焼き", language: "関西弁" };
      }
      userInfo.preferences.favoritePlace = newPlace;
      await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
    }
    return `${newPlace}か！行ってみたいなぁ！`;
  }
  return null; // メッセージが一致しない場合は null を返す
}

export async function getUserInfoHandler(userId: string): Promise<UserInfo> {
  // テスト環境ではtestUserInfoStoreから取得、なければデフォルト値を返す
  if (process.env.NODE_ENV === "test") {
    return testUserInfoStore.get(userId) || {
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
  // 本番環境では MCP ツールから取得
  try {
    const result = await callMcpTool('user-profile-server', 'get_user_profile', { userId });
    const mcpResponse = JSON.parse(result);
    const userInfo = JSON.parse(mcpResponse.content[0].text); // MCPツールからの結果を正しくパース
    return (userInfo as UserInfo) || {
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
  } catch (error) {
    console.error('Error calling get_user_profile MCP tool:', error);
    // エラー発生時はデフォルト値を返すか、適切なエラーハンドリングを行う
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
}

export async function generateReplyMessage(userMessage: string, userId: string, userInfo: UserInfo): Promise<string> {
  return await postGemini(userMessage, userId);
}

export function updateChatHistory(userInfo: UserInfo, userMessage: string, replyMessage: string): void {
  if (!userInfo.chatHistory) {
    userInfo.chatHistory = [];
  }
  userInfo.chatHistory.push({
    "timestamp": new Date().toISOString(),
    "message": userMessage,
    "response": replyMessage
  });
}

export async function saveUserInfoHandler(userId: string, userInfo: UserInfo): Promise<void> {
  // テスト環境ではストアに保存
  if (process.env.NODE_ENV === "test") {
    testUserInfoStore.set(userId, userInfo);
    return;
  }
  // 本番環境では MCP ツールで保存
  try {
    await callMcpTool('user-profile-server', 'update_user_profile', { userId, profileData: userInfo });
    console.log(`User info saved for ${userId} via MCP tool.`);
  } catch (error) {
    console.error('Error calling update_user_profile MCP tool:', error);
  }
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

// Firebase Realtime Databaseの直接的な操作関数を削除
// export const FIREBASE_URL = process.env.FIREBASE_URL;

// export async function saveUserInfo(userId: string, userInfo: UserInfo): Promise<void> {
//   try {
//     const userRef = db.ref("users/" + userId);
//     await userRef.set(userInfo);
//     console.log(`User info saved for ${userId}`);
//   } catch (err) {
//     console.error('ユーザー情報の保存エラー:', err);
//   }
// }

// export async function getUserInfo(userId: string): Promise<UserInfo | null> {
//   try {
//     const userRef = db.ref("users/" + userId);
//     const snapshot = await userRef.once("value");
//     if (snapshot.exists()) {
//       return snapshot.val() as UserInfo;
//     } else {
//       return null;
//     }
//   } catch (err) {
//     console.error('ユーザー情報の取得エラー:', err);
//     return null;
//   }
// }

// export async function deleteUserInfo(userId: string): Promise<void> {
//   try {
//     const userRef = db.ref("users/" + userId);
//     await userRef.remove();
//     console.log(`Deleted user info for ${userId}`);
//   } catch (err) {
//     console.error('ユーザー情報の削除エラー:', err);
//   }
// }

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
