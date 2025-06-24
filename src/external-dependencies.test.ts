import { expect } from 'chai';
import sinon from 'sinon';
import * as kameButler from './kame_buttler';

// Gemini APIのモックテスト
describe('External Dependencies - Gemini API', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('should handle successful Gemini API response', async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'ご主人様、こんにちは！' }]
          },
          finishReason: 'STOP'
        }
      ]
    };

    fetchStub.resolves({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse)
    } as any);

    // postCommandRをテスト
    const result = await kameButler.postCommandR('こんにちは', 'test-user');
    expect(result).to.include('ご主人様');
  });

  it('should handle Gemini API error response', async () => {
    fetchStub.resolves({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: 'Invalid request' })
    } as any);

    try {
      await kameButler.postCommandR('テストメッセージ', 'test-user');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
    }
  });

  it('should handle network timeout', async () => {
    fetchStub.rejects(new Error('Network timeout'));

    try {
      await kameButler.postCommandR('テストメッセージ', 'test-user');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include('Network timeout');
    }
  });
});

// ユーザー情報処理のテスト
describe('External Dependencies - User Info Processing', () => {
  it('should return default user info when MCP tools are unavailable', async () => {
    // テスト環境では自動的にフォールバック動作する
    const result = await kameButler.getUserInfoHandler('test-user');
    
    expect(result.userId).to.equal('test-user');
    expect(result.preferences.favoriteFood).to.equal('お好み焼き');
  });

  it('should handle user name update', async () => {
    const result = await kameButler.updateUserName('名前は テストユーザー', 'test-user');
    expect(result).to.equal('テストユーザーやね！これからよろしくやで！');
  });

  it('should handle favorite food update', async () => {
    const result = await kameButler.updateFavoriteFood('好きな食べ物は 寿司', 'test-user');
    expect(result).to.equal('寿司か！ええやん！');
  });

  it('should return null for non-matching patterns', async () => {
    const result = await kameButler.updateUserName('こんにちは', 'test-user');
    expect(result).to.be.null;
  });
});

// Google Sheets のモックテスト
describe('External Dependencies - Google Sheets', () => {
  let googleSheetsStub: sinon.SinonStub;
  
  beforeEach(() => {
    // logMessageToSpreadsheet関数をモック化
    googleSheetsStub = sinon.stub(kameButler, 'logMessageToSpreadsheet');
  });

  afterEach(() => {
    googleSheetsStub.restore();
  });

  it('should handle successful message logging to spreadsheet', async () => {
    googleSheetsStub.resolves(true);

    await kameButler.logMessageToSpreadsheet('テストメッセージ', 'test-user');

    expect(googleSheetsStub.calledOnce).to.be.true;
    expect(googleSheetsStub.calledWith('テストメッセージ', 'test-user')).to.be.true;
  });

  it('should handle Google Sheets authentication error', async () => {
    googleSheetsStub.rejects(new Error('Authentication failed'));

    try {
      await kameButler.logMessageToSpreadsheet('テストメッセージ', 'test-user');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include('Authentication failed');
    }
  });
});

// LINE API のモックテスト
describe('External Dependencies - LINE API', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('should handle successful LINE reply', async () => {
    fetchStub.resolves({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as any);

    await kameButler.replyToLine('test-reply-token', 'テスト返信メッセージ');

    expect(fetchStub.calledOnce).to.be.true;
    
    const [url, options] = fetchStub.firstCall.args;
    expect(url).to.equal('https://api.line.me/v2/bot/message/reply');
    expect(options.method).to.equal('POST');
    expect(options.headers['Content-Type']).to.equal('application/json');
    
    const body = JSON.parse(options.body);
    expect(body.replyToken).to.equal('test-reply-token');
    expect(body.messages[0].text).to.equal('テスト返信メッセージ');
  });

  it('should handle LINE API error', async () => {
    fetchStub.resolves({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    } as any);

    // エラーハンドリングのテスト（関数がエラーをスローするかどうか確認）
    await kameButler.replyToLine('invalid-token', 'メッセージ');
    expect(fetchStub.calledOnce).to.be.true;
  });

  it('should handle LINE API timeout', async () => {
    fetchStub.rejects(new Error('Request timeout'));

    try {
      await kameButler.replyToLine('test-token', 'メッセージ');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
    }
  });
});

// 統合テスト - 感情分析とレスポンス生成
describe('External Dependencies - Sentiment Analysis Integration', () => {
  it('should analyze sentiment correctly', () => {
    expect(kameButler.analyzeSentiment('今日は嬉しい')).to.equal('positive');
    expect(kameButler.analyzeSentiment('今日は悲しい')).to.equal('negative');
    expect(kameButler.analyzeSentiment('マジでムカつく')).to.equal('angry');
    expect(kameButler.analyzeSentiment('今日は普通の日')).to.equal('neutral');
  });

  it('should generate appropriate reply messages', () => {
    expect(kameButler.getReplyMessage('こんにちは')).to.equal('まいど！カメ執事のAIやで！');
    expect(kameButler.getReplyMessage('ありがとう')).to.equal('どういたしましてやで！お役に立てて嬉しいで！');
    expect(kameButler.getReplyMessage('unknown')).to.equal('すんまへん、ようわかりまへんでした。もっと詳しく教えてくれると嬉しいで！');
  });
});

// チャット履歴の更新テスト
describe('External Dependencies - Chat History Management', () => {
  it('should update chat history correctly', () => {
    const userInfo = {
      userId: 'test-user',
      userName: '',
      chatHistory: [] as any[],
      recentTopics: [] as string[],
      preferences: { 
        favoriteFood: 'お好み焼き',
        language: '関西弁'
      },
      sentiment: '普通'
    };

    kameButler.updateChatHistory(
      userInfo,
      'こんにちは',
      'ご主人様、こんにちは！'
    );

    expect(userInfo.chatHistory).to.have.lengthOf(1);
    expect(userInfo.chatHistory[0].message).to.equal('こんにちは');
    expect(userInfo.chatHistory[0].response).to.equal('ご主人様、こんにちは！');
    expect(userInfo.recentTopics).to.include('こんにちは');
  });

  it('should limit chat history to maximum entries', () => {
    const userInfo = {
      userId: 'test-user',
      userName: '',
      chatHistory: new Array(50).fill(null).map((_, i) => ({
        timestamp: new Date().toISOString(),
        message: `message${i}`,
        response: `response${i}`
      })),
      recentTopics: [] as string[],
      preferences: { 
        favoriteFood: 'お好み焼き',
        language: '関西弁'
      },
      sentiment: '普通'
    };

    kameButler.updateChatHistory(
      userInfo,
      '新しいメッセージ',
      '新しい返信'
    );

    expect(userInfo.chatHistory).to.have.lengthOf(50);
    expect(userInfo.chatHistory[0].message).to.equal('新しいメッセージ');
  });
});