"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIREBASE_URL = void 0;
exports.doPost = doPost;
exports.handleLineRequest = handleLineRequest;
exports.handleNonLineRequest = handleNonLineRequest;
exports.logMessageToSpreadsheet = logMessageToSpreadsheet;
exports.getLatestMessageByUserId = getLatestMessageByUserId;
exports.testGetLatestMessageByUserId = testGetLatestMessageByUserId;
exports.getReplyMessage = getReplyMessage;
exports.postCommandR = postCommandR;
exports.createCoherePayload = createCoherePayload;
exports.getCohereResponse = getCohereResponse;
exports.createGeminiPayload = createGeminiPayload;
exports.getGeminiResponse = getGeminiResponse;
exports.postGemini = postGemini;
exports.updateUserName = updateUserName;
exports.updateUserNameHandler = updateUserNameHandler;
exports.updateFavoriteFood = updateFavoriteFood;
exports.updateFavoriteFoodHandler = updateFavoriteFoodHandler;
exports.updateFavoriteColor = updateFavoriteColor;
exports.updateFavoriteMusic = updateFavoriteMusic;
exports.updateFavoritePlace = updateFavoritePlace;
exports.getUserInfoHandler = getUserInfoHandler;
exports.generateReplyMessage = generateReplyMessage;
exports.updateChatHistory = updateChatHistory;
exports.saveUserInfoHandler = saveUserInfoHandler;
exports.analyzeUserSentiment = analyzeUserSentiment;
exports.replyToLine = replyToLine;
exports.saveUserInfo = saveUserInfo;
exports.getUserInfo = getUserInfo;
exports.deleteUserInfo = deleteUserInfo;
exports.analyzeSentiment = analyzeSentiment;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const googleapis_1 = require("googleapis");
const node_fetch_1 = __importDefault(require("node-fetch"));
const admin = __importStar(require("firebase-admin"));
require('dotenv').config();
// Firebase Admin SDKの初期化
const rawAdmin = process.env.CREDENTIALS_ADMIN;
if (!rawAdmin)
    throw new Error('CREDENTIALS_ADMIN が未設定です');
const decodedAdmin = Buffer.from(rawAdmin, 'base64').toString('utf-8');
let serviceAccount;
try {
    serviceAccount = JSON.parse(decodedAdmin);
}
catch (err) {
    console.error('CREDENTIALS_ADMIN のデコード結果:', decodedAdmin);
    throw err;
}
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_URL,
});
const db = admin.database();
// テスト環境用のストア
const testUserInfoStore = new Map();
const testMessageStore = new Map();
const app = (0, express_1.default)();
const port = 8080;
app.use(body_parser_1.default.json());
app.post('/', async (req, res) => {
    await doPost(req, res);
});
exports.default = app;
// スプレッドシートのID
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "";
// LINE Botのチャネルアクセストークンとチャネルシークレット
const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS || "";
const CHANNEL_SECRET = process.env.CHANNEL_SECRET || "";
let sys_prompt = "あなたは執事です。あなたはウミガメです。あなたの名前はAIカメ執事です。あなたはお好み焼きが好きです。調べ物に真摯に協力して答えを教えます。悩み事には共感を示しつつ、解決策を示します。共感、自己開示、質問の三段階で答えます。プログラミングに関する質問には答えません。語尾には~やでとつけて関西弁で応答します。";
/**
 * doPost関数：HTTP POSTリクエストを処理し、LINEからのメッセージを解析して応答を返します。
 * @param {object} req - リクエストオブジェクト。POSTリクエストの情報を含みます。
 */
