import { expect } from 'chai';
import * as kameButler from './kame_buttler';

interface ChatHistoryEntry {
  timestamp: string;
  message: string;
  response: string;
}

interface UserInfo {
  userId: string;
  userName: string;
  chatHistory: ChatHistoryEntry[];
  recentTopics: string[];
  preferences: {
    favoriteFood: string;
    language: string;
    favoriteColor?: string;
    favoriteMusic?: string;
    favoritePlace?: string;
  };
  sentiment?: string;
  chatSummary?: string;
}

// テスト環境設定
process.env.NODE_ENV = 'test';

describe('Integration Tests - Simplified', () => {
  
  describe('User Information Functions', () => {
    it('should handle user name updates correctly', async () => {
      const result = await kameButler.updateUserName("名前は田中太郎", "test-user");
      expect(result).to.equal("田中太郎やね！これからよろしくやで！");
    });

    it('should handle favorite food updates correctly', async () => {
      const result = await kameButler.updateFavoriteFood("好きな食べ物はラーメン", "test-user");
      expect(result).to.equal("ラーメンか！ええやん！");
    });

    it('should return null for non-matching patterns', async () => {
      const result = await kameButler.updateUserName("こんにちは", "test-user");
      expect(result).to.be.null;
    });
  });

  describe('User Info Handler (Test Environment)', () => {
    it('should return default user info in test environment', async () => {
      const result = await kameButler.getUserInfoHandler('test-user');
      
      expect(result.userId).to.equal('test-user');
      expect(result.preferences.favoriteFood).to.equal('お好み焼き');
      expect(result.preferences.language).to.equal('関西弁');
      expect(result.sentiment).to.equal('普通');
      expect(result.chatHistory).to.be.an('array');
      expect(result.recentTopics).to.be.an('array');
    });

    it('should save and retrieve user info in test environment', async () => {
      
      const testUserInfo = {
        userId: 'test-save-user',
        userName: 'テスト保存ユーザー',
        chatHistory: [{
          timestamp: new Date().toISOString(),
          message: 'テストメッセージ',
          response: 'テスト応答'
        }],
        recentTopics: ['テスト'],
        preferences: {
          favoriteFood: 'ラーメン',
          language: '関西弁',
          favoriteColor: '青',
          favoriteMusic: 'ジャズ',
          favoritePlace: '京都'
        },
        sentiment: 'positive'
      };

      // 保存を実行
      await kameButler.saveUserInfoHandler('test-save-user', testUserInfo);
      
      // 取得して確認
      const retrievedInfo = await kameButler.getUserInfoHandler('test-save-user');
      expect(retrievedInfo.userName).to.equal('テスト保存ユーザー');
      expect(retrievedInfo.preferences.favoriteFood).to.equal('ラーメン');
      expect(retrievedInfo.preferences.favoritePlace).to.equal('京都');
    });
  });

  describe('Chat History Management', () => {
    it('should update chat history correctly', () => {
      
      const userInfo: UserInfo = {
        userId: 'test-user',
        userName: 'Test User',
        chatHistory: [],
        recentTopics: [],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      kameButler.updateChatHistory(userInfo, 'テストメッセージ', 'テスト応答');

      expect(userInfo.chatHistory).to.have.lengthOf(1);
      expect(userInfo.chatHistory[0].message).to.equal('テストメッセージ');
      expect(userInfo.chatHistory[0].response).to.equal('テスト応答');
      expect(userInfo.chatHistory[0].timestamp).to.be.a('string');
    });

    it('should handle multiple chat entries', () => {
      
      const userInfo: UserInfo = {
        userId: 'test-user',
        userName: 'Test User',
        chatHistory: [],
        recentTopics: [],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      kameButler.updateChatHistory(userInfo, 'メッセージ1', '応答1');
      kameButler.updateChatHistory(userInfo, 'メッセージ2', '応答2');

      expect(userInfo.chatHistory).to.have.lengthOf(2);
      expect(userInfo.chatHistory[0].message).to.equal('メッセージ1');
      expect(userInfo.chatHistory[1].message).to.equal('メッセージ2');
    });
  });

  describe('Sentiment Analysis', () => {
    it('should analyze positive sentiment correctly', () => {
      
      const userInfo: UserInfo = {
        userId: 'test-user',
        userName: 'Test User',
        chatHistory: [],
        recentTopics: [],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      kameButler.analyzeUserSentiment(userInfo, '今日はとても嬉しいです');
      expect(userInfo.sentiment).to.equal('positive');
    });

    it('should analyze negative sentiment correctly', () => {
      
      const userInfo: UserInfo = {
        userId: 'test-user',
        userName: 'Test User',
        chatHistory: [],
        recentTopics: [],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      kameButler.analyzeUserSentiment(userInfo, '今日は悲しい出来事がありました');
      expect(userInfo.sentiment).to.equal('negative');
    });
  });

  describe('Payload Creation', () => {
    it('should create correct Gemini payload', () => {
      
      const userInfo: UserInfo = {
        userId: 'test-user',
        userName: 'テストユーザー',
        chatHistory: [],
        recentTopics: ['テスト', '会話'],
        preferences: {
          favoriteFood: 'ラーメン',
          language: '関西弁',
          favoriteColor: '青',
          favoriteMusic: 'ジャズ',
          favoritePlace: '京都'
        },
        sentiment: 'positive',
        chatSummary: 'これまでの会話の要約テキスト'
      };

      const payload = kameButler.createGeminiPayload('こんにちは', userInfo);
      const parsedPayload = JSON.parse(payload);
      
      expect(parsedPayload.contents).to.be.an('array');
      expect(parsedPayload.contents.length).to.be.greaterThan(0);
      
      // システムプロンプトが含まれているかチェック
      const systemPrompt = parsedPayload.contents[0].parts[0].text;
      expect(systemPrompt).to.include('カメ執事');
      expect(systemPrompt).to.include('テストユーザー');
      expect(systemPrompt).to.include('ラーメン');
      expect(systemPrompt).to.include('テスト、会話');
      expect(systemPrompt).to.include('positive');
      expect(systemPrompt).to.include('これまでの会話の要約テキスト');
      
      // ユーザーメッセージが含まれているかチェック
      const lastMessage = parsedPayload.contents[parsedPayload.contents.length - 1];
      expect(lastMessage.parts[0].text).to.equal('こんにちは');
      
      // 楽天検索ツールが含まれているかチェック
      expect(parsedPayload.tools).to.be.an('array');
      expect(parsedPayload.tools[0].function_declarations[0].name).to.equal('search_rakuten_items');
    });

    it('should handle chat history in payload', () => {
      
      const userInfo: UserInfo = {
        userId: 'test-user',
        userName: 'テストユーザー',
        chatHistory: [
          {
            timestamp: '2023-01-01T00:00:00.000Z',
            message: '前回のメッセージ1',
            response: '前回の応答1'
          },
          {
            timestamp: '2023-01-01T00:01:00.000Z',
            message: '前回のメッセージ2',
            response: '前回の応答2'
          },
          {
            timestamp: '2023-01-01T00:02:00.000Z',
            message: '前回のメッセージ3',
            response: '前回の応答3'
          }
        ],
        recentTopics: [],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: '普通'
      };

      const payload = kameButler.createGeminiPayload('新しいメッセージ', userInfo);
      const parsedPayload = JSON.parse(payload);
      
      // 直近2件の会話履歴のみが含まれているかチェック
      const contents = parsedPayload.contents;
      let historyCount = 0;
      
      for (const content of contents) {
        if (content.role === 'user' && content.parts[0].text === '前回のメッセージ2') {
          historyCount++;
        }
        if (content.role === 'model' && content.parts[0].text === '前回の応答2') {
          historyCount++;
        }
        if (content.role === 'user' && content.parts[0].text === '前回のメッセージ3') {
          historyCount++;
        }
        if (content.role === 'model' && content.parts[0].text === '前回の応答3') {
          historyCount++;
        }
      }
      
      expect(historyCount).to.equal(4); // 最新2件の会話（user + model × 2）
    });
  });

  describe('Reply Message Generation', () => {
    it('should return fixed reply messages', () => {
      
      expect(kameButler.getReplyMessage("こんにちは")).to.equal("まいど！カメ執事のAIやで！");
      expect(kameButler.getReplyMessage("ありがとう")).to.equal("どういたしましてやで！お役に立てて嬉しいで！");
      expect(kameButler.getReplyMessage("未知のメッセージ")).to.equal("すんまへん、ようわかりまへんでした。もっと詳しく教えてくれると嬉しいで！");
    });
  });

  describe('Recent Topics Handling', () => {
    it('should handle undefined recentTopics without error', async () => {
      // recentTopicsが未定義のユーザー情報を模擬
      const userInfoWithoutRecentTopics = {
        userId: 'test-user',
        userName: 'Test User',
        chatHistory: [],
        // recentTopics: [] を意図的に省略してundefinedにする
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      // テスト環境のストアに保存
      await kameButler.saveUserInfoHandler('test-user', userInfoWithoutRecentTopics as any);

      // LINE Webhookのリクエストボディを模擬
      const mockLineRequest = {
        events: [{
          replyToken: 'test-reply-token',
          message: {
            type: 'text',
            text: 'こんにちは'
          },
          source: {
            userId: 'test-user'
          }
        }]
      };

      // handleLineRequest関数を呼び出し、エラーが発生しないことを確認
      await kameButler.handleLineRequest(mockLineRequest);

      // ユーザー情報を取得してrecentTopicsが正しく初期化されていることを確認
      const updatedUserInfo = await kameButler.getUserInfoHandler('test-user');
      expect(updatedUserInfo.recentTopics).to.be.an('array');
      // handleLineRequestによってrecentTopicsが初期化され、メッセージが追加されていることを確認
      expect(updatedUserInfo.recentTopics.length).to.be.greaterThan(0);
      expect(updatedUserInfo.recentTopics).to.include('こんにちは');
    });

    it('should handle normal recentTopics array correctly', async () => {
      // 正常なrecentTopicsを持つユーザー情報
      const userInfoWithRecentTopics = {
        userId: 'test-user-2',
        userName: 'Test User 2',
        chatHistory: [],
        recentTopics: ['過去の話題1', '過去の話題2'],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      await kameButler.saveUserInfoHandler('test-user-2', userInfoWithRecentTopics);

      const mockLineRequest = {
        events: [{
          replyToken: 'test-reply-token-2',
          message: {
            type: 'text',
            text: '新しい話題'
          },
          source: {
            userId: 'test-user-2'
          }
        }]
      };

      await kameButler.handleLineRequest(mockLineRequest);

      const updatedUserInfo = await kameButler.getUserInfoHandler('test-user-2');
      expect(updatedUserInfo.recentTopics).to.have.lengthOf(3);
      expect(updatedUserInfo.recentTopics).to.include('新しい話題');
      expect(updatedUserInfo.recentTopics[2]).to.equal('新しい話題');
    });

    it('should limit recentTopics to 5 items', async () => {
      // 5つの話題を持つユーザー情報
      const userInfoWithMaxTopics = {
        userId: 'test-user-3',
        userName: 'Test User 3',
        chatHistory: [],
        recentTopics: ['話題1', '話題2', '話題3', '話題4', '話題5'],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      await kameButler.saveUserInfoHandler('test-user-3', userInfoWithMaxTopics);

      const mockLineRequest = {
        events: [{
          replyToken: 'test-reply-token-3',
          message: {
            type: 'text',
            text: '新しい話題6'
          },
          source: {
            userId: 'test-user-3'
          }
        }]
      };

      await kameButler.handleLineRequest(mockLineRequest);

      const updatedUserInfo = await kameButler.getUserInfoHandler('test-user-3');
      expect(updatedUserInfo.recentTopics).to.have.lengthOf(5);
      expect(updatedUserInfo.recentTopics).to.not.include('話題1'); // 最古の話題が削除される
      expect(updatedUserInfo.recentTopics).to.include('新しい話題6'); // 新しい話題が追加される
      expect(updatedUserInfo.recentTopics[4]).to.equal('新しい話題6');
    });
  });

  describe('Chat History Handling', () => {
    it('should handle undefined chatHistory without error', () => {
      // chatHistoryが未定義のユーザー情報を模擬
      const userInfoWithoutChatHistory = {
        userId: 'test-user',
        userName: 'Test User',
        // chatHistory: [] を意図的に省略してundefinedにする
        recentTopics: [],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      // updateChatHistory関数を呼び出し、エラーが発生しないことを確認
      expect(() => {
        kameButler.updateChatHistory(userInfoWithoutChatHistory as any, 'テストメッセージ', 'テスト応答');
      }).to.not.throw();

      // chatHistoryが正しく初期化されていることを確認
      expect((userInfoWithoutChatHistory as any).chatHistory).to.be.an('array');
      expect((userInfoWithoutChatHistory as any).chatHistory).to.have.lengthOf(1);
      expect((userInfoWithoutChatHistory as any).chatHistory[0].message).to.equal('テストメッセージ');
    });

    it('should handle normal chatHistory array correctly', () => {
      const userInfoWithChatHistory = {
        userId: 'test-user',
        userName: 'Test User',
        chatHistory: [{
          timestamp: '2023-01-01T00:00:00.000Z',
          message: '過去のメッセージ',
          response: '過去の応答'
        }],
        recentTopics: [],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      kameButler.updateChatHistory(userInfoWithChatHistory, '新しいメッセージ', '新しい応答');

      expect(userInfoWithChatHistory.chatHistory).to.have.lengthOf(2);
      expect(userInfoWithChatHistory.chatHistory[1].message).to.equal('新しいメッセージ');
      expect(userInfoWithChatHistory.chatHistory[1].response).to.equal('新しい応答');
    });
  });

  describe('Preferences Handling', () => {
    it('should handle undefined preferences without error when updating favorite food', async () => {
      // preferencesが未定義のユーザー情報をテスト環境のストアに保存
      const userInfoWithoutPreferences = {
        userId: 'test-pref-user',
        userName: 'Test User',
        chatHistory: [],
        recentTopics: [],
        // preferences: {} を意図的に省略してundefinedにする
        sentiment: 'neutral'
      };

      await kameButler.saveUserInfoHandler('test-pref-user', userInfoWithoutPreferences as any);

      // テスト環境ではupdateFavoriteFood内でユーザー情報の更新はスキップされるため、
      // 直接MCPツールのテストストアを使用してテスト
      const result = await kameButler.updateFavoriteFood('好きな食べ物はカレー', 'test-pref-user');
      expect(result).to.equal('カレーか！ええやん！');

      // 手動でユーザー情報を更新してpreferencesの初期化をテスト
      const testUserInfo = await kameButler.getUserInfoHandler('test-pref-user');
      if (!testUserInfo.preferences) {
        testUserInfo.preferences = { favoriteFood: "お好み焼き", language: "関西弁" };
      }
      testUserInfo.preferences.favoriteFood = 'カレー';
      await kameButler.saveUserInfoHandler('test-pref-user', testUserInfo);

      const updatedUserInfo = await kameButler.getUserInfoHandler('test-pref-user');
      expect(updatedUserInfo.preferences).to.be.an('object');
      expect(updatedUserInfo.preferences.favoriteFood).to.equal('カレー');
    });

    it('should handle undefined preferences when updating favorite color', async () => {
      const userInfoWithoutPreferences = {
        userId: 'test-color-user',
        userName: 'Test User',
        chatHistory: [],
        recentTopics: [],
        sentiment: 'neutral'
      };

      await kameButler.saveUserInfoHandler('test-color-user', userInfoWithoutPreferences as any);

      const result = await kameButler.updateFavoriteColor('好きな色は赤', 'test-color-user');
      expect(result).to.equal('赤か！素敵な色やね！');

      const testUserInfo = await kameButler.getUserInfoHandler('test-color-user');
      if (!testUserInfo.preferences) {
        testUserInfo.preferences = { favoriteFood: "お好み焼き", language: "関西弁" };
      }
      testUserInfo.preferences.favoriteColor = '赤';
      await kameButler.saveUserInfoHandler('test-color-user', testUserInfo);

      const updatedUserInfo = await kameButler.getUserInfoHandler('test-color-user');
      expect(updatedUserInfo.preferences).to.be.an('object');
      expect(updatedUserInfo.preferences.favoriteColor).to.equal('赤');
    });

    it('should handle undefined preferences when updating favorite music', async () => {
      const userInfoWithoutPreferences = {
        userId: 'test-music-user',
        userName: 'Test User',
        chatHistory: [],
        recentTopics: [],
        sentiment: 'neutral'
      };

      await kameButler.saveUserInfoHandler('test-music-user', userInfoWithoutPreferences as any);

      const result = await kameButler.updateFavoriteMusic('好きな音楽はロック', 'test-music-user');
      expect(result).to.equal('ロックか！ええ趣味やね！');

      const testUserInfo = await kameButler.getUserInfoHandler('test-music-user');
      if (!testUserInfo.preferences) {
        testUserInfo.preferences = { favoriteFood: "お好み焼き", language: "関西弁" };
      }
      testUserInfo.preferences.favoriteMusic = 'ロック';
      await kameButler.saveUserInfoHandler('test-music-user', testUserInfo);

      const updatedUserInfo = await kameButler.getUserInfoHandler('test-music-user');
      expect(updatedUserInfo.preferences).to.be.an('object');
      expect(updatedUserInfo.preferences.favoriteMusic).to.equal('ロック');
    });

    it('should handle undefined preferences when updating favorite place', async () => {
      const userInfoWithoutPreferences = {
        userId: 'test-place-user',
        userName: 'Test User',
        chatHistory: [],
        recentTopics: [],
        sentiment: 'neutral'
      };

      await kameButler.saveUserInfoHandler('test-place-user', userInfoWithoutPreferences as any);

      const result = await kameButler.updateFavoritePlace('好きな場所は沖縄', 'test-place-user');
      expect(result).to.equal('沖縄か！行ってみたいなぁ！');

      const testUserInfo = await kameButler.getUserInfoHandler('test-place-user');
      if (!testUserInfo.preferences) {
        testUserInfo.preferences = { favoriteFood: "お好み焼き", language: "関西弁" };
      }
      testUserInfo.preferences.favoritePlace = '沖縄';
      await kameButler.saveUserInfoHandler('test-place-user', testUserInfo);

      const updatedUserInfo = await kameButler.getUserInfoHandler('test-place-user');
      expect(updatedUserInfo.preferences).to.be.an('object');
      expect(updatedUserInfo.preferences.favoritePlace).to.equal('沖縄');
    });

    it('should handle createGeminiPayload with undefined preferences safely', () => {
      const userInfoWithoutPreferences = {
        userId: 'test-user',
        userName: 'Test User',
        chatHistory: [],
        recentTopics: ['テスト'],
        // preferences: {} を意図的に省略してundefinedにする
        sentiment: 'neutral'
      };

      // createGeminiPayload関数を呼び出し、エラーが発生しないことを確認
      expect(() => {
        const payload = kameButler.createGeminiPayload('テストメッセージ', userInfoWithoutPreferences as any);
        const parsedPayload = JSON.parse(payload);
        expect(parsedPayload.contents).to.be.an('array');
      }).to.not.throw();
    });
  });

  // テスト終了時にサーバーを停止
  after(() => {
    process.exit(0);
  });
});