#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ErrorCode, McpError, } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import express from 'express'; // Expressをインポート
const APPLICATION_ID = process.env.RAKUTEN_APPLICATION_ID;
const AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID;
if (!APPLICATION_ID) {
    console.error('RAKUTEN_APPLICATION_ID environment variable is required');
    throw new Error('RAKUTEN_APPLICATION_ID environment variable is required');
}
const isValidSearchArgs = (args) => typeof args === 'object' &&
    args !== null &&
    typeof args.keyword === 'string' &&
    (args.hits === undefined || typeof args.hits === 'number');
class RakutenServer {
    constructor() {
        this.server = new Server({
            name: 'rakuten-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.axiosInstance = axios.create({
            baseURL: 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601',
            params: {
                applicationId: APPLICATION_ID,
                affiliateId: AFFILIATE_ID,
                format: 'json',
            },
        });
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            process.exit(0);
        });
    }
    async handleSearchRakutenItems(args) {
        var _a, _b;
        if (!isValidSearchArgs(args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid search arguments');
        }
        const keyword = args.keyword;
        const hits = Math.min(args.hits || 5, 30);
        try {
            const response = await this.axiosInstance.get('', {
                params: {
                    keyword: keyword,
                    hits: hits,
                },
            });
            const items = response.data.Items.map((item) => {
                var _a;
                return ({
                    itemName: item.Item.itemName,
                    itemUrl: item.Item.itemUrl,
                    itemPrice: item.Item.itemPrice,
                    imageUrl: ((_a = item.Item.mediumImageUrls[0]) === null || _a === void 0 ? void 0 : _a.imageUrl) || '',
                });
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(items, null, 2),
                    },
                ],
            };
        }
        catch (error) { // error を unknown 型として明示
            if (axios.isAxiosError(error)) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `楽天APIエラー: ${(_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data.message) !== null && _b !== void 0 ? _b : error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
            // error が Error インスタンスであることを確認
            if (error instanceof Error) {
                throw error;
            }
            // それ以外のunknownなエラーは新しいErrorとして再スロー
            throw new Error(String(error));
        }
    }
    async startHttpServer() {
        const app = express();
        app.use(express.json()); // JSONボディをパースするために必要
        // ヘルスチェックエンドポイント
        app.get('/', (req, res) => {
            res.status(200).send('Rakuten MCP server is running.');
        });
        // search_rakuten_items ツールエンドポイント
        app.post('/search_rakuten_items', async (req, res) => {
            try {
                const result = await this.handleSearchRakutenItems(req.body);
                res.json(result);
            }
            catch (error) { // error を unknown 型として明示
                console.error('Error in /search_rakuten_items:', error);
                if (error instanceof McpError) {
                    res.status(400).json({ error: error.message, code: error.code });
                }
                else if (error instanceof Error) { // Error インスタンスの場合
                    res.status(500).json({ error: error.message });
                }
                else { // その他の unknown なエラー
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            }
        });
        const port = process.env.PORT || 8080;
        app.listen(port, () => {
            console.log(`Rakuten MCP server listening on port ${port}`);
        });
    }
}
const server = new RakutenServer();
server.startHttpServer().catch(console.error);