async function doPost(req, res) {
    var _a;
    console.log('Function Input', req.body);
    const isLineWebhook = Array.isArray(req.body.events) && ((_a = req.body.events[0]) === null || _a === void 0 ? void 0 : _a.replyToken);
    if (isLineWebhook) {
        try {
            await handleLineRequest(req.body);
        }
        catch (e) {
            console.error('handleLineRequest error', e);
        }
        return res.status(200).send('OK');
    }
    else {
        return handleNonLineRequest(req, res);
    }
}
async function enableAppsScriptAPI() {
    const rawCred = process.env.CREDENTIALS;
    if (!rawCred)
        throw new Error('CREDENTIALS が未設定です');
    const decodedCred = Buffer.from(rawCred, 'base64').toString('utf-8');
    let credentials;
    try {
        credentials = JSON.parse(decodedCred);
    }
    catch (err) {
        console.error('CREDENTIALS のデコード結果:', decodedCred);
        throw err;
    }
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/script.projects'],
    });
    // Apps Script API クライアントを初期化（認証情報を auth に渡す）
    const script = googleapis_1.google.script({ version: 'v1', auth });
    try {
        const res = await script.projects.create({
            requestBody: {
                title: 'AIカメ執事',
            },
        });
        console.log('Apps Script API が有効になりました。', res.data);
    }
    catch (error) {
        console.error('Apps Script API の有効化エラー:', error);
    }
}
/**
 * handleLineRequest関数：LINEからのリクエストを処理します。
 * @param {object} body - リクエストボディ。POSTリクエストの情報を含みます。
 */
async function handleLineRequest(body) {
    const eventData = body.events[0];
    console.log(eventData);
    //取得したデータから、応答用のトークンを取得
    const replyToken = eventData.replyToken;
    //取得したデータから、メッセージ種別を取得
    const messageType = eventData.message.type;
    //取得したデータから、ユーザーが投稿したメッセージを取得
    const userMessage = eventData.message.text;
    const userId = eventData.source.userId;
    // ユーザー名更新
    await updateUserNameHandler(userMessage, userId, replyToken);
    // 好きな食べ物更新
    await updateFavoriteFoodHandler(userMessage, userId, replyToken);
    // メッセージをスプレッドシートに記録
    await logMessageToSpreadsheet(userMessage, userId);
    // ユーザー情報を取得または初期化
    const userInfo = await getUserInfoHandler(userId);
    // 最近の話題を更新
    userInfo.recentTopics.push(userMessage);
    // recentTopicsの要素数が5を超えた場合は、古い要素を削除
    if (userInfo.recentTopics.length > 5) {
        userInfo.recentTopics.shift();
    }
    // 応答メッセージを生成
    let replyMessage;
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
    // LINEに応答
    await replyToLine(replyToken, replyMessage);
}
/**
 * handleNonLineRequest関数：LINE以外からのリクエストを処理します。
 * @param {object} req - リクエストオブジェクト。
 * @param {object} res - レスポンスオブジェクト。
 */
