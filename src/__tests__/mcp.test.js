const MCP = require('../mcp');
const BackpackAPI = require('../backpack');
const logger = require('../logger');
const TradeLogger = require('../tradeLogger');
const TwitterService = require('../twitterService');
require('dotenv').config();

// Mock 依赖
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
}));

jest.mock('../backpack');
jest.mock('../tradeLogger');
jest.mock('../twitterService');

describe('MCP', () => {
    let mcp;
    const mockBackpack = {
        getTicker: jest.fn(),
        getSpotKlines: jest.fn(),
        placeSpotOrder: jest.fn(),
        api: jest.fn()
    };

    beforeEach(() => {
        // 清除所有 mock
        jest.clearAllMocks();
        
        // Mock BackpackAPI
        BackpackAPI.mockImplementation(() => mockBackpack);
        
        // 创建 MCP 实例
        mcp = new MCP();
    });

    describe('交易功能', () => {
        test('执行交易', async () => {
            // Mock 获取当前价格
            mockBackpack.getTicker.mockResolvedValueOnce({
                symbol: 'BTC_USDC',
                lastPrice: '50000'
            });

            // Mock K线数据
            mockBackpack.getSpotKlines.mockResolvedValueOnce([
                {
                    openTime: 1616666400000,
                    open: '50000',
                    high: '51000',
                    low: '49000',
                    close: '50500',
                    volume: '100',
                    closeTime: 1616670000000
                }
            ]);

            // Mock 下单
            mockBackpack.placeSpotOrder.mockResolvedValueOnce({
                orderId: 'test_order_id',
                status: 'open'
            });

            await mcp.executeTrade('BTC_USDC', 'buy');

            expect(mockBackpack.getTicker).toHaveBeenCalledWith('BTC_USDC');
            expect(mockBackpack.getSpotKlines).toHaveBeenCalledWith('BTC_USDC', '1h', 24);
            expect(mockBackpack.placeSpotOrder).toHaveBeenCalledWith('BTC_USDC', 'buy', expect.any(Number));
        });

        test('关闭仓位', async () => {
            // Mock 获取当前价格
            mockBackpack.getTicker.mockResolvedValueOnce({
                symbol: 'BTC_USDC',
                lastPrice: '51000'
            });

            // Mock 下单
            mockBackpack.placeSpotOrder.mockResolvedValueOnce({
                orderId: 'test_order_id',
                status: 'open'
            });

            await mcp.closePosition('BTC_USDC', 'buy', 0.1, 50000);

            expect(mockBackpack.getTicker).toHaveBeenCalledWith('BTC_USDC');
            expect(mockBackpack.placeSpotOrder).toHaveBeenCalledWith('BTC_USDC', 'sell', 0.1);
        });
    });

    describe('市场数据', () => {
        test('获取当前价格', async () => {
            mockBackpack.getTicker.mockResolvedValueOnce({
                symbol: 'BTC_USDC',
                lastPrice: '50000'
            });

            const price = await mcp.getCurrentPrice('BTC_USDC', 'backpack');
            expect(price).toBe(50000);
            expect(mockBackpack.getTicker).toHaveBeenCalledWith('BTC_USDC');
        });

        test('获取历史数据', async () => {
            mockBackpack.getSpotKlines.mockResolvedValueOnce([
                {
                    openTime: 1616666400000,
                    open: '50000',
                    high: '51000',
                    low: '49000',
                    close: '50500',
                    volume: '100',
                    closeTime: 1616670000000
                }
            ]);

            const klines = await mcp.getHistoricalData('BTC_USDC', '1h', 24);
            expect(klines).toHaveLength(1);
            expect(mockBackpack.getSpotKlines).toHaveBeenCalledWith('BTC_USDC', '1h', 24);
        });
    });

    describe('错误处理', () => {
        test('获取价格失败', async () => {
            mockBackpack.getTicker.mockRejectedValueOnce(new Error('API Error'));

            const price = await mcp.getCurrentPrice('BTC_USDC', 'backpack');
            expect(price).toBeNull();
            expect(logger.error).toHaveBeenCalled();
        });

        test('执行交易失败', async () => {
            mockBackpack.getTicker.mockResolvedValueOnce({
                symbol: 'BTC_USDC',
                lastPrice: '50000'
            });

            mockBackpack.getSpotKlines.mockResolvedValueOnce([
                {
                    openTime: 1616666400000,
                    open: '50000',
                    high: '51000',
                    low: '49000',
                    close: '50500',
                    volume: '100',
                    closeTime: 1616670000000
                }
            ]);

            mockBackpack.placeSpotOrder.mockRejectedValueOnce(new Error('API Error'));

            await mcp.executeTrade('BTC_USDC', 'buy');
            expect(logger.error).toHaveBeenCalled();
        });
    });
}); 