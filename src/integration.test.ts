import { expect } from 'chai';
import fetch from 'node-fetch';
import * as kameButler from './kame_buttler';

// 実際のAPIとの統合テスト（環境変数が設定されている場合のみ実行）
describe('Integration Tests - Real API Connections', function() {
  this.timeout(30000); // APIコールのために長めのタイムアウト

  describe('Gemini API Integration', () => {
    it('should connect to Gemini API and get response', async function() {
      if (!process.env.GEMINI_API_KEY) {
        console.log('GEMINI_API_KEY not set, skipping Gemini integration test');
        this.skip();
      }

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY!
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: 'Hello, this is a test message.' }]
          }]
        })
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data.candidates).to.be.an('array');
      expect(data.candidates[0].content.parts[0].text).to.be.a('string');
    });
  });


  describe('User Profile Service Integration', () => {
    it('should connect to user-profile-service when running', async function() {
      const serviceUrl = process.env.USER_PROFILE_SERVICE_URL || 'http://localhost:8080';
      
      try {
        const response = await fetch(serviceUrl, {
          method: 'GET'
        });

        if (response.status === 200) {
          const text = await response.text();
          expect(text).to.include('User Profile MCP server is running');
        } else {
          console.log('User Profile Service is not running');
          this.skip();
        }
      } catch (error) {
        console.log('User Profile Service is not accessible');
        this.skip();
      }
    });

    it('should test user profile retrieval via service', async function() {
      const serviceUrl = process.env.USER_PROFILE_SERVICE_URL || 'http://localhost:8080';
      
      try {
        const response = await fetch(`${serviceUrl}/get_user_profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'integration-test-user' })
        });

        if (response.status === 200) {
          const data = await response.json();
          expect(data.content).to.be.an('array');
          expect(data.content[0].type).to.equal('text');
          
          const userProfile = JSON.parse(data.content[0].text);
          expect(userProfile.userId).to.equal('integration-test-user');
        } else {
          console.log('User Profile Service endpoint not accessible');
          this.skip();
        }
      } catch (error) {
        console.log('User Profile Service is not accessible');
        this.skip();
      }
    });
  });

  describe('Rakuten Service Integration', () => {
    it('should connect to rakuten-server when running', async function() {
      const serviceUrl = process.env.RAKUTEN_SERVER_URL || 'http://localhost:8080';
      
      try {
        const response = await fetch(serviceUrl, {
          method: 'GET'
        });

        if (response.status === 200) {
          const text = await response.text();
          expect(text).to.include('Rakuten MCP server is running');
        } else {
          console.log('Rakuten Server is not running');
          this.skip();
        }
      } catch (error) {
        console.log('Rakuten Server is not accessible');
        this.skip();
      }
    });

    it('should test Rakuten item search via service', async function() {
      const serviceUrl = process.env.RAKUTEN_SERVER_URL || 'http://localhost:8080';
      
      try {
        const response = await fetch(`${serviceUrl}/search_rakuten_items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            keyword: 'Nintendo Switch',
            hits: 3
          })
        });

        if (response.status === 200) {
          const data = await response.json();
          expect(data.content).to.be.an('array');
          expect(data.content[0].type).to.equal('text');
          
          const items = JSON.parse(data.content[0].text);
          expect(items).to.be.an('array');
          if (items.length > 0) {
            expect(items[0]).to.have.property('itemName');
            expect(items[0]).to.have.property('itemUrl');
            expect(items[0]).to.have.property('itemPrice');
          }
        } else {
          console.log('Rakuten Server endpoint not accessible');
          this.skip();
        }
      } catch (error) {
        console.log('Rakuten Server is not accessible');
        this.skip();
      }
    });
  });

  describe('Firebase Realtime Database Integration', () => {
    it('should connect to Firebase Realtime Database and test user profile operations', async function() {
      if (!process.env.CREDENTIALS_ADMIN || !process.env.FIREBASE_URL) {
        console.log('Firebase credentials not set, skipping Firebase integration test');
        this.skip();
      }

      try {
        // テスト環境を一時的に無効化してFirebaseをテスト
        const originalEnv = process.env.NODE_ENV;
        delete process.env.NODE_ENV;

        const testUserId = 'firebase-integration-test-user';
        const testUserInfo = {
          userId: testUserId,
          userName: 'Firebase Test User',
          chatHistory: [{
            timestamp: new Date().toISOString(),
            message: 'Firebase テストメッセージ',
            response: 'Firebase テスト応答'
          }],
          recentTopics: ['Firebase', 'テスト'],
          preferences: {
            favoriteFood: 'たこ焼き',
            language: '関西弁',
            favoriteColor: '赤',
            favoriteMusic: 'ポップス',
            favoritePlace: '大阪'
          },
          sentiment: 'positive'
        };

        // ユーザー情報をFirebaseに保存
        await kameButler.saveUserInfoHandler(testUserId, testUserInfo);
        console.log('✓ Firebase write operation successful');

        // ユーザー情報をFirebaseから取得
        const retrievedUserInfo = await kameButler.getUserInfoHandler(testUserId);
        console.log('✓ Firebase read operation successful');

        // データが正しく保存・取得されているか確認
        expect(retrievedUserInfo.userId).to.equal(testUserId);
        
        // 実際のFirebase接続の場合は保存されたデータが返される
        if (retrievedUserInfo.userName === 'Firebase Test User') {
          console.log('✓ Real Firebase connection is working');
          expect(retrievedUserInfo.preferences.favoriteFood).to.equal('たこ焼き');
          expect(retrievedUserInfo.preferences.favoritePlace).to.equal('大阪');
          expect(retrievedUserInfo.chatHistory).to.have.lengthOf(1);
          expect(retrievedUserInfo.chatHistory[0].message).to.equal('Firebase テストメッセージ');
        } else {
          console.log('✓ Firebase fallback is working (MCP tools not available)');
          expect(retrievedUserInfo.preferences.favoriteFood).to.equal('お好み焼き');
        }

        // 環境を復元
        process.env.NODE_ENV = originalEnv;

      } catch (error) {
        // 認証エラーの場合はスキップ、その他のエラーは詳細を表示
        if ((error as Error).message.includes('Authentication') || 
            (error as Error).message.includes('DECODER routines') ||
            (error as Error).message.includes('credential')) {
          console.log('Firebase authentication failed, using fallback');
          this.skip();
        } else {
          console.error('Firebase integration test error:', error);
          throw error;
        }
      }
    });

    it('should test Firebase database URL and project configuration', async function() {
      const firebaseUrl = process.env.FIREBASE_URL;
      const expectedProjectId = 'turtle-buttler-e34e9';

      if (!firebaseUrl) {
        console.log('FIREBASE_URL not set');
        this.skip();
      }

      // Firebase URLが統合後の正しいプロジェクトを指しているか確認
      expect(firebaseUrl).to.include(expectedProjectId);
      expect(firebaseUrl).to.include('firebaseio.com');
      console.log('✓ Firebase URL points to correct project:', expectedProjectId);
    });

    it('should test Firebase service account configuration', async function() {
      const credentialsAdmin = process.env.CREDENTIALS_ADMIN;

      if (!credentialsAdmin) {
        console.log('CREDENTIALS_ADMIN not set');
        this.skip();
      }

      try {
        // Base64エンコードされた認証情報をデコード
        const decodedCredentials = Buffer.from(credentialsAdmin, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(decodedCredentials);

        // 正しいプロジェクトIDが設定されているか確認
        expect(serviceAccount.project_id).to.equal('turtle-buttler-e34e9');
        expect(serviceAccount.type).to.equal('service_account');
        expect(serviceAccount.client_email).to.include('turtle-buttler-e34e9');

        console.log('✓ Service account configured for project:', serviceAccount.project_id);
        console.log('✓ Service account email:', serviceAccount.client_email);

      } catch (error) {
        console.log('Failed to parse service account credentials');
        this.skip();
      }
    });

    it('should test Firebase connection with multiple concurrent operations', async function() {
      if (!process.env.CREDENTIALS_ADMIN || !process.env.FIREBASE_URL) {
        console.log('Firebase credentials not set, skipping concurrent test');
        this.skip();
      }

      try {
        // テスト環境を一時的に無効化
        const originalEnv = process.env.NODE_ENV;
        delete process.env.NODE_ENV;

        const concurrentUsers = 3;
        const operations = [];

        // 同時に複数のユーザー操作を実行
        for (let i = 0; i < concurrentUsers; i++) {
          const userId = `firebase-concurrent-test-${i}`;
          const userInfo = {
            userId,
            userName: `Concurrent User ${i}`,
            chatHistory: [],
            recentTopics: [`topic-${i}`],
            preferences: {
              favoriteFood: `food-${i}`,
              language: '関西弁'
            },
            sentiment: 'neutral'
          };

          operations.push(
            kameButler.saveUserInfoHandler(userId, userInfo)
              .then(() => kameButler.getUserInfoHandler(userId))
          );
        }

        const startTime = Date.now();
        const results = await Promise.all(operations);
        const endTime = Date.now();

        expect(results).to.have.lengthOf(concurrentUsers);
        
        results.forEach((result, index) => {
          expect(result.userId).to.equal(`firebase-concurrent-test-${index}`);
        });

        const duration = endTime - startTime;
        console.log(`✓ Firebase concurrent operations completed in ${duration}ms`);

        // 環境を復元
        process.env.NODE_ENV = originalEnv;

      } catch (error) {
        if ((error as Error).message.includes('Authentication') || 
            (error as Error).message.includes('DECODER routines')) {
          console.log('Firebase authentication failed for concurrent test');
          this.skip();
        } else {
          throw error;
        }
      }
    });
  });

  describe('Google Sheets Integration', () => {
    it('should test Google Sheets API connection', async function() {
      if (!process.env.CREDENTIALS_ADMIN || !process.env.SPREADSHEET_ID) {
        console.log('Google Sheets credentials not set, skipping integration test');
        this.skip();
      }

      try {
        // テスト環境を一時的に無効化してGoogle Sheetsをテスト
        const originalEnv = process.env.NODE_ENV;
        delete process.env.NODE_ENV;

        await kameButler.logMessageToSpreadsheet('Integration test message', 'integration-test-user');
        
        // 環境を復元
        process.env.NODE_ENV = originalEnv;

        // エラーが発生しなければテスト成功
        expect(true).to.be.true;
      } catch (error) {
        // 認証エラーの場合はスキップ、その他のエラーは失敗とする
        if ((error as Error).message.includes('Authentication') || 
            (error as Error).message.includes('DECODER routines')) {
          console.log('Google Sheets authentication failed');
          this.skip();
        } else {
          throw error;
        }
      }
    });
  });

  describe('LINE API Integration', () => {
    it('should test LINE API connection', async function() {
      if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        console.log('LINE_CHANNEL_ACCESS_TOKEN not set, skipping LINE integration test');
        this.skip();
      }

      // 実際のLINE APIではなく、リクエスト形式のテスト
      const payload = {
        replyToken: 'dummy-reply-token',
        messages: [{
          type: 'text',
          text: 'Integration test message'
        }]
      };

      try {
        const response = await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
          },
          body: JSON.stringify(payload)
        });

        // ダミートークンなので400エラーが期待される
        expect(response.status).to.equal(400);
      } catch (error) {
        // ネットワークエラーの場合はスキップ
        console.log('LINE API not accessible');
        this.skip();
      }
    });
  });
});

