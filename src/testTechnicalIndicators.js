const TechnicalIndicators = require('./technicalIndicators');
const logger = require('./logger');

async function testTechnicalIndicators() {
    logger.info('开始测试技术指标计算...');

    // 测试用例1: 计算波动率
    logger.info('测试用例1: 计算波动率');
    const prices1 = [100, 102, 98, 103, 99, 101, 97, 102, 98, 100];
    const volatility = TechnicalIndicators.calculateVolatility(prices1);
    logger.info(`波动率: ${volatility.toFixed(2)}%`);

    // 测试用例2: 计算RSI
    logger.info('\n测试用例2: 计算RSI');
    const prices2 = [100, 102, 104, 103, 106, 105, 107, 109, 110, 112, 111, 113, 115, 114, 116];
    const rsi = TechnicalIndicators.calculateRSI(prices2);
    logger.info(`RSI: ${rsi.toFixed(2)}`);

    // 测试用例3: 计算MACD
    logger.info('\n测试用例3: 计算MACD');
    const prices3 = [100, 102, 104, 103, 106, 105, 107, 109, 110, 112, 111, 113, 115, 114, 116, 118, 117, 119, 121, 120, 122, 124, 123, 125, 127, 126, 128, 130, 129, 131, 133];
    const macd = TechnicalIndicators.calculateMACD(prices3);
    logger.info('MACD结果:', macd);

    // 测试用例4: 计算布林带
    logger.info('\n测试用例4: 计算布林带');
    const prices4 = [100, 102, 104, 103, 106, 105, 107, 109, 110, 112, 111, 113, 115, 114, 116, 118, 117, 119, 121, 120, 122, 124, 123, 125, 127, 126, 128, 130, 129, 131, 133];
    const bbands = TechnicalIndicators.calculateBollingerBands(prices4);
    logger.info('布林带结果:', bbands);

    // 测试用例5: 计算趋势
    logger.info('\n测试用例5: 计算趋势');
    const prices5 = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120];
    const trend = TechnicalIndicators.calculateTrend(prices5);
    logger.info(`趋势: ${trend.toFixed(2)}%`);

    // 测试用例6: 计算支撑位和阻力位
    logger.info('\n测试用例6: 计算支撑位和阻力位');
    const prices6 = [100, 102, 98, 103, 99, 101, 97, 102, 98, 100];
    const { support, resistance } = TechnicalIndicators.calculateSupportResistance(prices6);
    logger.info(`支撑位: ${support}, 阻力位: ${resistance}`);

    // 测试用例7: 获取价格位置描述
    logger.info('\n测试用例7: 获取价格位置描述');
    const price = 105;
    const upper = 110;
    const lower = 100;
    const position = TechnicalIndicators.getPricePosition(price, upper, lower);
    logger.info(`价格位置: ${position}`);

    // 测试用例8: 获取趋势强度描述
    logger.info('\n测试用例8: 获取趋势强度描述');
    const shortTerm = 5;
    const longTerm = 10;
    const trendStrength = TechnicalIndicators.getTrendStrength(shortTerm, longTerm);
    logger.info(`趋势强度: ${trendStrength}`);

    // 测试用例9: 获取成交量状态描述
    logger.info('\n测试用例9: 获取成交量状态描述');
    const volume = 1000;
    const avgVolume = 800;
    const volumeStatus = TechnicalIndicators.getVolumeStatus(volume, avgVolume);
    logger.info(`成交量状态: ${volumeStatus}`);

    // 测试用例10: 获取波动性状态描述
    logger.info('\n测试用例10: 获取波动性状态描述');
    const volatilityStatus = TechnicalIndicators.getVolatilityStatus(volatility);
    logger.info(`波动性状态: ${volatilityStatus}`);

    // 测试用例11: 边界条件测试 - RSI
    logger.info('\n测试用例11: 边界条件测试 - RSI');
    const prices11 = [100, 100, 100, 100, 100]; // 相同价格
    const rsi11 = TechnicalIndicators.calculateRSI(prices11);
    logger.info(`相同价格的RSI: ${rsi11.toFixed(2)}`);

    // 测试用例12: 边界条件测试 - 布林带
    logger.info('\n测试用例12: 边界条件测试 - 布林带');
    const prices12 = [100, 100, 100, 100, 100]; // 相同价格
    const bbands12 = TechnicalIndicators.calculateBollingerBands(prices12);
    logger.info('相同价格的布林带:', bbands12);

    // 测试用例13: 边界条件测试 - 趋势
    logger.info('\n测试用例13: 边界条件测试 - 趋势');
    const prices13 = [100, 100, 100]; // 相同价格
    const trend13 = TechnicalIndicators.calculateTrend(prices13);
    logger.info(`相同价格的趋势: ${trend13.toFixed(2)}%`);

    // 测试用例14: 边界条件测试 - 支撑位和阻力位
    logger.info('\n测试用例14: 边界条件测试 - 支撑位和阻力位');
    const prices14 = [100, 100, 100]; // 相同价格
    const { support: support14, resistance: resistance14 } = TechnicalIndicators.calculateSupportResistance(prices14);
    logger.info(`相同价格的支撑位和阻力位: ${support14}, ${resistance14}`);

    logger.info('\n技术指标测试完成');
}

// 运行测试
testTechnicalIndicators().catch(error => {
    logger.error('测试过程中发生错误:', error);
}); 