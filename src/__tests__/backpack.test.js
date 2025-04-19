const BackpackAPI = require('../backpack');
const logger = require('../logger');
require('dotenv').config();

// Mock 依赖
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
}));

describe('BackpackAPI', () => {
    let backpack;
    const TEST_API_KEY = 'NXKXt1VE9wZBS/KGy83rPQ1x+ni5xwjxsRQdnFssCQU=';
    const TEST_API_SECRET = 'WX0J/zGQfOWis3GKSTSowU6Feg44Z6FhApoJbmgPto0=';

    beforeEach(() => {
        // 清除所有 mock
        jest.clearAllMocks();
        
        // 创建 API 实例
        backpack = new BackpackAPI(TEST_API_KEY, TEST_API_SECRET);

        // Mock fetch
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        success: true,
                        orderId: 'test_order_id',
                        status: 'open'
                    }
                })
            })
        );
    });

    describe('API请求', () => {
        test('生成签名', () => {
            const request = {
                symbol: 'BTC_USDC',
                side: 'buy',
                quantity: 0.1
            };
            const timestamp = '1234567890';
            const instruction = 'orderExecute';

            const signature = backpack.getMessageSignature(request, TEST_API_SECRET, timestamp, instruction);
            expect(signature).toBeDefined();
            expect(typeof signature).toBe('string');
        });

        test('发送API请求', async () => {
            const result = await backpack.api('orderExecute', {
                symbol: 'BTC_USDC',
                side: 'buy',
                quantity: 0.1
            });
            expect(result).toEqual({
                success: true,
                orderId: 'test_order_id',
                status: 'open'
            });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/order/execute'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'X-API-Key': TEST_API_KEY,
                        'X-Timestamp': expect.any(String),
                        'X-Signature': expect.any(String)
                    })
                })
            );
        });

        test('获取账户信息', async () => {
            const result = await backpack.api('balances');
            expect(result).toEqual({
                success: true,
                orderId: 'test_order_id',
                status: 'open'
            });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/balances'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'X-API-Key': TEST_API_KEY
                    })
                })
            );
        });
    });

    describe('交易功能', () => {
        test('现货下单', async () => {
            const result = await backpack.api('orderExecute', {
                symbol: 'BTC_USDC',
                side: 'buy',
                quantity: 0.1
            });
            expect(result).toEqual({
                success: true,
                orderId: 'test_order_id',
                status: 'open'
            });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/order/execute'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'X-API-Key': TEST_API_KEY
                    })
                })
            );
        });

        test('取消订单', async () => {
            const result = await backpack.api('orderCancel', {
                symbol: 'BTC_USDC',
                orderId: '123'
            });
            expect(result).toEqual({
                success: true,
                orderId: 'test_order_id',
                status: 'open'
            });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/order'),
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.objectContaining({
                        'X-API-Key': TEST_API_KEY
                    })
                })
            );
        });
    });

    describe('市场数据', () => {
        test('获取K线数据', async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: [{
                            openTime: 1616666400000,
                            open: '50000',
                            high: '51000',
                            low: '49000',
                            close: '50500',
                            volume: '100',
                            closeTime: 1616670000000
                        }]
                    })
                })
            );

            const result = await backpack.getSpotKlines('BTC_USDC', '1h', 1);
            expect(result).toEqual([{
                openTime: 1616666400000,
                open: '50000',
                high: '51000',
                low: '49000',
                close: '50500',
                volume: '100',
                closeTime: 1616670000000
            }]);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/klines'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'X-API-Key': TEST_API_KEY
                    })
                })
            );
        });

        test('获取24小时统计数据', async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: {
                            symbol: 'BTC_USDC',
                            priceChange: '1000',
                            priceChangePercent: '2',
                            weightedAvgPrice: '50000',
                            lastPrice: '51000',
                            volume: '100'
                        }
                    })
                })
            );

            const result = await backpack.api('ticker24hr', { symbol: 'BTC_USDC' });
            expect(result).toEqual({
                symbol: 'BTC_USDC',
                priceChange: '1000',
                priceChangePercent: '2',
                weightedAvgPrice: '50000',
                lastPrice: '51000',
                volume: '100'
            });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/ticker/24hr'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'X-API-Key': TEST_API_KEY
                    })
                })
            );
        });

        test('获取当前价格', async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: {
                            symbol: 'BTC_USDC',
                            lastPrice: '50000'
                        }
                    })
                })
            );

            const result = await backpack.getTicker('BTC_USDC');
            expect(result).toEqual({
                symbol: 'BTC_USDC',
                lastPrice: '50000'
            });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/ticker/price'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'X-API-Key': TEST_API_KEY
                    })
                })
            );
        });
    });

    describe('错误处理', () => {
        test('API请求错误处理', async () => {
            global.fetch = jest.fn(() =>
                Promise.reject(new Error('API Error'))
            );

            await expect(backpack.api('balances')).rejects.toThrow('API Error');
        });
    });
}); 