// MCP Tools の動作確認テスト
describe('MCP Tools Integration Tests', function() {
  this.timeout(10000);

  describe('MCP Tool Availability Check', () => {
    it('should check if MCP tools are available', async () => {
      // グローバルのuse_mcp_tool関数の存在確認
      const mcpAvailable = typeof (global as any).use_mcp_tool === 'function';
      
      if (mcpAvailable) {
        console.log('✓ MCP tools are available');
        
        // 利用可能なMCPツールのテスト
        try {
          const userProfileResult = await (global as any).use_mcp_tool(
            'user-profile-server',
            'get_user_profile',
            { userId: 'mcp-test-user' }
          );
          
          expect(userProfileResult).to.be.a('string');
          console.log('✓ User Profile MCP tool is working');
        } catch (error) {
          console.log('⚠ User Profile MCP tool is not available:', (error as Error).message);
        }

        try {
          const rakutenResult = await (global as any).use_mcp_tool(
            'rakuten-server',
            'search_rakuten_items',
            { keyword: 'test', hits: 1 }
          );
          
          expect(rakutenResult).to.be.a('string');
          console.log('✓ Rakuten MCP tool is working');
        } catch (error) {
          console.log('⚠ Rakuten MCP tool is not available:', (error as Error).message);
        }
      } else {
        console.log('⚠ MCP tools are not available, using fallback methods');
        
        // フォールバック機能のテスト
        const userInfo = await kameButler.getUserInfoHandler('fallback-test-user');
        expect(userInfo.userId).to.equal('fallback-test-user');
        expect(userInfo.preferences.favoriteFood).to.equal('お好み焼き');
        console.log('✓ Fallback methods are working');
      }
    });
  });

  describe('Cross-Service Communication', () => {
    it('should test communication between services', async function() {
      // ユーザー情報の保存と取得のテスト
      const testUserId = 'cross-service-test-user';
      const testUserInfo = {
        userId: testUserId,
        userName: 'Integration Test User',
        chatHistory: [{
          timestamp: new Date().toISOString(),
          message: 'テストメッセージ',
          response: 'テスト応答'
        }],
        recentTopics: ['テスト'],
        preferences: {
          favoriteFood: '寿司',
          language: '関西弁',
          favoriteColor: '青',
          favoriteMusic: 'ジャズ',
          favoritePlace: '京都'
        },
        sentiment: 'positive'
      };

      // ユーザー情報を保存
      await kameButler.saveUserInfoHandler(testUserId, testUserInfo);
      
      // ユーザー情報を取得
      const retrievedUserInfo = await kameButler.getUserInfoHandler(testUserId);
      
      expect(retrievedUserInfo.userId).to.equal(testUserId);
      
      // テスト環境では基本的にフォールバック動作するが、
      // 実際のMCPツールが利用可能な場合は実際のデータが返される
      if (retrievedUserInfo.userName === 'Integration Test User') {
        console.log('✓ Real MCP communication is working');
        expect(retrievedUserInfo.preferences.favoriteFood).to.equal('寿司');
      } else {
        console.log('✓ Fallback communication is working');
        expect(retrievedUserInfo.preferences.favoriteFood).to.equal('お好み焼き');
      }
    });

    it('should test end-to-end conversation flow', async function() {
      // エンドツーエンドの会話フローテスト
      const testUserId = 'e2e-test-user';
      const testMessage = 'こんにちは、カメ執事さん';

      try {
        // 会話の実行
        const response = await kameButler.postCommandR(testMessage, testUserId);
        
        expect(response).to.be.a('string');
        expect(response.length).to.be.greaterThan(0);
        
        // 関西弁での応答が含まれているかチェック
        const hasKansaiBen = response.includes('ご主人様') || 
                            response.includes('やで') || 
                            response.includes('ですやろ') ||
                            response.includes('おくれやす');
        
        expect(hasKansaiBen).to.be.true;
        console.log('✓ End-to-end conversation flow is working');
        console.log('Response:', response.substring(0, 100) + '...');
        
      } catch (error) {
        console.log('⚠ End-to-end test failed:', (error as Error).message);
        throw error;
      }
    });
  });
});

