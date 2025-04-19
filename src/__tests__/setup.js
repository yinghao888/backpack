// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 模拟环境变量
process.env.BACKPACK_API_KEY = 'NXKXt1VE9wZBS/KGy83rPQ1x+ni5xwjxsRQdnFssCQU=';
process.env.BACKPACK_API_SECRET = 'WX0J/zGQfOWis3GKSTSowU6Feg44Z6FhApoJbmgPto0=';
process.env.BACKPACK_API_URL = 'https://api.backpack.exchange';

// 模拟全局fetch
global.fetch = jest.fn();

// 模拟console方法
global.console = {
    ...console,
    // 保持测试输出简洁
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// 设置测试超时
jest.setTimeout(10000);

// 在每个测试前重置所有模拟
beforeEach(() => {
    jest.clearAllMocks();
});

// 在所有测试后清理
afterAll(() => {
    jest.clearAllMocks();
}); 