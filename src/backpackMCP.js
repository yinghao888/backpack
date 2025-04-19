const MCP = require('./mcp');
const logger = require('./logger');
const config = require('./config');

async function startBackpackMCP() {
    try {
        const mcp = new MCP();
        await mcp.initialize();
        
        logger.info('Backpack MCP系统启动完成');
    } catch (error) {
        logger.error('Backpack MCP系统启动失败:', error);
        process.exit(1);
    }
}

module.exports = startBackpackMCP; 