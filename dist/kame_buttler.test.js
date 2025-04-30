"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const kame_buttler_1 = require("./kame_buttler");
describe('getReplyMessage', () => {
    it('should return a greeting message when the input is "こんにちは"', () => {
        (0, chai_1.expect)((0, kame_buttler_1.getReplyMessage)("こんにちは")).to.equal("まいど！カメ執事のAIやで！");
    });
    it('should return a thank you message when the input is "ありがとう"', () => {
        (0, chai_1.expect)((0, kame_buttler_1.getReplyMessage)("ありがとう")).to.equal("どういたしましてやで！お役に立てて嬉しいで！");
    });
    it('should return a default message when the input is unknown"', () => {
        (0, chai_1.expect)((0, kame_buttler_1.getReplyMessage)("test")).to.equal("すんまへん、ようわかりまへんでした。もっと詳しく教えてくれると嬉しいで！");
    });
});
describe('analyzeSentiment', () => {
    it('should return "positive" for messages containing "嬉しい"', () => {
        (0, chai_1.expect)((0, kame_buttler_1.analyzeSentiment)("今日は嬉しい")).to.equal("positive");
    });
    it('should return "negative" for messages containing "悲しい"', () => {
        (0, chai_1.expect)((0, kame_buttler_1.analyzeSentiment)("今日は悲しい")).to.equal("negative");
    });
    it('should return "angry" for messages containing "ムカつく"', () => {
        (0, chai_1.expect)((0, kame_buttler_1.analyzeSentiment)("マジでムカつく")).to.equal("angry");
    });
    it('should return "neutral" for messages containing none of the keywords', () => {
        (0, chai_1.expect)((0, kame_buttler_1.analyzeSentiment)("今日は普通の日")).to.equal("neutral");
    });
});
describe('updateUserName', () => {
    it('should update userName when message starts with "名前は"', async () => {
        const userId = 'testUser';
        const message = '名前は テストユーザー';
        const result = await (0, kame_buttler_1.updateUserName)(message, userId);
        (0, chai_1.expect)(result).to.equal('テストユーザーやね！これからよろしくやで！');
    });
    it('should return null when message does not start with "名前は"', async () => {
        const userId = 'testUser';
        const message = 'こんにちは';
        const result = await (0, kame_buttler_1.updateUserName)(message, userId);
        (0, chai_1.expect)(result).to.equal(null);
    });
});
describe('updateFavoriteFood', () => {
    it('should update favoriteFood when message starts with "好きな食べ物は"', async () => {
        const userId = 'testUser';
        const message = '好きな食べ物は 寿司';
        const result = await (0, kame_buttler_1.updateFavoriteFood)(message, userId);
        (0, chai_1.expect)(result).to.equal('寿司か！ええやん！');
    });
    it('should return null when message does not start with "好きな食べ物は"', async () => {
        const userId = 'testUser';
        const message = 'こんにちは';
        const result = await (0, kame_buttler_1.updateFavoriteFood)(message, userId);
        (0, chai_1.expect)(result).to.equal(null);
    });
});
describe('updateFavoriteColor', () => {
    it('should update favoriteColor when message starts with "好きな色は"', async () => {
        const userId = 'testUser';
        const message = '好きな色は 青';
        const result = await (0, kame_buttler_1.updateFavoriteColor)(message, userId);
        (0, chai_1.expect)(result).to.equal('青か！素敵な色やね！');
    });
    it('should return null when message does not start with "好きな色は"', async () => {
        const userId = 'testUser';
        const message = 'こんにちは';
        const result = await (0, kame_buttler_1.updateFavoriteColor)(message, userId);
        (0, chai_1.expect)(result).to.equal(null);
    });
});
describe('updateFavoriteMusic', () => {
    it('should update favoriteMusic when message starts with "好きな音楽は"', async () => {
        const userId = 'testUser';
        const message = '好きな音楽は ロック';
        const result = await (0, kame_buttler_1.updateFavoriteMusic)(message, userId);
        (0, chai_1.expect)(result).to.equal('ロックか！ええ趣味やね！');
    });
    it('should return null when message does not start with "好きな音楽は"', async () => {
        const userId = 'testUser';
        const message = 'こんにちは';
        const result = await (0, kame_buttler_1.updateFavoriteMusic)(message, userId);
        (0, chai_1.expect)(result).to.equal(null);
    });
});
describe('updateFavoritePlace', () => {
    it('should update favoritePlace when message starts with "好きな場所は"', async () => {
        const userId = 'testUser';
        const message = '好きな場所は 京都';
        const result = await (0, kame_buttler_1.updateFavoritePlace)(message, userId);
        (0, chai_1.expect)(result).to.equal('京都か！行ってみたいなぁ！');
    });
    it('should return null when message does not start with "好きな場所は"', async () => {
        const userId = 'testUser';
        const message = 'こんにちは';
        const result = await (0, kame_buttler_1.updateFavoritePlace)(message, userId);
        (0, chai_1.expect)(result).to.equal(null);
    });
});
// getUserInfoHandler のテストを修正: テスト環境ではデフォルト値を返すことを確認
describe('getUserInfoHandler in Test Env', () => {
    before(() => {
        process.env.NODE_ENV = 'test'; // テスト環境フラグを設定
    });
    it('should return default user info in test environment', async () => {
        const userId = 'nonExistentUserForTest'; // 存在しないIDを使用
        const result = await (0, kame_buttler_1.getUserInfoHandler)(userId);
        (0, chai_1.expect)(result.userId).to.equal(userId);
        (0, chai_1.expect)(result.userName).to.equal(''); // デフォルト値を確認
        (0, chai_1.expect)(result.preferences.favoriteFood).to.equal('お好み焼き'); // デフォルト値を確認
    });
    after(() => {
        delete process.env.NODE_ENV; // テスト環境フラグを削除
    });
});
describe('Firebase Realtime Database and Spreadsheet Integration Tests', function () {
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
        await (0, kame_buttler_1.deleteUserInfo)(userId);
    });
    // 全てのテストが終わった後にユーザー情報を削除
    after(async () => {
        await (0, kame_buttler_1.deleteUserInfo)(userId);
    });
    it('should save and retrieve user info from Firebase', async () => {
        await (0, kame_buttler_1.saveUserInfo)(userId, testUserInfo); // まず保存
        const retrievedUserInfo = await (0, kame_buttler_1.getUserInfo)(userId); // 次に取得
        // 取得した情報が保存した情報と（部分的に）一致するか確認
        (0, chai_1.expect)(retrievedUserInfo).to.not.be.null;
        // Firebaseが空配列を省略する場合があるため、存在するプロパティのみを比較
        (0, chai_1.expect)(retrievedUserInfo === null || retrievedUserInfo === void 0 ? void 0 : retrievedUserInfo.userId).to.equal(testUserInfo.userId);
        (0, chai_1.expect)(retrievedUserInfo === null || retrievedUserInfo === void 0 ? void 0 : retrievedUserInfo.userName).to.equal(testUserInfo.userName);
        (0, chai_1.expect)(retrievedUserInfo === null || retrievedUserInfo === void 0 ? void 0 : retrievedUserInfo.preferences).to.deep.equal(testUserInfo.preferences);
        // chatHistory と recentTopics は存在しないか空配列であることを確認
        (0, chai_1.expect)((retrievedUserInfo === null || retrievedUserInfo === void 0 ? void 0 : retrievedUserInfo.chatHistory) || []).to.be.an('array').that.is.empty;
        (0, chai_1.expect)((retrievedUserInfo === null || retrievedUserInfo === void 0 ? void 0 : retrievedUserInfo.recentTopics) || []).to.be.an('array').that.is.empty;
    });
    it('should log a message to the spreadsheet and retrieve it (requires manual verification or more robust retrieval)', async () => {
        // NODE_ENVを一時的に本番環境扱いにしてスプレッドシートに書き込む
        const originalEnv = process.env.NODE_ENV;
        delete process.env.NODE_ENV;
        await (0, kame_buttler_1.logMessageToSpreadsheet)(testMessage, userId);
        // スプレッドシートからの取得を試みる (getLatestMessageByUserId は改善が必要な場合あり)
        // 注意: このテストはスプレッドシートの状態に依存し、不安定になる可能性があります。
        // getLatestMessageByUserId が確実に最新メッセージを取得できる保証がないため、
        // 厳密なテストにはスプレッドシートAPIを直接叩くなどの工夫が必要です。
        const latestMessageData = await (0, kame_buttler_1.getLatestMessageByUserId)(userId);
        // 環境変数を元に戻す
        process.env.NODE_ENV = originalEnv;
        // 取得したデータにテストメッセージが含まれているか確認 (より緩いチェック)
        // latestMessageData が null でないこと、かつ testMessage を含むことを期待
        (0, chai_1.expect)(latestMessageData).to.be.a('string'); // nullでないことを確認
        (0, chai_1.expect)(latestMessageData).to.contain(testMessage); // メッセージが含まれるか確認
    });
});
// generateReplyMessage, updateChatHistory, saveUserInfoHandler, postCommandR, createCoherePayload, getCohereResponse, replyToLine, saveUserInfo, getUserInfo, logMessageToSpreadsheet, getLatestMessageByUserId は外部APIやFirebaseとの連携が必要なため、モック化するか、統合テストとして実装する必要があります。
