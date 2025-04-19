const config = require('./config');
const startBackpackMCP = require('./backpackMCP');
const logger = require('./logger');

async function main() {
    try {
        logger.info('启动 Backpack MCP系统');
        await startBackpackMCP();
    } catch (error) {
        logger.error('程序运行出错:', error);
        process.exit(1);
    }
}

main().catch(error => {
    logger.error('程序运行出错:', error);
    process.exit(1);
}); 