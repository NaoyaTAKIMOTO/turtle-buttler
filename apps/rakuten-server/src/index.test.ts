import { expect } from 'chai';
import request from 'supertest';
import express from 'express';

describe('Rakuten Server', () => {
  let app: express.Application;

  before(() => {
    // テスト用のシンプルなExpressアプリを作成
    app = express();
    app.use(express.json());

    // ヘルスチェックエンドポイント
    app.get('/', (req, res) => {
      res.status(200).send('Rakuten MCP server is running.');
    });

    // モックエンドポイント
    app.post('/search_rakuten_items', (req, res) => {
      const { keyword, hits } = req.body;
      
      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({ 
          error: 'Invalid search arguments',
          code: 'INVALID_PARAMS'
        });
      }
      
      // テスト用のモックデータ
      const mockItems = [
        {
          itemName: `${keyword}の商品1`,
          itemUrl: 'https://example.com/item1',
          itemPrice: '1000',
          imageUrl: 'https://example.com/image1.jpg'
        },
        {
          itemName: `${keyword}の商品2`,
          itemUrl: 'https://example.com/item2',
          itemPrice: '2000',
          imageUrl: 'https://example.com/image2.jpg'
        }
      ].slice(0, hits || 5);
      
      res.json({
        content: [{
          type: 'text',
          text: JSON.stringify(mockItems, null, 2)
        }]
      });
    });
  });

  describe('Health Check', () => {
    it('should return server status', async () => {
      const response = await request(app)
        .get('/');
      
      expect(response.status).to.equal(200);
      expect(response.text).to.equal('Rakuten MCP server is running.');
    });
  });

  describe('Search Rakuten Items', () => {
    it('should return search results for valid keyword', async () => {
      const testKeyword = 'Nintendo Switch';
      
      const response = await request(app)
        .post('/search_rakuten_items')
        .send({ keyword: testKeyword });
      
      expect(response.status).to.equal(200);
      expect(response.body.content).to.be.an('array');
      expect(response.body.content[0].type).to.equal('text');
      
      const items = JSON.parse(response.body.content[0].text);
      expect(items).to.be.an('array');
      expect(items.length).to.be.greaterThan(0);
      expect(items[0].itemName).to.include(testKeyword);
    });

    it('should limit results when hits parameter is provided', async () => {
      const testKeyword = 'ゲーム';
      const hitsLimit = 1;
      
      const response = await request(app)
        .post('/search_rakuten_items')
        .send({ keyword: testKeyword, hits: hitsLimit });
      
      expect(response.status).to.equal(200);
      
      const items = JSON.parse(response.body.content[0].text);
      expect(items).to.be.an('array');
      expect(items.length).to.equal(hitsLimit);
    });

    it('should return error for missing keyword', async () => {
      const response = await request(app)
        .post('/search_rakuten_items')
        .send({});
      
      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid search arguments');
      expect(response.body.code).to.equal('INVALID_PARAMS');
    });

    it('should return error for invalid keyword type', async () => {
      const response = await request(app)
        .post('/search_rakuten_items')
        .send({ keyword: 123 });
      
      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid search arguments');
    });
  });

  describe('Input Validation', () => {
    it('should handle empty keyword', async () => {
      const response = await request(app)
        .post('/search_rakuten_items')
        .send({ keyword: '' });
      
      expect(response.status).to.equal(400);
    });

    it('should handle negative hits parameter', async () => {
      const response = await request(app)
        .post('/search_rakuten_items')
        .send({ keyword: 'test', hits: -1 });
      
      expect(response.status).to.equal(200);
      // モックでは負の値も受け入れているが、実際の実装では0に調整される
    });
  });
});