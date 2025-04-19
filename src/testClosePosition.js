const MCP = require('./mcp');
const logger = require('./logger');

async function testClosePosition() {
    logger.info('开始测试平仓功能...');
    
    const mcp = new MCP();
    await mcp.initialize();

    // 测试用例1: 正常平仓
    logger.info('\n测试用例1: 正常平仓');
    try {
        const symbol = 'SOL_USDC';
        const quantity = '0.1';
        const result = await mcp.closePosition(symbol, quantity);
        logger.info('平仓结果:', result);
    } catch (error) {
        logger.error('测试用例1失败:', error);
    }

    // 测试用例2: 余额不足
    logger.info('\n测试用例2: 余额不足');
    try {
        const symbol = 'SOL_USDC';
        const quantity = '1000.0'; // 使用一个明显超过余额的数量
        const result = await mcp.closePosition(symbol, quantity);
        logger.info('平仓结果:', result);
    } catch (error) {
        logger.error('测试用例2失败:', error);
    }

    // 测试用例3: 无效的交易对
    logger.info('\n测试用例3: 无效的交易对');
    try {
        const symbol = 'INVALID_PAIR';
        const quantity = '0.1';
        const result = await mcp.closePosition(symbol, quantity);
        logger.info('平仓结果:', result);
    } catch (error) {
        logger.error('测试用例3失败:', error);
    }

    // 测试用例4: 无效的数量格式
    logger.info('\n测试用例4: 无效的数量格式');
    try {
        const symbol = 'SOL_USDC';
        const quantity = 'invalid';
        const result = await mcp.closePosition(symbol, quantity);
        logger.info('平仓结果:', result);
    } catch (error) {
        logger.error('测试用例4失败:', error);
    }

    // 测试用例5: 零数量
    logger.info('\n测试用例5: 零数量');
    try {
        const symbol = 'SOL_USDC';
        const quantity = '0';
        const result = await mcp.closePosition(symbol, quantity);
        logger.info('平仓结果:', result);
    } catch (error) {
        logger.error('测试用例5失败:', error);
    }

    // 测试用例6: 负数数量
    logger.info('\n测试用例6: 负数数量');
    try {
        const symbol = 'SOL_USDC';
        const quantity = '-0.1';
        const result = await mcp.closePosition(symbol, quantity);
        logger.info('平仓结果:', result);
    } catch (error) {
        logger.error('测试用例6失败:', error);
    }

    // 测试用例7: 小数位数过多
    logger.info('\n测试用例7: 小数位数过多');
    try {
        const symbol = 'SOL_USDC';
        const quantity = '0.123456789';
        const result = await mcp.closePosition(symbol, quantity);
        logger.info('平仓结果:', result);
    } catch (error) {
        logger.error('测试用例7失败:', error);
    }

    logger.info('\n平仓功能测试完成');
}

// 运行测试
testClosePosition().catch(error => {
    logger.error('测试过程中发生错误:', error);
}); 