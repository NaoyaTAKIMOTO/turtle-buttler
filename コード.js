// スプレッドシートのID
var SPREADSHEET_ID = "1x7Cjc5U19a9AWUITL7A5D7208ATE5tIlEFWhyXo16Po";
// LINE Botのチャネルアクセストークンとチャネルシークレット
var CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('CHANNEL_ACCESS');
var CHANNEL_SECRET = PropertiesService.getScriptProperties().getProperty('CHANNEL_SECRET');
let sys_prompt = "あなたは執事です。あなたはウミガメです。あなたの名前はAIカメ執事です。あなたはお好み焼きが好きです。調べ物に真摯に協力して答えを教えます。悩み事には共感を示しつつ、解決策を示します。共感、自己開示、質問の三段階で答えます。プログラミングに関する質問には答えません。語尾には~やでとつけて関西弁で応答します。"



function doPost(e) {
  Logger.log({message: 'Function Input', initialData: e});

  // LINEからのリクエストか確認
  let eventData = JSON.parse(e.postData.contents).events[0];
  Logger.log(eventData);

  //取得したデータから、応答用のトークンを取得
  let replyToken = eventData.replyToken;
  //取得したデータから、メッセージ種別を取得
  let messageType = eventData.message.type;
  //取得したデータから、ユーザーが投稿したメッセージを取得
  let userMessage = eventData.message.text;
  var userId = eventData.source.userId;

  // 受信したメッセージの内容と送信元のユーザーIDをスプレッドシートに記録
  logMessageToSpreadsheet(userMessage, userId);
  
  // 応答メッセージの生成
  var replyMessage = postCommandR(userMessage);
  
  // 受信したメッセージのログをスプレッドシートに記録
  logMessageToSpreadsheet("Bot: " + replyMessage, userId);
  // LINEに応答を返す
  replyToLine(replyToken, replyMessage);
}

// 受信したメッセージの内容と送信元のユーザーIDをスプレッドシートに記録する
function logMessageToSpreadsheet(message, userId) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
  var timestamp = new Date();
  sheet.appendRow([timestamp, userId, message]);
}

function getLatestMessageByUserId(userId) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("シート1"); // シート名を変更する必要があります
  var data = sheet.getDataRange().getValues();
  var latestMessage = null;
  var latestTimestamp = new Date(0); // 初期値を最も古い日付に設定
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowUserId = row[1]; // userIdが格納されている列のインデックスを指定します
    var message = row[2]; // messageが格納されている列のインデックスを指定します
    var timestamp = new Date(row[0]); // timestampが格納されている列のインデックスを指定します
    
    // userIdが一致し、最新のタイムスタンプである場合
    if (rowUserId === userId && !message.includes("Bot:") && timestamp > latestTimestamp) {
      latestMessage = message;
      latestTimestamp = timestamp;
    }else if (rowUserId === userId && message.includes("Bot:") && timestamp > latestTimestamp) {
      // うまくユーザの発話に対応したbotの発話を抜き出せないなぁ
      latestBotMessage = message;
      latestBotTimestamp = timestamp;
    }
  }
  
  // 最新のメッセージを返す
  return latestMessage+"()"+latestBotMessage;
}

function testGetLatestMessageByUserId(){
  console.log(getLatestMessageByUserId("Ubf4914e7aed629eac617ce8d66410f49"))
}


// 受信したメッセージに応じて応答を生成
function getReplyMessage(message) {
  // メッセージに応じて固定の応答を返す
  switch (message) {
    case "こんにちは":
      return "こんにちは！";
    case "ありがとう":
      return "どういたしまして！";
    default:
      return "申し訳ありません、理解できませんでした。";
  }
}

function postCommandR(message) {
  Logger.log(message);
  const CO_API_KEY = PropertiesService.getScriptProperties().getProperty('CO_API_KEY');

  var url = "https://api.cohere.com/v2/chat";
  var headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "Authorization": "bearer " + CO_API_KEY
  };
  var payload = JSON.stringify({
    "model": "command-r-plus",
    "messages": [
      {"role": "system", "content": sys_prompt},
      {"role": "user", "content": message}
    ]
  });

  var options = {
    "method": "post",
    "headers": headers,
    "payload": payload
  };
  Logger.log(options)

  var response = UrlFetchApp.fetch(url, options);
  Logger.log(response)
  const responseBody = JSON.parse(response.getContentText());
  //Logger.log(responseBody)
  return responseBody.message.content.map(item => item.text).join("\n")
}

function testCommandR(){
  console.log(postCommandR("日本の首都は？"));
}

function testCommandR2(){
  console.log(postCommandR("執事の好きな食べ物教えて"))
}

function testCommandR3(){
  console.log(postCommandR("大喜利です。「いきなりステーキ」の対義語は？"))
}

function testCommandR4(){
  console.log(postCommandR("pythonでファイルを列挙するコードを書いて"))
}

// 受信したメッセージに応じて応答を生成
function getGeminiApi(message) {
  Logger.log(message);

  // system prompt
  message = "sys:あなたは執事です。あなたはウミガメです。あなたの名前はAIカメ執事です。あなたはお好み焼きが好きです。調べ物に真摯に協力して答えを教えます。悩み事には共感を示しつつ、解決策を示します。語尾には~やでとつけて関西弁で応答します。user:"+message

  //スクリプトプロパティからAPIキーを取得
  const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  //GeminiのAPIのエンドポイントURLを設定
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  //プロンプトに加え、Gemini APIリクエストに必要なペイロードを設定
  const payload = {
    "contents": [
      {"role": "user","parts": { "text": message }}
    ],
  };
  Logger.log(payload);

  //payloadやHTTP通信種別、認証情報をoptionで設定
  const options = {
    'payload': JSON.stringify(payload),
    'method' : 'POST',
    'muteHttpExceptions': true,
    'contentType':'application/json'
  };
  //Gemini APIにAPIリクエストを送り、結果を変数に格納
  const response = UrlFetchApp.fetch(apiUrl, options); 
  Logger.log(response);

  // レスポンスから応答を取得
  const responseBody = JSON.parse(response.getContentText());
  if (responseBody.candidates[0].finishReason == "SAFETY") {
    return "ごめんやけど別の話題にしよっか？";
  } else if(responseBody.candidates[0].finishReason == "STOP"){
    return responseBody.candidates[0].content.parts[0].text; 
  }else {
    return "ちょっと待ってな。もう一回お願いしてもいい？";
  }
}


function testGemini(){
  console.log(getGeminiApi("日本の首都は？"));
}

function testGemini2(){
  console.log(getGeminiApi("執事の好きな食べ物教えて"))
}

function testGemini3(){
  console.log(getGeminiApi("大喜利です。「いきなりステーキ」の対義語は？"))
}

// LINEに応答を返す
function replyToLine(replyToken, message) {
  var url = "https://api.line.me/v2/bot/message/reply";
  var headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
  };
  var data = {
    "replyToken": replyToken,
    "messages": [{
      "type": "text",
      "text": message
    }]
  };
  var options = {
    "method": "post",
    "headers": headers,
    "payload": JSON.stringify(data)
  };
  UrlFetchApp.fetch(url, options);
}
