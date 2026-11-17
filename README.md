# 声场 Soundfield

乐理刷题与听音训练网站，采用浅蓝与浅粉配色，支持电脑和手机。

## 已有功能

- 账号密码注册、登录、昵称修改、密码修改及退出。
- 1000 道四选一乐理题，音程、和弦、调式、节奏、记谱法各 200 道。
- 即时反馈、基础解析、错题复习、题号跳转。
- 浏览器合成单音、音程、三和弦听音训练。
- DeepSeek 解析接口预留，密钥可留空。

账号与会话使用 SQLite 保存，密码加盐哈希。练习记录和错题目前仍在浏览器按账号保存；排行榜是示例，服务端判题、正式成绩与管理后台待开发。

## 本地开发

安装 Node.js 24。在仓库根目录依次执行：

```sh
npm install
npm run install:all
npm run dev
```

打开 http://localhost:5173 。注册自己的账号，无默认公共密码。

## 服务器部署

服务器安装 Docker Engine 与 Compose，复制根目录 `.env.example` 为 `.env`，填写 DOMAIN。域名解析到服务器，放行 80/443，执行：

```sh
docker compose up -d --build
```

Caddy 自动配置 HTTPS。数据库保存到数据卷，不要执行 `docker compose down -v`。国内服务器使用域名上线需按服务商要求完成备案。Docker 构建与公网证书签发仍需在实际服务器验证。

## 检查

```sh
npm test --prefix server
npm run build --prefix client
```

`.env`、账号数据库、会话数据、node_modules 和构建产物不提交。题库来自提供的文档，转换时保留原题来源并修正部分答案，详见 `docs/题库导入说明.md`。
