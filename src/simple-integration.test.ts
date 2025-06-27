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
});