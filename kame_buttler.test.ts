import request from 'supertest';
import app from './kame_buttler';
import { expect } from 'chai';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import {
  analyzeSentiment, getReplyMessage, postCommandR, updateUserName, updateFavoriteFood, updateFavoriteColor, updateFavoriteMusic, updateFavoritePlace,
  getUserInfoHandler, generateReplyMessage, updateChatHistory, saveUserInfoHandler, saveUserInfo, getUserInfo, replyToLine, createCoherePayload,
  getCohereResponse, updateUserNameHandler, updateFavoriteFoodHandler, logMessageToSpreadsheet, getLatestMessageByUserId,
  deleteUserInfo // deleteUserInfo をインポート
} from './kame_buttler';


describe('getReplyMessage', () => {
  it('should return a greeting message when the input is "こんにちは"', () => {
    expect(getReplyMessage("こんにちは")).to.equal("まいど！カメ執事のAIやで！");
  });

  it('should return a thank you message when the input is "ありがとう"', () => {
    expect(getReplyMessage("ありがとう")).to.equal("どういたしましてやで！お役に立てて嬉しいで！");
  });

  it('should return a default message when the input is unknown"', () => {
    expect(getReplyMessage("test")).to.equal("すんまへん、ようわかりまへんでした。もっと詳しく教えてくれると嬉しいで！");
  });
});

describe('analyzeSentiment', () => {
  it('should return "positive" for messages containing "嬉しい"', () => {
    expect(analyzeSentiment("今日は嬉しい")).to.equal("positive");
  });

  it('should return "negative" for messages containing "悲しい"', () => {
    expect(analyzeSentiment("今日は悲しい")).to.equal("negative");
  });

  it('should return "angry" for messages containing "ムカつく"', () => {
    expect(analyzeSentiment("マジでムカつく")).to.equal("angry");
  });

  it('should return "neutral" for messages containing none of the keywords', () => {
    expect(analyzeSentiment("今日は普通の日")).to.equal("neutral");
  });
});

describe('updateUserName', () => {
  it('should update userName when message starts with "名前は"', async () => {
    const userId = 'testUser';
    const message = '名前は テストユーザー';
    const result = await updateUserName(message, userId);
    expect(result).to.equal('テストユーザーやね！これからよろしくやで！');
  });

  it('should return null when message does not start with "名前は"', async () => {
    const userId = 'testUser';
    const message = 'こんにちは';
    const result = await updateUserName(message, userId);
    expect(result).to.equal(null);
  });
});

describe('updateFavoriteFood', () => {
  it('should update favoriteFood when message starts with "好きな食べ物は"', async () => {
    const userId = 'testUser';
    const message = '好きな食べ物は 寿司';
    const result = await updateFavoriteFood(message, userId);
    expect(result).to.equal('寿司か！ええやん！');
  });

  it('should return null when message does not start with "好きな食べ物は"', async () => {
    const userId = 'testUser';
    const message = 'こんにちは';
    const result = await updateFavoriteFood(message, userId);
    expect(result).to.equal(null);
  });
});

describe('updateFavoriteColor', () => {
  it('should update favoriteColor when message starts with "好きな色は"', async () => {
    const userId = 'testUser';
    const message = '好きな色は 青';
    const result = await updateFavoriteColor(message, userId);
    expect(result).to.equal('青か！素敵な色やね！');
  });

  it('should return null when message does not start with "好きな色は"', async () => {
    const userId = 'testUser';
    const message = 'こんにちは';
    const result = await updateFavoriteColor(message, userId);
    expect(result).to.equal(null);
  });
});

describe('updateFavoriteMusic', () => {
  it('should update favoriteMusic when message starts with "好きな音楽は"', async () => {
    const userId = 'testUser';
    const message = '好きな音楽は ロック';
    const result = await updateFavoriteMusic(message, userId);
    expect(result).to.equal('ロックか！ええ趣味やね！');
  });

  it('should return null when message does not start with "好きな音楽は"', async () => {
    const userId = 'testUser';
    const message = 'こんにちは';
    const result = await updateFavoriteMusic(message, userId);
    expect(result).to.equal(null);
  });
});

