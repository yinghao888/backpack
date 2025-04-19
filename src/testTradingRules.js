const Rule = require('./tradingRules');
const logger = require('./logger');

async function testTradingRules() {
    try {
        logger.info('开始测试交易规则...');

        // 测试用例1：买入信号 - RSI超卖且MACD转正
        const buySignalData1 = {
            current: {
                price: 100,
                rsi: 35,
                macd: { line: 0.5, signal: 0.3, histogram: 0.2 },
                bollingerBands: { upper: 105, middle: 100, lower: 95 },
                volume: 10000,
                shortTermTrend: 1,
                support: 95,
                resistance: 105
            },
            previous: {
                price: 98,
                macd: { line: 0.2, signal: 0.4, histogram: -0.2 },
                bollingerBands: { upper: 103, middle: 98, lower: 93 },
                volume: 8000,
                shortTermTrend: -1
            },
            priceBeforePrevious: {
                price: 97,
                volume: 6000
            },
            marketVolatility: 15,
            previousMarketVolatility: 12
        };

        logger.info('测试用例1：RSI超卖且MACD转正');
        const result1 = Rule.evaluateSignal(buySignalData1);
        logger.info('分析结果:', {
            决策: result1.decision,
            置信度: (result1.confidence * 100).toFixed(2) + '%',
            原因: result1.reasoning
        });

        // 测试用例2：卖出信号 - RSI超买且MACD转负
        const sellSignalData = {
            current: {
                price: 110,
                rsi: 75,
                macd: { line: -0.2, signal: 0.1, histogram: -0.3 },
                bollingerBands: { upper: 115, middle: 110, lower: 105 },
                volume: 12000,
                shortTermTrend: -1,
                support: 105,
                resistance: 115
            },
            previous: {
                price: 112,
                macd: { line: 0.1, signal: 0.2, histogram: -0.1 },
                bollingerBands: { upper: 117, middle: 112, lower: 107 },
                volume: 10000,
                shortTermTrend: 1
            },
            priceBeforePrevious: {
                price: 113,
                volume: 8000
            },
            marketVolatility: 18,
            previousMarketVolatility: 15
        };

        logger.info('测试用例2：RSI超买且MACD转负');
        const result2 = Rule.evaluateSignal(sellSignalData);
        logger.info('分析结果:', {
            决策: result2.decision,
            置信度: (result2.confidence * 100).toFixed(2) + '%',
            原因: result2.reasoning
        });

        // 测试用例3：观望信号 - 买卖信号同时存在
        const holdSignalData = {
            current: {
                price: 105,
                rsi: 45,
                macd: { line: 0.1, signal: 0.1, histogram: 0 },
                bollingerBands: { upper: 110, middle: 105, lower: 100 },
                volume: 9000,
                shortTermTrend: 0,
                support: 100,
                resistance: 110
            },
            previous: {
                price: 105,
                macd: { line: 0.1, signal: 0.1, histogram: 0 },
                bollingerBands: { upper: 110, middle: 105, lower: 100 },
                volume: 9000,
                shortTermTrend: 0
            },
            priceBeforePrevious: {
                price: 105,
                volume: 9000
            },
            marketVolatility: 10,
            previousMarketVolatility: 10
        };

        logger.info('测试用例3：买卖信号同时存在');
        const result3 = Rule.evaluateSignal(holdSignalData);
        logger.info('分析结果:', {
            决策: result3.decision,
            置信度: (result3.confidence * 100).toFixed(2) + '%',
            原因: result3.reasoning
        });

        // 测试用例4：布林带突破买入信号
        const bbandsBreakoutData = {
            current: {
                price: 106,
                rsi: 55,
                macd: { line: 0.3, signal: 0.2, histogram: 0.1 },
                bollingerBands: { upper: 110, middle: 105, lower: 100 },
                volume: 15000,
                shortTermTrend: 1,
                support: 100,
                resistance: 110
            },
            previous: {
                price: 104,
                macd: { line: 0.2, signal: 0.2, histogram: 0 },
                bollingerBands: { upper: 109, middle: 104, lower: 99 },
                volume: 10000,
                shortTermTrend: 0
            },
            priceBeforePrevious: {
                price: 103,
                volume: 8000
            },
            marketVolatility: 12,
            previousMarketVolatility: 10
        };

        logger.info('测试用例4：布林带突破买入');
        const result4 = Rule.evaluateSignal(bbandsBreakoutData);
        logger.info('分析结果:', {
            决策: result4.decision,
            置信度: (result4.confidence * 100).toFixed(2) + '%',
            原因: result4.reasoning
        });

        // 测试用例5：边界条件 - RSI临界值
        const rsiBoundaryData = {
            current: {
                price: 100,
                rsi: 40, // RSI临界值
                macd: { line: 0.3, signal: 0.2, histogram: 0.1 },
                bollingerBands: { upper: 105, middle: 100, lower: 95 },
                volume: 10000,
                shortTermTrend: 1,
                support: 95,
                resistance: 105
            },
            previous: {
                price: 98,
                macd: { line: 0.2, signal: 0.3, histogram: -0.1 },
                bollingerBands: { upper: 103, middle: 98, lower: 93 },
                volume: 8000,
                shortTermTrend: 0
            },
            priceBeforePrevious: {
                price: 97,
                volume: 6000
            },
            marketVolatility: 12,
            previousMarketVolatility: 10
        };

        logger.info('测试用例5：RSI临界值测试');
        const result5 = Rule.evaluateSignal(rsiBoundaryData);
        logger.info('分析结果:', {
            决策: result5.decision,
            置信度: (result5.confidence * 100).toFixed(2) + '%',
            原因: result5.reasoning
        });

        // 测试用例6：边界条件 - 布林带边界
        const bbandsBoundaryData = {
            current: {
                price: 100,
                rsi: 50,
                macd: { line: 0.2, signal: 0.1, histogram: 0.1 },
                bollingerBands: { upper: 100, middle: 95, lower: 90 }, // 价格刚好在上轨
                volume: 10000,
                shortTermTrend: 1,
                support: 90,
                resistance: 100
            },
            previous: {
                price: 99,
                macd: { line: 0.1, signal: 0.1, histogram: 0 },
                bollingerBands: { upper: 99, middle: 94, lower: 89 },
                volume: 9000,
                shortTermTrend: 1
            },
            priceBeforePrevious: {
                price: 98,
                volume: 8000
            },
            marketVolatility: 10,
            previousMarketVolatility: 10
        };

        logger.info('测试用例6：布林带边界测试');
        const result6 = Rule.evaluateSignal(bbandsBoundaryData);
        logger.info('分析结果:', {
            决策: result6.decision,
            置信度: (result6.confidence * 100).toFixed(2) + '%',
            原因: result6.reasoning
        });

        // 测试用例7：加分因素组合 - 多重利好
        const multipleBonusData = {
            current: {
                price: 105,
                rsi: 35,
                macd: { line: 0.4, signal: 0.2, histogram: 0.2 },
                bollingerBands: { upper: 110, middle: 105, lower: 100 },
                volume: 20000, // 成交量显著放大
                shortTermTrend: 1,
                support: 100,
                resistance: 105 // 接近突破阻力位
            },
            previous: {
                price: 103,
                macd: { line: 0.2, signal: 0.2, histogram: 0 },
                bollingerBands: { upper: 108, middle: 103, lower: 98 },
                volume: 15000,
                shortTermTrend: 0
            },
            priceBeforePrevious: {
                price: 102,
                volume: 10000
            },
            marketVolatility: 20, // 波动率增加
            previousMarketVolatility: 15
        };

        logger.info('测试用例7：多重加分因素测试');
        const result7 = Rule.evaluateSignal(multipleBonusData);
        logger.info('分析结果:', {
            决策: result7.decision,
            置信度: (result7.confidence * 100).toFixed(2) + '%',
            原因: result7.reasoning
        });

        // 测试用例8：无效数据处理
        const invalidData = {
            current: {
                price: 100,
                rsi: null, // 无效RSI
                macd: { line: 0.2, signal: 0.1, histogram: 0.1 },
                bollingerBands: { upper: 105, middle: 100, lower: 95 },
                volume: 10000,
                shortTermTrend: 1,
                support: 95,
                resistance: 105
            },
            previous: {
                price: 98,
                macd: { line: 0.1, signal: 0.1, histogram: 0 },
                bollingerBands: { upper: 103, middle: 98, lower: 93 },
                volume: 8000,
                shortTermTrend: 0
            },
            priceBeforePrevious: {
                price: 97,
                volume: 6000
            },
            marketVolatility: 12,
            previousMarketVolatility: 10
        };

        logger.info('测试用例8：无效数据处理测试');
        const result8 = Rule.evaluateSignal(invalidData);
        logger.info('分析结果:', {
            决策: result8.decision,
            置信度: (result8.confidence * 100).toFixed(2) + '%',
            原因: result8.reasoning
        });

        // 测试用例9：复杂市场情况 - 剧烈波动
        const volatileMarketData = {
            current: {
                price: 110,
                rsi: 65,
                macd: { line: -0.3, signal: 0.1, histogram: -0.4 },
                bollingerBands: { upper: 115, middle: 105, lower: 95 },
                volume: 30000, // 成交量暴增
                shortTermTrend: -1,
                support: 95,
                resistance: 115
            },
            previous: {
                price: 105,
                macd: { line: 0.2, signal: 0.2, histogram: 0 },
                bollingerBands: { upper: 110, middle: 100, lower: 90 },
                volume: 10000,
                shortTermTrend: 1
            },
            priceBeforePrevious: {
                price: 100,
                volume: 8000
            },
            marketVolatility: 30, // 高波动率
            previousMarketVolatility: 15
        };

        logger.info('测试用例9：剧烈波动市场测试');
        const result9 = Rule.evaluateSignal(volatileMarketData);
        logger.info('分析结果:', {
            决策: result9.decision,
            置信度: (result9.confidence * 100).toFixed(2) + '%',
            原因: result9.reasoning
        });

        // 测试用例10：复杂市场情况 - 假突破
        const fakeBreakoutData = {
            current: {
                price: 106,
                rsi: 55,
                macd: { line: 0.3, signal: 0.2, histogram: 0.1 },
                bollingerBands: { upper: 110, middle: 105, lower: 100 },
                volume: 8000, // 成交量不足
                shortTermTrend: 0, // 趋势不明显
                support: 100,
                resistance: 110
            },
            previous: {
                price: 104,
                macd: { line: 0.2, signal: 0.2, histogram: 0 },
                bollingerBands: { upper: 109, middle: 104, lower: 99 },
                volume: 10000,
                shortTermTrend: 0
            },
            priceBeforePrevious: {
                price: 103,
                volume: 9000
            },
            marketVolatility: 12,
            previousMarketVolatility: 10
        };

        logger.info('测试用例10：假突破市场测试');
        const result10 = Rule.evaluateSignal(fakeBreakoutData);
        logger.info('分析结果:', {
            决策: result10.decision,
            置信度: (result10.confidence * 100).toFixed(2) + '%',
            原因: result10.reasoning
        });

        logger.info('交易规则测试完成');
    } catch (error) {
        logger.error('测试过程中发生错误:', error.message);
    }
}

// 运行测试
testTradingRules(); 