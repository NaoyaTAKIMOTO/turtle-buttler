import { expect } from 'chai';
import {
  analyzeSentiment,
  getReplyMessage,
  updateUserName,
  updateFavoriteFood,
  updateFavoriteColor,
  updateFavoriteMusic,
  updateFavoritePlace,
  updateChatHistory
} from './kame_buttler';

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

describe('Unit Tests - Pure Functions', () => {
  describe('getReplyMessage', () => {
    it('should return correct greeting for "こんにちは"', () => {
      const result = getReplyMessage("こんにちは");
      expect(result).to.equal("まいど！カメ執事のAIやで！");
    });

    it('should return correct thank you message for "ありがとう"', () => {
      const result = getReplyMessage("ありがとう");
      expect(result).to.equal("どういたしましてやで！お役に立てて嬉しいで！");
    });

    it('should return default message for unknown input', () => {
      const result = getReplyMessage("未知のメッセージ");
      expect(result).to.equal("すんまへん、ようわかりまへんでした。もっと詳しく教えてくれると嬉しいで！");
    });
  });

  describe('analyzeSentiment', () => {
    it('should return positive for happy words', () => {
      expect(analyzeSentiment("嬉しいです")).to.equal("positive");
      expect(analyzeSentiment("楽しい時間でした")).to.equal("positive");
      expect(analyzeSentiment("幸せです")).to.equal("positive");
    });

    it('should return negative for sad words', () => {
      expect(analyzeSentiment("悲しいです")).to.equal("negative");
      expect(analyzeSentiment("辛い状況です")).to.equal("negative");
      expect(analyzeSentiment("苦しいです")).to.equal("negative");
    });

    it('should return angry for angry words', () => {
      expect(analyzeSentiment("怒りが湧いてます")).to.equal("angry");
      expect(analyzeSentiment("ムカつく")).to.equal("angry");
      expect(analyzeSentiment("イライラします")).to.equal("angry");
    });

    it('should return neutral for normal text', () => {
      expect(analyzeSentiment("今日は良い天気ですね")).to.equal("neutral");
      expect(analyzeSentiment("普通の日常です")).to.equal("neutral");
    });
  });

  describe('User Information Updates', () => {
    describe('updateUserName', () => {
      it('should extract and return name when pattern matches', async () => {
        const result = await updateUserName("名前は太郎", "test-user");
        expect(result).to.equal("太郎やね！これからよろしくやで！");
      });

      it('should handle name with spaces', async () => {
        const result = await updateUserName("名前は 田中太郎 ", "test-user");
        expect(result).to.equal("田中太郎やね！これからよろしくやで！");
      });

      it('should return null for non-matching pattern', async () => {
        const result = await updateUserName("こんにちは", "test-user");
        expect(result).to.be.null;
      });
    });

    describe('updateFavoriteFood', () => {
      it('should extract and return food when pattern matches', async () => {
        const result = await updateFavoriteFood("好きな食べ物はラーメン", "test-user");
        expect(result).to.equal("ラーメンか！ええやん！");
      });

      it('should handle food with spaces', async () => {
        const result = await updateFavoriteFood("好きな食べ物は お寿司 ", "test-user");
        expect(result).to.equal("お寿司か！ええやん！");
      });

      it('should return null for non-matching pattern', async () => {
        const result = await updateFavoriteFood("こんにちは", "test-user");
        expect(result).to.be.null;
      });
    });

    describe('updateFavoriteColor', () => {
      it('should extract and return color when pattern matches', async () => {
        const result = await updateFavoriteColor("好きな色は青", "test-user");
        expect(result).to.equal("青か！素敵な色やね！");
      });

      it('should return null for non-matching pattern', async () => {
        const result = await updateFavoriteColor("こんにちは", "test-user");
        expect(result).to.be.null;
      });
    });

    describe('updateFavoriteMusic', () => {
      it('should extract and return music when pattern matches', async () => {
        const result = await updateFavoriteMusic("好きな音楽はジャズ", "test-user");
        expect(result).to.equal("ジャズか！ええ趣味やね！");
      });

      it('should return null for non-matching pattern', async () => {
        const result = await updateFavoriteMusic("こんにちは", "test-user");
        expect(result).to.be.null;
      });
    });

    describe('updateFavoritePlace', () => {
      it('should extract and return place when pattern matches', async () => {
        const result = await updateFavoritePlace("好きな場所は京都", "test-user");
        expect(result).to.equal("京都か！行ってみたいなぁ！");
      });

      it('should return null for non-matching pattern', async () => {
        const result = await updateFavoritePlace("こんにちは", "test-user");
        expect(result).to.be.null;
      });
    });
  });

  describe('updateChatHistory', () => {
    it('should add new chat entry to empty history', () => {
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

      updateChatHistory(userInfo, 'テストメッセージ', 'テスト応答');

      expect(userInfo.chatHistory).to.have.lengthOf(1);
      expect(userInfo.chatHistory[0].message).to.equal('テストメッセージ');
      expect(userInfo.chatHistory[0].response).to.equal('テスト応答');
      expect(userInfo.chatHistory[0].timestamp).to.be.a('string');
    });

    it('should add new chat entry to existing history', () => {
      const userInfo: UserInfo = {
        userId: 'test-user',
        userName: 'Test User',
        chatHistory: [{
          timestamp: '2023-01-01T00:00:00.000Z',
          message: '古いメッセージ',
          response: '古い応答'
        }],
        recentTopics: [],
        preferences: {
          favoriteFood: 'お好み焼き',
          language: '関西弁'
        },
        sentiment: 'neutral'
      };

      updateChatHistory(userInfo, '新しいメッセージ', '新しい応答');

      expect(userInfo.chatHistory).to.have.lengthOf(2);
      expect(userInfo.chatHistory[1].message).to.equal('新しいメッセージ');
      expect(userInfo.chatHistory[1].response).to.equal('新しい応答');
    });

    it('should maintain chronological order', (done) => {
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

      updateChatHistory(userInfo, 'メッセージ1', '応答1');
      
      // 少し待ってから次のメッセージを追加
      setTimeout(() => {
        updateChatHistory(userInfo, 'メッセージ2', '応答2');
        
        expect(userInfo.chatHistory).to.have.lengthOf(2);
        const time1 = new Date(userInfo.chatHistory[0].timestamp).getTime();
        const time2 = new Date(userInfo.chatHistory[1].timestamp).getTime();
        expect(time2).to.be.greaterThan(time1);
        done();
      }, 10);
    });
  });
});