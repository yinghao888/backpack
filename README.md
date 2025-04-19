# MCP (Multi-Exchange Crypto Trading Bot)

MCP 是一个支持多交易所的加密货币交易机器人，目前支持 Binance 和 Backpack 交易所。该系统使用 LLM (Large Language Model) 进行市场分析和交易决策。

## 功能特点

- 支持多交易所（Binance 和 Backpack）
- 实时市场数据监控
- 基于 LLM 的交易决策
- 自动交易执行
- 风险控制
- 详细的交易记录
- 实时日志记录

## 系统要求

- Node.js >= 14.0.0
- npm >= 6.0.0

## 安装

1. 克隆仓库：
```bash
git clone https://github.com/yourusername/mcp.git
cd mcp
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
复制 `.env.example` 文件为 `.env`，并填写必要的配置信息：
```bash
cp .env.example .env
```

## 配置说明

在 `.env` 文件中配置以下信息：

### API 配置
- `BINANCE_API_KEY`: Binance API Key
- `BINANCE_API_SECRET`: Binance API Secret
- `BACKPACK_API_KEY`: Backpack API Key
- `BACKPACK_API_SECRET`: Backpack API Secret
- `DEEPSEEK_API_KEY`: Deepseek API Key
- `DEEPSEEK_API_ENDPOINT`: Deepseek API 端点
- `DEEPSEEK_MODEL`: Deepseek 模型名称

### 交易配置
- `TRADE_AMOUNT`: 每次交易的数量
- `STOP_LOSS`: 止损百分比
- `TAKE_PROFIT`: 止盈百分比

### Twitter 配置（可选）
- `TWITTER_API_KEY`: Twitter API Key
- `TWITTER_API_SECRET`: Twitter API Secret
- `TWITTER_ACCESS_TOKEN`: Twitter Access Token
- `TWITTER_ACCESS_TOKEN_SECRET`: Twitter Access Token Secret

## 使用方法

1. 启动系统：
```bash
npm start
```

2. 监控交易对：
系统会自动监控配置的交易对（VIDTUSDT 和 BTCUSDT）。

3. 查看日志：
- 所有日志保存在 `logs/combined.log`
- 错误日志保存在 `logs/error.log`

4. 查看交易记录：
交易记录保存在 `trades/` 目录下，按交易对分类。

## 系统架构

- `src/index.js`: 系统入口文件
- `src/mcp.js`: MCP 核心类
- `src/binance.js`: Binance API 客户端
- `src/backpack.js`: Backpack API 客户端
- `src/tradeLogger.js`: 交易记录系统
- `src/logger.js`: 日志系统

## 注意事项

1. 请确保 API 密钥的安全性，不要泄露给他人。
2. 建议先在测试网进行测试。
3. 系统使用 LLM 进行交易决策，可能存在风险，请谨慎使用。
4. 建议定期检查日志和交易记录。

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT License 