// パフォーマンステスト
describe('Performance Tests', function() {
  this.timeout(30000);

  it('should handle multiple concurrent requests', async function() {
    const concurrentRequests = 5;
    const testPromises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      testPromises.push(
        kameButler.getUserInfoHandler(`performance-test-user-${i}`)
      );
    }

    const startTime = Date.now();
    const results = await Promise.all(testPromises);
    const endTime = Date.now();

    expect(results).to.have.lengthOf(concurrentRequests);
    results.forEach((result, index) => {
      expect(result.userId).to.equal(`performance-test-user-${index}`);
    });

    const duration = endTime - startTime;
    console.log(`✓ Processed ${concurrentRequests} concurrent requests in ${duration}ms`);
    
    // 同時リクエストが合理的な時間内で処理されることを確認
    expect(duration).to.be.lessThan(10000); // 10秒以内
  });

  it('should handle large chat history efficiently', async function() {
    const userInfo = {
      userId: 'performance-test-user',
      userName: 'Performance Test User',
      chatHistory: new Array(100).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        message: `Message ${i}`,
        response: `Response ${i}`
      })),
      recentTopics: new Array(50).fill(null).map((_, i) => `Topic ${i}`),
      preferences: {
        favoriteFood: 'お好み焼き',
        language: '関西弁'
      },
      sentiment: 'neutral'
    };

    const startTime = Date.now();
    kameButler.updateChatHistory(userInfo, 'New message', 'New response');
    const endTime = Date.now();

    const duration = endTime - startTime;
    console.log(`✓ Processed large chat history update in ${duration}ms`);
    
    // 大量のチャット履歴でも高速に処理されることを確認
    expect(duration).to.be.lessThan(100); // 100ms以内
    expect(userInfo.chatHistory[0].message).to.equal('New message');
    expect(userInfo.chatHistory).to.have.lengthOf(50); // 制限内に収まる
  });
});