describe('updateFavoritePlace', () => {
  it('should update favoritePlace when message starts with "好きな場所は"', async () => {
    const userId = 'testUser';
    const message = '好きな場所は 京都';
    const result = await updateFavoritePlace(message, userId);
    expect(result).to.equal('京都か！行ってみたいなぁ！');
  });

  it('should return null when message does not start with "好きな場所は"', async () => {
    const userId = 'testUser';
    const message = 'こんにちは';
    const result = await updateFavoritePlace(message, userId);
    expect(result).to.equal(null);
  });
});

// getUserInfoHandler のテストを修正: テスト環境ではデフォルト値を返すことを確認
describe('getUserInfoHandler in Test Env', () => {
  before(() => {
    process.env.NODE_ENV = 'test'; // テスト環境フラグを設定
  });

  it('should return default user info in test environment', async () => {
    const userId = 'nonExistentUserForTest'; // 存在しないIDを使用
    const result = await getUserInfoHandler(userId);
    expect(result.userId).to.equal(userId);
    expect(result.userName).to.equal(''); // デフォルト値を確認
    expect(result.preferences.favoriteFood).to.equal('お好み焼き'); // デフォルト値を確認
  });

  after(() => {
    delete process.env.NODE_ENV; // テスト環境フラグを削除
  });
});


describe('Firebase Realtime Database and Spreadsheet Integration Tests', function() {
  this.timeout(5000);
  const userId = 'integrationTestUser'; // 他のテストと重複しないIDを使用
  const testMessage = 'This is an integration test message.';
  const testUserInfo = {
    userId: userId,
    userName: 'Test User',
    chatHistory: [],
    recentTopics: [],
    preferences: {
      favoriteFood: 'Ramen', // テスト用のデータ
      language: 'English',
    },
  };

  // 各テストの前にユーザー情報を削除してクリーンな状態にする
  beforeEach(async () => {
    await deleteUserInfo(userId);
  });

  // 全てのテストが終わった後にユーザー情報を削除
  after(async () => {
    await deleteUserInfo(userId);
  });

  it('should save and retrieve user info from Firebase', async () => {
    await saveUserInfo(userId, testUserInfo); // まず保存
    const retrievedUserInfo = await getUserInfo(userId); // 次に取得
    // 取得した情報が保存した情報と（部分的に）一致するか確認
    expect(retrievedUserInfo).to.not.be.null;
    // Firebaseが空配列を省略する場合があるため、存在するプロパティのみを比較
    expect(retrievedUserInfo?.userId).to.equal(testUserInfo.userId);
    expect(retrievedUserInfo?.userName).to.equal(testUserInfo.userName);
    expect(retrievedUserInfo?.preferences).to.deep.equal(testUserInfo.preferences);
    // chatHistory と recentTopics は存在しないか空配列であることを確認
    expect(retrievedUserInfo?.chatHistory || []).to.be.an('array').that.is.empty;
    expect(retrievedUserInfo?.recentTopics || []).to.be.an('array').that.is.empty;
  });

  it('should log a message to the spreadsheet and retrieve it (requires manual verification or more robust retrieval)', async () => {
    // NODE_ENVを一時的に本番環境扱いにしてスプレッドシートに書き込む
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    await logMessageToSpreadsheet(testMessage, userId);

    // スプレッドシートからの取得を試みる (getLatestMessageByUserId は改善が必要な場合あり)
    // 注意: このテストはスプレッドシートの状態に依存し、不安定になる可能性があります。
    // getLatestMessageByUserId が確実に最新メッセージを取得できる保証がないため、
    // 厳密なテストにはスプレッドシートAPIを直接叩くなどの工夫が必要です。
    const latestMessageData = await getLatestMessageByUserId(userId);

    // 環境変数を元に戻す
    process.env.NODE_ENV = originalEnv;

    // 取得したデータにテストメッセージが含まれているか確認 (より緩いチェック)
    // latestMessageData が null でないこと、かつ testMessage を含むことを期待
    expect(latestMessageData).to.be.a('string'); // nullでないことを確認
    expect(latestMessageData).to.contain(testMessage); // メッセージが含まれるか確認
  });
});

// generateReplyMessage, updateChatHistory, saveUserInfoHandler, postCommandR, createCoherePayload, getCohereResponse, replyToLine, saveUserInfo, getUserInfo, logMessageToSpreadsheet, getLatestMessageByUserId は外部APIやFirebaseとの連携が必要なため、モック化するか、統合テストとして実装する必要があります。
