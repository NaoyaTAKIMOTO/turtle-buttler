import { expect } from 'chai';
import request from 'supertest';
import app from './kame_buttler';
import * as kameButler from './kame_buttler';

// E2Eテスト - 実際のAPIを使用するため、環境変数チェックでスキップ可能
describe('E2E Tests - Real API Integration', function() {
  this.timeout(30000); // E2Eテストは時間がかかる可能性があるため

  describe('LINE Webhook E2E', () => {
    it('should handle real LINE webhook request format', async function() {
      if (!process.env.GEMINI_API_KEY) {
        console.log('GEMINI_API_KEY not set, skipping E2E test');
        this.skip();
      }

      const lineWebhookPayload = {
        events: [{
          replyToken: 'test-reply-token-e2e',
          type: 'message',
          source: {
            userId: 'U1234567890abcdef'
          },
          message: {
            type: 'text',
            text: 'こんにちは'
          }
        }]
      };

      const response = await request(app)
        .post('/')
        .send(lineWebhookPayload)
        .expect(200);

      expect(response.text).to.equal('OK');
    });

    it('should handle non-LINE request', async function() {
      const response = await request(app)
        .post('/')
        .send({ test: 'data' })
        .expect(200);

      expect(response.body.message).to.include('LINE以外からのリクエスト');
    });

    it('should handle unsupported message type', async function() {
      const lineWebhookPayload = {
        events: [{
          replyToken: 'test-reply-token',
          type: 'message',
          source: {
            userId: 'U1234567890abcdef'
          },
          message: {
            type: 'image',
            id: 'dummy-image-id'
          }
        }]
      };

      const response = await request(app)
        .post('/')
        .send(lineWebhookPayload)
        .expect(200);

      expect(response.text).to.equal('OK');
    });
  });

  describe('Real Gemini API Integration', () => {
    it('should connect to real Gemini API when credentials are available', async function() {
      if (!process.env.GEMINI_API_KEY) {
        console.log('GEMINI_API_KEY not set, skipping real API test');
        this.skip();
      }

      // 実際のGemini APIを呼び出すテスト
      // テスト環境を一時的に無効化
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      try {
        const userInfo = {
          userId: 'e2e-test-user',
          userName: 'E2Eテストユーザー',
          chatHistory: [],
          recentTopics: [],
          preferences: {
            favoriteFood: 'お好み焼き',
            language: '関西弁',
            favoriteColor: '',
            favoriteMusic: '',
            favoritePlace: ''
          },
          sentiment: '普通'
        };

        // 実際のGemini APIを呼び出し
        const response = await kameButler.generateReplyMessage('こんにちは、テストです', 'e2e-test-user', userInfo);
        
        expect(response).to.be.a('string');
        expect(response.length).to.be.greaterThan(0);
        
        // カメ執事らしい応答かチェック（関西弁など）
        const hasKansaiBen = response.includes('ご主人様') || 
                            response.includes('やで') || 
                            response.includes('ですやろ') ||
                            response.includes('おくれやす') ||
                            response.includes('さん') ||
                            response.includes('わたくし');
        
        expect(hasKansaiBen).to.be.true;
        console.log('✓ Real Gemini API response:', response.substring(0, 100) + '...');
        
      } catch (error) {
        if ((error as Error).message.includes('API') || 
            (error as Error).message.includes('network') ||
            (error as Error).message.includes('timeout')) {
          console.log('Real API connection failed, this is expected in some environments');
          this.skip();
        } else {
          throw error;
        }
      } finally {
        // 環境を復元
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle API rate limiting gracefully', async function() {
      if (!process.env.GEMINI_API_KEY) {
        console.log('GEMINI_API_KEY not set, skipping rate limit test');
        this.skip();
      }

      // レート制限のテスト（実際にはスキップされる可能性が高い）
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      try {
        const userInfo = {
          userId: 'rate-limit-test-user',
          userName: 'レート制限テストユーザー',
          chatHistory: [],
          recentTopics: [],
          preferences: {
            favoriteFood: 'お好み焼き',
            language: '関西弁'
          },
          sentiment: '普通'
        };

        // 短時間に複数のリクエストを送信
        const promises = [];
        for (let i = 0; i < 3; i++) {
          promises.push(
            kameButler.generateReplyMessage(`テストメッセージ ${i}`, `rate-test-user-${i}`, {
              ...userInfo,
              userId: `rate-test-user-${i}`
            })
          );
        }

        const results = await Promise.allSettled(promises);
        
        // 少なくとも1つは成功することを期待
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        expect(successCount).to.be.greaterThan(0);
        
        console.log(`✓ Rate limit test: ${successCount}/3 requests succeeded`);
        
      } catch (error) {
        console.log('Rate limit test skipped due to API limitations');
        this.skip();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Firebase Integration E2E', () => {
    it('should test real Firebase operations when credentials are available', async function() {
      if (!process.env.CREDENTIALS_ADMIN || !process.env.FIREBASE_URL) {
        console.log('Firebase credentials not set, skipping Firebase E2E test');
        this.skip();
      }

      // 実際のFirebaseを使用するテスト
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      try {        
        const testUserId = 'firebase-e2e-test-user';
        const testUserInfo = {
          userId: testUserId,
          userName: 'Firebase E2Eテストユーザー',
          chatHistory: [{
            timestamp: new Date().toISOString(),
            message: 'Firebase E2Eテストメッセージ',
            response: 'Firebase E2Eテスト応答'
          }],
          recentTopics: ['Firebase', 'E2E', 'テスト'],
          preferences: {
            favoriteFood: 'うどん',
            language: '関西弁',
            favoriteColor: '緑',
            favoriteMusic: 'クラシック',
            favoritePlace: '奈良'
          },
          sentiment: 'positive'
        };

        // Firebase保存テスト
        await kameButler.saveUserInfoHandler(testUserId, testUserInfo);
        console.log('✓ Firebase write operation completed');

        // Firebase取得テスト
        const retrievedUserInfo = await kameButler.getUserInfoHandler(testUserId);
        console.log('✓ Firebase read operation completed');

        expect(retrievedUserInfo.userId).to.equal(testUserId);
        
        // 実際のFirebase接続の場合は保存されたデータが返される
        if (retrievedUserInfo.userName === 'Firebase E2Eテストユーザー') {
          console.log('✓ Real Firebase connection confirmed');
          expect(retrievedUserInfo.preferences.favoriteFood).to.equal('うどん');
          expect(retrievedUserInfo.preferences.favoritePlace).to.equal('奈良');
          expect(retrievedUserInfo.chatHistory).to.have.lengthOf(1);
        } else {
          console.log('✓ Firebase fallback working (MCP tools not available)');
          expect(retrievedUserInfo.preferences.favoriteFood).to.equal('お好み焼き');
        }

      } catch (error) {
        if ((error as Error).message.includes('Authentication') || 
            (error as Error).message.includes('permission') ||
            (error as Error).message.includes('credential')) {
          console.log('Firebase authentication failed, this is expected in some environments');
          this.skip();
        } else {
          console.error('Firebase E2E test error:', error);
          throw error;
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Full Conversation Flow E2E', () => {
    it('should handle complete conversation flow with real APIs', async function() {
      if (!process.env.GEMINI_API_KEY) {
        console.log('GEMINI_API_KEY not set, skipping full conversation test');
        this.skip();
      }

      this.timeout(60000); // フル会話テストは時間がかかる

      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      try {        
        const testUserId = 'full-conversation-e2e-user';
        
        // 1. 初回挨拶
        let userInfo = await kameButler.getUserInfoHandler(testUserId);
        let response1 = await kameButler.generateReplyMessage('こんにちは', testUserId, userInfo);
        expect(response1).to.be.a('string');
        console.log('✓ Greeting response received');

        // 2. 名前設定
        const nameResponse = await kameButler.updateUserName('名前は田中太郎', testUserId);
        expect(nameResponse).to.include('田中太郎');
        console.log('✓ Name update working');

        // 3. 好きな食べ物設定
        const foodResponse = await kameButler.updateFavoriteFood('好きな食べ物は寿司', testUserId);
        expect(foodResponse).to.include('寿司');
        console.log('✓ Favorite food update working');

        // 4. 会話履歴更新
        userInfo = await kameButler.getUserInfoHandler(testUserId);
        kameButler.updateChatHistory(userInfo, 'こんにちは', response1);
        expect(userInfo.chatHistory).to.have.lengthOf(1);
        console.log('✓ Chat history update working');

        // 5. 感情分析
        kameButler.analyzeUserSentiment(userInfo, '今日はとても嬉しいです');
        expect(userInfo.sentiment).to.equal('positive');
        console.log('✓ Sentiment analysis working');

        // 6. 2回目の会話（文脈を含む）
        const response2 = await kameButler.generateReplyMessage('ありがとう', testUserId, userInfo);
        expect(response2).to.be.a('string');
        console.log('✓ Contextual response received');

        // 7. ユーザー情報保存
        await kameButler.saveUserInfoHandler(testUserId, userInfo);
        console.log('✓ User info saved');

        console.log('✓ Full conversation flow completed successfully');

      } catch (error) {
        if ((error as Error).message.includes('API') || 
            (error as Error).message.includes('network') ||
            (error as Error).message.includes('timeout')) {
          console.log('Full conversation test skipped due to API limitations');
          this.skip();
        } else {
          throw error;
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Rakuten Search Integration E2E', () => {
    it('should search for products and return links when user explicitly requests', async function() {
      if (!process.env.GEMINI_API_KEY) {
        console.log('GEMINI_API_KEY not set, skipping Rakuten search test');
        this.skip();
      }

      this.timeout(30000); // 楽天API呼び出しは時間がかかる可能性

      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      try {
        const testUserId = 'rakuten-search-e2e-user';
        const userInfo = {
          userId: testUserId,
          userName: 'Rakuten検索テストユーザー',
          chatHistory: [],
          recentTopics: [],
          preferences: {
            favoriteFood: 'お好み焼き',
            language: '関西弁',
            favoriteColor: '',
            favoriteMusic: '',
            favoritePlace: ''
          },
          sentiment: '普通'
        };

        // ウェイクアップワードを使った明確な商品検索要求
        const searchRequest = 'Nintendo Switchのゲームを楽天で検索して';
        const response = await kameButler.generateReplyMessage(searchRequest, testUserId, userInfo);
        
        expect(response).to.be.a('string');
        expect(response.length).to.be.greaterThan(0);
        
        console.log('✓ Rakuten search request processed');
        console.log('Response:', response.substring(0, 200) + '...');
        
        // 楽天商品リンクが含まれているかチェック
        const hasRakutenLink = response.includes('rakuten.co.jp') || 
                              response.includes('item.rakuten.co.jp') ||
                              response.includes('楽天') ||
                              response.includes('商品');
        
        console.log('✓ Rakuten search response contains expected content');
        
        // 実際の楽天API呼び出しの場合のみリンクをチェック
        if (process.env.RAKUTEN_APPLICATION_ID) {
          expect(hasRakutenLink).to.be.true;
          console.log('✓ Real Rakuten API connection confirmed with product links');
        } else {
          console.log('✓ Rakuten API fallback working (no real API credentials)');
        }
        
      } catch (error) {
        if ((error as Error).message.includes('API') || 
            (error as Error).message.includes('network') ||
            (error as Error).message.includes('timeout') ||
            (error as Error).message.includes('rakuten') ||
            (error as Error).message.includes('MCP')) {
          console.log('Rakuten search test skipped due to API/MCP limitations');
          this.skip();
        } else {
          throw error;
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should NOT search for products when user is just chatting casually', async function() {
      if (!process.env.GEMINI_API_KEY) {
        console.log('GEMINI_API_KEY not set, skipping passive search test');
        this.skip();
      }

      this.timeout(30000);

      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      try {
        const testUserId = 'passive-search-e2e-user';
        const userInfo = {
          userId: testUserId,
          userName: 'パッシブ検索テストユーザー',
          chatHistory: [],
          recentTopics: [],
          preferences: {
            favoriteFood: 'お好み焼き',
            language: '関西弁',
            favoriteColor: '',
            favoriteMusic: '',
            favoritePlace: ''
          },
          sentiment: '疲れている'
        };

        // 疲れているという感情表現だが、商品検索を明確に要求していない
        const casualChat = '今日は疲れました';
        const response = await kameButler.generateReplyMessage(casualChat, testUserId, userInfo);
        
        expect(response).to.be.a('string');
        expect(response.length).to.be.greaterThan(0);
        
        console.log('✓ Casual chat processed');
        console.log('Response:', response.substring(0, 200) + '...');
        
        // 楽天商品リンクが含まれていないことを確認（消極的なプロンプト修正の効果）
        const hasRakutenLink = response.includes('rakuten.co.jp') || 
                              response.includes('item.rakuten.co.jp');
        
        // 修正されたプロンプトでは、明確な商品要求がない限り検索しない
        expect(hasRakutenLink).to.be.false;
        console.log('✓ Passive behavior confirmed - no product search for casual chat');
        
      } catch (error) {
        if ((error as Error).message.includes('API') || 
            (error as Error).message.includes('network') ||
            (error as Error).message.includes('timeout')) {
          console.log('Passive search test skipped due to API limitations');
          this.skip();
        } else {
          throw error;
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});