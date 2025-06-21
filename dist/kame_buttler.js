"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doPost = doPost;
exports.handleLineRequest = handleLineRequest;
exports.summarizeChatHistory = summarizeChatHistory;
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
exports.analyzeSentiment = analyzeSentiment;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const googleapis_1 = require("googleapis");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Firebase Admin SDKの直接的なインポートと初期化を削除
// import * as admin from 'firebase-admin';
require('dotenv').config();
// MCPツール用のフォールバック実装（テスト環境および未実装時）
async function use_mcp_tool_fallback(server_name, tool_name, args) {
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
            testUserInfoStore.set(args.userId, args.userInfo);
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
            const response = await (0, node_fetch_1.default)(`${serviceUrl}/${tool_name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(arguments)
            });
            return await response.text();
        }
    }
    if (server_name === 'rakuten-server') {
        const serviceUrl = process.env.RAKUTEN_SERVER_URL;
        if (serviceUrl) {
            const response = await (0, node_fetch_1.default)(`${serviceUrl}/${tool_name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(arguments)
            });
            return await response.text();
        }
    }
    throw new Error(`MCP tool ${server_name}:${tool_name} not available`);
}
// MCPツールが利用可能かチェックして適切な関数を使用
async function callMcpTool(server_name, tool_name, args) {
    try {
        // グローバルのuse_mcp_tool関数が利用可能な場合は使用
        if (typeof use_mcp_tool !== 'undefined') {
            return await use_mcp_tool(server_name, tool_name, args);
        }
    }
    catch (error) {
        // use_mcp_toolが未定義の場合はフォールバックを使用
    }
    return await use_mcp_tool_fallback(server_name, tool_name, args);
}
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
const prompts_1 = require("./prompts");
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
    for (const eventData of body.events) { // 変更: events 配列をループ処理
        console.log(eventData);
        // 取得したデータから、応答用のトークンを取得
        const replyToken = eventData.replyToken;
        // 取得したデータから、メッセージ種別を取得 (現状はtextメッセージのみを想定しているため、必要に応じて分岐)
        // const messageType: string = eventData.message.type; 
        if (eventData.message.type !== 'text') {
            console.log(`Unsupported message type: ${eventData.message.type}. Skipping.`);
            continue; // テキストメッセージ以外はスキップ (またはエラー応答)
        }
        // 取得したデータから、ユーザーが投稿したメッセージを取得
        const userMessage = eventData.message.text;
        const userId = eventData.source.userId;
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
        // updateUserNameHandler や updateFavoriteFoodHandler が既に応答している場合、
        // ここでの応答は不要かもしれない。設計の見直しが必要なポイント。
        // ここでは、それらのハンドラが応答しなかった場合にのみ、汎用的な応答を生成すると仮定する。
        let replyMessage = "";
        if (!userNameUpdated && !favoriteFoodUpdated) {
            replyMessage = await generateReplyMessage(userMessage, userId, userInfo);
        }
        else if (userNameUpdated && favoriteFoodUpdated) {
            // 両方更新された場合のメッセージ (例: 「お名前と好きな食べ物を覚えました！」) を別途用意するか、
            // 最後の更新処理の応答を優先する。ここでは何もしないでおく。
            // もし両方更新された場合、2回応答が飛んでいる可能性がある。
        }
        else {
            // どちらか一方が更新された場合は、その応答が既に飛んでいるはず。
        }
        if (replyMessage) { // generateReplyMessage で応答が生成された場合のみ
            console.log('Reply message:', replyMessage);
            // メッセージをスプレッドシートに記録
            await logMessageToSpreadsheet("Bot: " + replyMessage, userId);
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
async function summarizeChatHistory(chatHistory) {
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
    try {
        const response = await getGeminiResponse(payload); // Geminiで要約
        return response;
    }
    catch (err) {
        console.error('Geminiでの要約失敗, Cohereにフォールバック:', err);
        const coherePayload = JSON.stringify({
            "model": "command-r-plus",
            "messages": [
                { "role": "system", "content": "以下の会話履歴を簡潔に要約してください。" },
                ...messages
            ]
        });
        const response = await getCohereResponse(coherePayload); // Cohereで要約
        return response;
    }
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
    // 会話履歴を取得（文脈理解のため、直近2メッセージのみに制限）
    const chatHistory = userInfo.chatHistory || [];
    // 会話履歴から直近2メッセージのみ抽出してLLMへの入力形式に変換
    const recentChatHistory = chatHistory.slice(-2); // 直近2メッセージのみ抽出
    const messages = recentChatHistory.flatMap(chat => [
        { "role": "user", "content": chat.message },
        { "role": "assistant", "content": chat.response }
    ]);
    // 最新のメッセージをLLMへの入力に追加
    messages.push({ "role": "user", "content": message });
    // システムプロンプトを生成
    const userInfoPrompt = prompts_1.USER_INFO_PROMPT_TEMPLATE
        .replace('${userName}', userName)
        .replace('${favoriteFood}', favoriteFood)
        .replace('${recentTopics}', recentTopics.join("、"))
        .replace('${sentiment}', userInfo.sentiment || "普通");
    const chatSummary = userInfo.chatSummary || "なし"; // 会話要約を取得。ない場合は「なし」とする
    const sys_prompt = prompts_1.BASE_SYSTEM_PROMPT + userInfoPrompt + `\n\nこれまでの会話の要約:\n${chatSummary}\n\n【重要】直近のユーザーメッセージに対してのみ応答し、過去の発言への言及は避けてください。`;
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
    // 会話履歴を取得（文脈理解のため、直近2メッセージのみに制限）
    const chatHistory = userInfo.chatHistory || [];
    // 会話履歴から直近2メッセージのみ抽出してLLMへの入力形式に変換
    const recentChatHistory = chatHistory.slice(-2); // 直近2メッセージのみ抽出
    const history = recentChatHistory.flatMap(chat => [
        { "role": "user", "parts": [{ "text": chat.message }] },
        { "role": "model", "parts": [{ "text": chat.response }] }
    ]);
    // システムプロンプトを生成
    const userInfoPrompt = prompts_1.USER_INFO_PROMPT_TEMPLATE
        .replace('${userName}', userName)
        .replace('${favoriteFood}', favoriteFood)
        .replace('${recentTopics}', recentTopics.join("、"))
        .replace('${sentiment}', userInfo.sentiment || "普通");
    const chatSummary = userInfo.chatSummary || "なし"; // 会話要約を取得。ない場合は「なし」とする
    const sys_prompt = prompts_1.BASE_SYSTEM_PROMPT + userInfoPrompt + `\n\nこれまでの会話の要約:\n${chatSummary}\n\n【重要】直近のユーザーメッセージに対してのみ応答し、過去の発言への言及は避けてください。`;
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
async function getGeminiResponse(payload) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY 環境変数が設定されていません。');
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`; // クエリパラメータからキーを削除
    const headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY.replace(/^"|"$/g, '') // ヘッダーにキーを追加
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
                            }
                            catch (error) {
                                console.error('Error executing search_rakuten_items:', error);
                                // Return an error result to Gemini
                                return JSON.stringify({
                                    tool_code: {
                                        name: 'search_rakuten_items',
                                        error: error instanceof Error ? error.message : 'An unknown error occurred.',
                                    },
                                });
                            }
                        }
                        else {
                            console.error('Invalid arguments for search_rakuten_items:', args);
                            // Return an error for invalid arguments
                            return JSON.stringify({
                                tool_code: {
                                    name: 'search_rakuten_items',
                                    error: 'Invalid arguments provided.',
                                },
                            });
                        }
                    }
                    else {
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
        await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
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
            await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
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
            await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
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
            await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
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
            await saveUserInfoHandler(userId, userInfo); // saveUserInfoHandlerを呼び出すように変更
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
    // 本番環境では MCP ツールから取得
    try {
        const result = await callMcpTool('user-profile-server', 'get_user_profile', { userId });
        const userInfo = JSON.parse(result); // MCPツールからの結果はJSON文字列として返される
        return userInfo || {
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
    catch (error) {
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
async function generateReplyMessage(userMessage, userId, userInfo) {
    try {
        return await postGemini(userMessage, userId);
    }
    catch (err) {
        console.error('Gemini呼び出し失敗, Cohereにフォールバック:', err);
        return await postCommandR(userMessage, userId);
    }
}
function updateChatHistory(userInfo, userMessage, replyMessage) {
    userInfo.chatHistory.push({
        "timestamp": new Date().toISOString(),
        "message": userMessage,
        "response": replyMessage
    });
}
async function saveUserInfoHandler(userId, userInfo) {
    // テスト環境ではストアに保存
    if (process.env.NODE_ENV === "test") {
        testUserInfoStore.set(userId, userInfo);
        return;
    }
    // 本番環境では MCP ツールで保存
    try {
        await callMcpTool('user-profile-server', 'update_user_profile', { userId, profileData: userInfo });
        console.log(`User info saved for ${userId} via MCP tool.`);
    }
    catch (error) {
        console.error('Error calling update_user_profile MCP tool:', error);
    }
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
