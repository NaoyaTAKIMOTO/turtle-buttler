import { expect } from 'chai';
import request from 'supertest';
import express from 'express';

describe('User Profile Service', () => {
  let app: express.Application;

  before(() => {
    // テスト用のシンプルなExpressアプリを作成
    app = express();
    app.use(express.json());

    // ヘルスチェックエンドポイント
    app.get('/', (req, res) => {
      res.status(200).send('User Profile MCP server is running.');
    });

    // モックエンドポイント
    app.post('/get_user_profile', (req: any, res: any) => {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Invalid userId' });
      }
      
      // テスト用のモックデータ
      const mockProfile = {
        userId,
        name: 'Test User',
        favoriteFood: 'お好み焼き'
      };
      
      res.json({
        content: [{
          type: 'text',
          text: JSON.stringify(mockProfile, null, 2)
        }]
      });
    });

    app.post('/update_user_profile', (req: any, res: any) => {
      const { userId, profileData } = req.body;
      if (!userId || !profileData) {
        return res.status(400).json({ error: 'Invalid userId or profileData' });
      }
      
      // テスト用のモックレスポンス
      const updatedProfile = {
        userId,
        ...profileData
      };
      
      res.json({
        content: [{
          type: 'text',
          text: JSON.stringify(updatedProfile, null, 2)
        }]
      });
    });
  });

  describe('Health Check', () => {
    it('should return server status', async () => {
      const response = await request(app as any)
        .get('/');
      
      expect(response.status).to.equal(200);
      expect(response.text).to.equal('User Profile MCP server is running.');
    });
  });

  describe('GET User Profile', () => {
    it('should return user profile for valid userId', async () => {
      const testUserId = 'test-user-123';
      
      const response = await request(app as any)
        .post('/get_user_profile')
        .send({ userId: testUserId });
      
      expect(response.status).to.equal(200);
      expect(response.body.content).to.be.an('array');
      expect(response.body.content[0].type).to.equal('text');
      
      const profileData = JSON.parse(response.body.content[0].text);
      expect(profileData.userId).to.equal(testUserId);
      expect(profileData.name).to.equal('Test User');
    });

    it('should return error for missing userId', async () => {
      const response = await request(app as any)
        .post('/get_user_profile')
        .send({});
      
      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid userId');
    });
  });

  describe('UPDATE User Profile', () => {
    it('should update user profile with valid data', async () => {
      const testUserId = 'test-user-123';
      const profileData = {
        name: 'Updated User',
        favoriteFood: '寿司'
      };
      
      const response = await request(app as any)
        .post('/update_user_profile')
        .send({ userId: testUserId, profileData });
      
      expect(response.status).to.equal(200);
      expect(response.body.content).to.be.an('array');
      
      const updatedProfile = JSON.parse(response.body.content[0].text);
      expect(updatedProfile.userId).to.equal(testUserId);
      expect(updatedProfile.name).to.equal('Updated User');
      expect(updatedProfile.favoriteFood).to.equal('寿司');
    });

    it('should return error for missing profileData', async () => {
      const response = await request(app as any)
        .post('/update_user_profile')
        .send({ userId: 'test-user-123' });
      
      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid userId or profileData');
    });
  });
});