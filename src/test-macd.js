const MCP = require('./mcp');
const logger = require('./logger');

async function testMACD() {
    try {
        logger.info('开始MACD测试');
        
        // 创建MCP实例
        const mcp = new MCP();
        
        // 运行MACD测试
        const results = mcp.testMACD();
        
        // 输出测试结果
        logger.info('MACD测试结果:', results);
        
        logger.info('MACD测试完成');
    } catch (error) {
        logger.error('MACD测试失败:', error);
    }
}

// 运行测试
testMACD(); 