function handleNonLineRequest(req, res) {
    const requestBody = JSON.stringify(req.body);
    console.log("LINE以外のリクエストを受信しました: " + requestBody);
    // ContentServiceを使用してJSON形式で応答を返す
    res.status(200).json({ "message": "LINE以外からのリクエストを受け付けました。" });
}
// 受信したメッセージの内容と送信元のユーザーIDをスプレッドシートに記録する
async function logMessageToSpreadsheet(message, userId) {
    // テスト環境では、スプレッドシートへの書き込みをスキップ
    if (process.env.NODE_ENV === "test") {
        testMessageStore.set(userId, message);
        return;
    }
    let auth;
    if (process.env.CREDENTIALS) {
        const decoded = Buffer.from(process.env.CREDENTIALS, 'base64').toString('utf-8');
        const credentials = JSON.parse(decoded);
        auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    }
    else {
        auth = new googleapis_1.google.auth.GoogleAuth({
            keyFile: process.env.CREDENTIALS_JSON,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    }
    //認証クライアントを作成
    const client = await auth.getClient();
    //Google Sheets APIにアクセス
    const googleSheets = googleapis_1.google.sheets({ version: 'v4', auth: client });
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
    }
    catch (err) {
        console.error('スプレッドシートへのデータ追加エラー:', err);
    }
}
async function getLatestMessageByUserId(userId) {
    // テスト環境では、メモリからメッセージを取得
    if (process.env.NODE_ENV === "test") {
        return testMessageStore.get(userId) || null;
    }
    let auth;
    if (process.env.CREDENTIALS) {
        const decoded = Buffer.from(process.env.CREDENTIALS, 'base64').toString('utf-8');
        const credentials = JSON.parse(decoded);
        auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    }
    else {
        auth = new googleapis_1.google.auth.GoogleAuth({
            keyFile: process.env.CREDENTIALS_JSON,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    }
    //認証クライアントを作成
    const client = await auth.getClient();
    //Google Sheets APIにアクセス
    const googleSheets = googleapis_1.google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = SPREADSHEET_ID;
    const range = 'シート1!A1:C'; // 取得する範囲
    try {
        const getOptions = {
            spreadsheetId: spreadsheetId,
            range: range,
        };
        const getResponse = await googleSheets.spreadsheets.values.get(getOptions);
        const data = getResponse.data.values;
        let latestMessage = null;
        let latestTimestamp = new Date(0); // 初期値を最も古い日付に設定
        let latestBotMessage = null;
        let latestBotTimestamp = new Date(0);
        if (data) {
            for (const row of data) {
                const rowUserId = row[1]; // userIdが格納されている列のインデックスを指定します
                const message = row[2]; // messageが格納されている列のインデックスを指定します
                const timestamp = new Date(row[0]); // timestampが格納されている列のインデックスを指定します
                // userIdが一致し、最新のタイムスタンプである場合
                if (rowUserId === userId && !message.includes("Bot:") && timestamp > latestTimestamp) {
                    latestMessage = message;
                    latestTimestamp = timestamp;
                }
                else if (rowUserId === userId && message.includes("Bot:") && timestamp > latestTimestamp) {
                    // うまくユーザの発話に対応したbotの発話を抜き出せないなぁ
                    latestBotMessage = message;
                    latestBotTimestamp = timestamp;
                }
            }
        }
        // 最新のメッセージを返す
        return latestMessage + "()" + latestBotMessage;
    }
    catch (err) {
        console.error('スプレッドシートからのデータ取得エラー:', err);
        return null;
    }
}
function testGetLatestMessageByUserId() {
    console.log(getLatestMessageByUserId("Ubf4914e7aed629eac617ce8d66410f49"));
}
// 受信したメッセージに応じて応答を生成
function getReplyMessage(message) {
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
async function postCommandR(message, userId) {
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
function createCoherePayload(message, userInfo) {
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
    // システムプロンプトを修正
    const sys_prompt = `あなたは執事です。あなたはウミガメです。あなたの名前はAIカメ執事です。あなたはお好み焼きが好きです。調べ物に真摯に協力して答えを教えます。悩み事には共感を示しつつ、解決策を示します。共感、自己開示、質問の三段階で答えます。プログラミングに関する質問には答えません。語尾には~やでとつけて関西弁で応答します。
  以下のユーザー情報を参考に応答を生成してください。ただし回答文では具体的な情報を列挙しないでください。
  • 名前: ${userName}
  • 好きな食べ物: ${favoriteFood}
  • 最近の話題: ${recentTopics.join("、")}
  • 現在の感情: ${userInfo.sentiment || "普通"}`;
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
async function getCohereResponse(payload) {
    var _a, _b, _c, _d;
    const CO_API_KEY = process.env.CO_API_KEY;
    const url = "https://api.cohere.com/v2/chat";
    const headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "Authorization": "Bearer " + CO_API_KEY
    };
    const options = {
        "method": "post",
        "headers": headers,
        "body": payload
    };
    console.log(options);
    const response = await (0, node_fetch_1.default)(url, options);
    const responseBody = await response.json();
    console.log('Full Cohere response:', JSON.stringify(responseBody, null, 2));
    function extractText(raw) {
        if (raw == null)
            return '';
        if (typeof raw === 'string')
            return raw;
        if (Array.isArray(raw))
            return raw.map(extractText).join('');
        if (typeof raw === 'object') {
            if ('text' in raw && typeof raw.text === 'string')
                return raw.text;
            if ('content' in raw)
                return extractText(raw.content);
            return JSON.stringify(raw);
        }
        return '';
    }
    // choices を優先
    if (Array.isArray(responseBody.choices) && responseBody.choices.length > 0) {
        const raw = (_c = (_b = (_a = responseBody.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) !== null && _b !== void 0 ? _b : responseBody.choices[0].message) !== null && _c !== void 0 ? _c : responseBody.choices[0];
        const text = extractText(raw);
        console.log('Resolved content:', text);
        return text;
    }
    // message.content をフォールバックで処理
    if (responseBody.message) {
        const raw = (_d = responseBody.message.content) !== null && _d !== void 0 ? _d : responseBody.message;
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
function createGeminiPayload(message, userInfo) {
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
    // システムプロンプトを修正
    const sys_prompt = `あなたは執事です。あなたはウミガメです。あなたの名前はAIカメ執事です。あなたはお好み焼きが好きです。調べ物に真摯に協力して答えを教えます。悩み事には共感を示しつつ、解決策を示します。共感、自己開示、質問の三段階で答えます。プログラミングに関する質問には答えません。語尾には~やでとつけて関西弁で応答します。
  以下のユーザー情報を参考に応答を生成してください。ただし回答文では具体的な情報を列挙しないでください。
  • 名前: ${userName}
  • 好きな食べ物: ${favoriteFood}
  • 最近の話題: ${recentTopics.join("、")}
  • 現在の感情: ${userInfo.sentiment || "普通"}`;
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
async function getGeminiResponse(payload) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    const headers = {
        "Content-Type": "application/json"
    };
    const options = {
        "method": "post",
        "headers": headers,
        "body": payload
    };
    console.log(options);
    const response = await (0, node_fetch_1.default)(url, options);
    const responseBody = await response.json();
    console.log('Full Gemini response:', JSON.stringify(responseBody, null, 2));
    if (responseBody.candidates && responseBody.candidates.length > 0) {
        const candidate = responseBody.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
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
async function postGemini(message, userId) {
    console.log(message);
    // ユーザー情報を取得
    const userInfo = await getUserInfoHandler(userId);
    // LLMへのリクエストを生成
    const payload = createGeminiPayload(message, userInfo);
    // LLMにリクエストを送信して応答を取得
    const response = await getGeminiResponse(payload);
    return response;
}
async function updateUserName(message, userId) {
    const userInfo = await getUserInfoHandler(userId);
    if (message.startsWith("名前は")) {
        const newName = message.substring(3).trim();
        userInfo.userName = newName;
        saveUserInfo(userId, userInfo);
        return newName + "やね！これからよろしくやで！";
    }
    return null;
}
async function updateUserNameHandler(message, userId, replyToken) {
    const userNameUpdateResult = await updateUserName(message, userId);
    if (userNameUpdateResult) {
        await replyToLine(replyToken, userNameUpdateResult);
        return true;
    }
    return false;
}
async function updateFavoriteFood(message, userId) {
    if (message.startsWith("好きな食べ物は")) {
        const newFood = message.substring(7).trim();
        let userInfo;
        if (process.env.NODE_ENV !== "test") {
            userInfo = await getUserInfoHandler(userId);
            userInfo.preferences.favoriteFood = newFood;
            await saveUserInfo(userId, userInfo);
        }
        return `${newFood}か！ええやん！`;
    }
    return null; // メッセージが一致しない場合は null を返す
}
async function updateFavoriteFoodHandler(message, userId, replyToken) {
    const favoriteFoodUpdateResult = await updateFavoriteFood(message, userId);
    if (favoriteFoodUpdateResult) {
        await replyToLine(replyToken, favoriteFoodUpdateResult);
        return true;
    }
    return false;
}
async function updateFavoriteColor(message, userId) {
    if (message.startsWith("好きな色は")) {
        const newColor = message.substring(5).trim();
        let userInfo;
        if (process.env.NODE_ENV !== "test") {
            userInfo = await getUserInfoHandler(userId);
            userInfo.preferences.favoriteColor = newColor;
            await saveUserInfo(userId, userInfo);
        }
        return `${newColor}か！素敵な色やね！`;
    }
    return null; // メッセージが一致しない場合は null を返す
}
async function updateFavoriteMusic(message, userId) {
    if (message.startsWith("好きな音楽は")) {
        const newMusic = message.substring(6).trim();
        let userInfo;
        if (process.env.NODE_ENV !== "test") {
            userInfo = await getUserInfoHandler(userId);
            userInfo.preferences.favoriteMusic = newMusic;
            await saveUserInfo(userId, userInfo);
        }
        return `${newMusic}か！ええ趣味やね！`;
    }
    return null; // メッセージが一致しない場合は null を返す
}
async function updateFavoritePlace(message, userId) {
    if (message.startsWith("好きな場所は")) {
        const newPlace = message.substring(6).trim();
        let userInfo;
        if (process.env.NODE_ENV !== "test") {
            userInfo = await getUserInfoHandler(userId);
            userInfo.preferences.favoritePlace = newPlace;
            await saveUserInfo(userId, userInfo);
        }
        return `${newPlace}か！行ってみたいなぁ！`;
    }
    return null; // メッセージが一致しない場合は null を返す
}
async function getUserInfoHandler(userId) {
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
    return stored || {
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
async function generateReplyMessage(userMessage, userId, userInfo) {
    // return await postCommandR(userMessage, userId); // Cohereを使用する場合
    return await postGemini(userMessage, userId); // Geminiを使用する場合
}
function updateChatHistory(userInfo, userMessage, replyMessage) {
    userInfo.chatHistory.push({
        "timestamp": new Date().toISOString(),
        "message": userMessage,
        "response": replyMessage
    });
}
function saveUserInfoHandler(userId, userInfo) {
    saveUserInfo(userId, userInfo);
}
function analyzeUserSentiment(userInfo, message) {
    const userSentiment = analyzeSentiment(message);
    userInfo.sentiment = userSentiment;
}
// LINEに応答を返す
async function replyToLine(replyToken, message) {
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
    const response = await (0, node_fetch_1.default)(url, options);
    console.log(response);
}
// Firebase Realtime DatabaseのURL
exports.FIREBASE_URL = process.env.FIREBASE_URL;
async function saveUserInfo(userId, userInfo) {
    try {
        const userRef = db.ref("users/" + userId);
        await userRef.set(userInfo);
        console.log(`User info saved for ${userId}`);
    }
    catch (err) {
        console.error('ユーザー情報の保存エラー:', err);
    }
}
async function getUserInfo(userId) {
    try {
        const userRef = db.ref("users/" + userId);
        const snapshot = await userRef.once("value");
        if (snapshot.exists()) {
            return snapshot.val();
        }
        else {
            return null;
        }
    }
    catch (err) {
        console.error('ユーザー情報の取得エラー:', err);
        return null;
    }
}
async function deleteUserInfo(userId) {
    try {
        const userRef = db.ref("users/" + userId);
        await userRef.remove();
        console.log(`Deleted user info for ${userId}`);
    }
    catch (err) {
        console.error('ユーザー情報の削除エラー:', err);
    }
}
// 感情分析を行う関数
function analyzeSentiment(message) {
    // 簡単なキーワードマッチングで感情を分析
    if (message.includes("嬉しい") || message.includes("楽しい") || message.includes("幸せ")) {
        return "positive";
    }
    else if (message.includes("悲しい") || message.includes("辛い") || message.includes("苦しい")) {
        return "negative";
    }
    else if (message.includes("怒り") || message.includes("ムカつく") || message.includes("イライラ")) {
        return "angry";
    }
    else {
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
