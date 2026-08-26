# 个人成长系统

一个手机优先、深色主题的游戏化个人成长网站。包含任务打卡、技能树、财务追踪、职业规划、复盘、奖励成就、AI 顾问、英语学习工作台，支持 PWA 添加到手机主屏幕，可部署到 Netlify。

## 功能总览（七个阶段）

| 阶段 | 功能 |
| --- | --- |
| 一 | 项目骨架、Supabase 密码登录、仪表盘 |
| 二 | 任务系统：每日/每周/里程碑任务、打卡、XP 与 10 级等级、连续打卡 |
| 三 | 技能树：5 大分支 18 个节点，手动调进度，可新增分支/节点 |
| 四 | 财务追踪（存款进度）、权利账本（算了/要回来了）、止损三问月度复盘 |
| 五 | 职业规划（岗位/公司/行业调研/投递/面试）、每日收尾 + 周日复盘 |
| 六 | 奖励机制（三类 + 红线）、失败容忍（休息日/温和提示）、成就徽章墙 |
| 七 | DeepSeek AI 顾问、PWA、GitHub + Netlify 自动部署 |
| 八 | 英语工作台：每日节奏选择 + 每周硬指标 + 月度目标 + 半年计划 |

## 技术栈

- 前端：[Next.js](https://nextjs.org/)（App Router）+ [Tailwind CSS](https://tailwindcss.com/)
- 数据库：[Supabase](https://supabase.com/)（PostgreSQL，RLS 全开）
- AI：[DeepSeek](https://platform.deepseek.com/)（OpenAI 兼容接口，服务端调用）
- 部署：[Netlify](https://www.netlify.com/)（连接 GitHub 自动部署）
- PWA：Web App Manifest + Service Worker

## 目录结构

```text
.
├── app/
│   ├── page.tsx / login/     # 首页跳转、登录页
│   ├── dashboard/            # 仪表盘（任务/等级/连续打卡/存款/工具入口）
│   ├── skills/               # 技能树
│   ├── finances/             # 财务追踪
│   ├── rights/               # 权利账本
│   ├── review/               # 止损三问
│   ├── career/               # 职业规划
│   ├── reflection/           # 复盘（每日收尾 + 周日复盘）
│   ├── rewards/              # 奖励与成就
│   ├── advisor/              # AI 顾问
│   ├── english/              # 英语工作台
│   └── english/plan/         # 半年计划
│   ├── manifest.ts           # PWA Manifest
│   └── layout.tsx            # 根布局（含 PWA 注册）
├── components/               # 各模块 UI 组件
├── lib/
│   ├── actions.ts            # 所有 Server Actions（登录/打卡/技能/财务/职业/复盘/AI）
│   ├── queries.ts            # 所有数据查询与组装
│   ├── levels.ts             # 等级表（Lv1 新手 ~ Lv10 传奇）
│   ├── task-logic.ts         # 周期/连续打卡/休息日/周范围（上海时区）
│   ├── achievements.ts       # 成就定义与判定
│   ├── english-logic.ts      # 英语周硬指标/防偷懒/月度映射（纯函数）
│   ├── english-data.ts       # 英语工作台数据查询
│   ├── password.ts / session.ts / supabase-admin.ts
├── public/
│   ├── sw.js                 # Service Worker（离线提示）
│   ├── offline.html          # 离线提示页
│   └── icon-192.png / icon-512.png
├── scripts/                  # 密码工具脚本
├── supabase/schema.sql       # 全量建表脚本（18 张表，幂等可重复执行）
├── netlify.toml              # Netlify 部署配置
├── .env.example              # 环境变量示例
└── package.json
```

## 数据库表（18 张）

| 表 | 说明 |
| --- | --- |
| `users` | 用户（本阶段只有 admin） |
| `tasks` | 任务（daily/weekly/milestone） |
| `task_logs` | 打卡记录（period_key 防重复，xp_earned 快照） |
| `skills` | 技能树（自关联：parent_id 空=分支，非空=节点） |
| `skill_progress` | 技能进度（0-100，每人每技能一条） |
| `finances` | 月度财务（收入/强制储蓄/生活费/副业收入） |
| `rights_ledger` | 权利账本（gave_up=我算了 / claimed=我要回来了） |
| `monthly_review` | 止损三问复盘 |
| `career_plans` | 职业规划（type 区分岗位/公司/行业/投递/面试，payload 存专属字段） |
| `reflections` | 复盘（daily=每日收尾 / weekly=周日复盘） |
| `achievements` | 已解锁成就 |
| `rest_days` | 休息日（不增加天数、不打断连续性） |
| `english_rhythms` | 英语节奏定义（快速/输入/对话/真人/精学/复盘日） |
| `english_daily_logs` | 英语每日记录（节奏 + 任务完成情况 + XP） |
| `english_weekly_stats` | 英语每周硬指标统计 |
| `english_monthly_goals` | 英语月度目标（词汇/口试/真人连线） |
| `english_schedule` | 英语半年计划（月度节奏组合 + 特殊日） |
| `english_words` | 英语生词记录（月度词汇量） |

## 本地运行

### 前置要求

- Node.js 18.18+（推荐 20+）、npm
- 一个免费的 [Supabase](https://supabase.com/) 项目
- （可选）一个 [DeepSeek](https://platform.deepseek.com/) API Key

### 第 1 步：安装依赖

```bash
npm install
```

### 第 2 步：配置 Supabase

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)，创建一个新项目。
2. 进入 **SQL Editor**，把 [supabase/schema.sql](./supabase/schema.sql) 全部粘贴执行。
   - 脚本幂等：从任意旧版本升级，直接重跑整个脚本即可，不会破坏已有数据。
3. 进入 **Project Settings → API**，复制 Project URL、anon public key、service_role secret key。

> ⚠️ `service_role` 拥有绕过 RLS 的最高权限，只能放在服务端，绝不能进客户端代码或提交到 GitHub。

### 第 3 步：配置环境变量

复制 [.env.example](./.env.example) 为 `.env` 并填写：

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 浏览器用公钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端管理员密钥（机密） |
| `SESSION_SECRET` | 登录 Cookie 签名密钥，用 `openssl rand -base64 48` 生成 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（不配置时 AI 顾问会提示未配置） |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com`，一般不用改 |
| `DEEPSEEK_MODEL_CHAT/FLASH/PRO` | 界面三个模型的对应模型名，默认 `deepseek-chat` |

### 第 4 步：修改默认密码

默认密码 `123456`，务必修改：

```bash
npm run set-password -- "你的新密码"
```

### 第 5 步：启动

```bash
npm run dev
```

打开 http://localhost:3000 即可。

## 配置 DeepSeek AI 顾问

1. 到 [platform.deepseek.com](https://platform.deepseek.com) 创建 API Key。
2. 填入 `.env` 的 `DEEPSEEK_API_KEY`，重启开发服务器。
3. 进入「AI顾问」页面，可选择三个模型：
   - **DeepSeek Chat**（`DEEPSEEK_MODEL_CHAT`）
   - **DeepSeek V4 Flash**（`DEEPSEEK_MODEL_FLASH`）
   - **DeepSeek V4 Pro**（`DEEPSEEK_MODEL_PRO`）
4. 点击「让顾问分析我的现状」，系统会把断签、停滞技能等检测结果发给顾问；也可以随时直接提问。
5. 对话会保存在你浏览器的 localStorage 中，刷新页面后上下文仍在。

> 安全说明：API Key 只在服务端读取（Server Action），前端拿不到；请求通过服务端代理，不会暴露 Key。

## PWA：添加到手机主屏幕

1. 手机浏览器打开已部署的网站（本地开发时需用手机访问电脑局域网地址，或直接等部署后使用）。
2. iOS Safari：分享按钮 →「添加到主屏幕」。
3. Android Chrome：右上角菜单 →「安装应用」/「添加到主屏幕」。
4. 安装后以独立窗口运行，图标、主题色均为深色；离线时顶部会出现提示条，断网打开会显示离线提示页。

## 部署到 Netlify（GitHub 自动部署）

### 1. 推到 GitHub

```bash
git init
git add .
git commit -m "个人成长系统"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库.git
git push -u origin main
```

> 确认 `.gitignore` 包含 `.env` 和 `.env*.local`，真实密钥不要提交。

### 2. 连接 Netlify

1. 登录 [Netlify](https://app.netlify.com) → **Add new site → Import an existing project**。
2. 选择 GitHub 仓库，Netlify 会自动识别 [netlify.toml](./netlify.toml)（构建命令 `npm run build`，发布目录 `.next`，并启用 Next.js 官方插件）。
3. 点击 **Deploy**，首次部署完成。

### 3. 配置环境变量

在 Netlify → **Site configuration → Environment variables** 添加（与 `.env` 相同的一套）：

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SESSION_SECRET
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL（可选）
```

### 4. 自动重新部署

- 之后每次 `git push` 到 `main`，Netlify 都会自动重新构建部署。
- 也可以在 Netlify → Deploys → Trigger deploy 手动触发。

## 奖励机制与红线（重要）

奖励分三类：

| 类型 | 内容 | 解锁条件 |
| --- | --- | --- |
| 解锁型（免费） | 称号、徽章 | 升级自动解锁，无成本 |
| 体验型（低成本） | 一顿好饭（≤¥50）/ 一件小东西（≤¥100） | 连续打卡 7 天 / 21 天 |
| 里程碑大奖 | 特殊成就页 | 存款破万、拿到 Offer |

**红线：所有奖励一律不得动用强制储蓄，只能从生活费结余里支出。** 存进强制储蓄的钱是不可动的底仓。系统在「奖励与成就」页顶部持续显示这条红线。

## 失败容忍机制

- 断签不惩罚：显示「断了没关系，今天重新开始，历史成就不会消失」，历史记录与已解锁成就全部保留。
- 休息日按钮：每天可以标记「今天休息」——不增加连续天数，但也不打断连续性，连续打卡从休息前的位置继续。
- 未完成任务时显示：「今天休息也是合理的，明天继续」。

## 各模块使用说明

### 任务与等级

仪表盘三个任务分区，点圆形按钮打卡，自动加 XP；XP 达到阈值自动升级（Lv1 新手 → Lv10 传奇，阈值见 `lib/levels.ts`）。每日 0 点、每周一自动重置。

### 技能树（/skills）

拖动滑块或点 +/- 调整技能进度（0-100）；顶部可新增技能分支，每个分支下可新增技能节点。进度为手动调整，自动关联任务在后续版本实现。

### 财务追踪（/finances）

按月份记录收入、强制储蓄、生活费、副业收入；存款进度 = 各月强制储蓄累计 ÷ ¥15,000。同月重复保存即覆盖。

### 权利账本（/rights）

记录「我算了」/「我要回来了」，顶部显示本周统计（周一起算）。记录会纳入「权益觉醒」成就判定。

### 止损三问（/review）

每月 1 日仪表盘出现提醒条；填写三问后按月归档。问题：这份工作还在给我什么 / 我在失去什么 / 离职触发条件到了吗。

### 职业规划（/career）

- 目标岗位、目标公司：可增删。
- 行业调研：行业名 + 薪资/门槛/加班/前景/匹配度/兴趣，可增删改。
- 简历投递：公司/岗位/日期/结果（未回应/面试/被拒/Offer），结果可随时更新。
- 面试记录：问题/表现/复盘。
- 投出第一份简历、完成第一个行业调研、拿到 Offer 会解锁对应成就。

### 复盘（/reflection）

- 每晚 3 分钟收尾：三行必填（要回来了什么 / 算了什么下次怎么办 / 明天最小动作），按天归档。
- 周日复盘：本周数据总结 + 下周计划，按周归档。

### 奖励与成就（/rewards）

徽章墙展示全部成就（达成自动判定、解锁动画），三类奖励进度与红线提示。徽章永久保留。

### AI 顾问（/advisor）

DeepSeek 驱动，人设客观、零迎合、直接指出问题、给可落地建议。系统自动检测断签与停滞技能，可一键让顾问分析，也可自由对话。

## 英语工作台（/english）

英语学习采用「每日节奏选择 + 每周硬指标」的灵活模式，完成英语任务与现有 XP/等级、连续打卡系统联动。

### 每日节奏（6 种，先选节奏再勾任务）

| 节奏 | 任务 | 说明 |
| --- | --- | --- |
| ⚡ 快速日 | 输入15分钟 + 记5个生词 | 保底节奏，忙/累/没状态时选 |
| 📺 输入日 | 输入30-60分钟 + 记10个生词 | 有空但不想开口 |
| 🗣 对话日 | 输入30分钟 + 记10个生词 + AI对话15分钟 | 状态正常练口语 |
| 👥 真人日 | 输入30分钟 + 记10个生词 + 真人连线15-20分钟 | 状态好敢开口 |
| 📚 精学日 | 输入30分钟 + 记10个生词 + 字幕精读/角色扮演 | 周末/大块时间 |
| 🔄 复盘日 | 输入30分钟 + 记10个生词 + 周复盘 | 每周收尾 |

每完成一个任务 +10 XP；选择节奏后逐项勾选，未完成任何任务前可以更换节奏。

### 每周硬指标（锁死，进度页高亮显示）

| 硬指标 | 每周目标 | 规则 |
| --- | --- | --- |
| 🗣 口语输出 | ≥3次 | AI对话或真人连线都算；第2个月起至少1次必须是真人 |
| 📚 精学 | ≥1次 | 字幕精读或角色扮演 |
| 🔄 复盘 | ≥1次 | 周日做最顺 |
| 📺 输入 | ≥6天 | 快速日的15分钟也算一天 |

### 防偷懒规则

- ⚡ 快速日一周最多 2 次，超出后系统提示「本周快速日额度已用完」，无法再选。
- 周日若硬指标未达标，系统强制提示并安排对应节奏（口语差→对话日/真人日，精学差→精学日，复盘差→复盘日），选择其他节奏会被拒绝。

### 月度目标与半年计划

- 本月进度：词汇 250 个/月（工作台可直接「记生词」）、口试 1 次（口试日当天起可标记完成，+50 XP）、真人连线 4 次。
- 「半年计划」页面可查看内置的 6 个月节奏组合与特殊日（口试、里程碑事件）。
- 首页显示「距离月末口试还有 X 天」，未完成项标红并显示「差 X 次/天」。

### 与现有系统联动

- 英语任务 XP 计入总 XP/等级；口试 +50 XP。
- 英语打卡天数与主系统连续打卡共用（完成任一英语任务即算当天打卡）。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 运行生产构建 |
| `npm run set-password -- "新密码"` | 修改 admin 用户密码 |

## 安全说明

- 所有表开启 RLS 且不开放匿名策略；`service_role` 只存在于服务端环境变量，通过 `server-only` 包防止误引用。
- 密码 scrypt 加盐哈希存储；会话 Cookie 带 HMAC 签名、HttpOnly。
- DeepSeek API Key 只在服务端调用时使用。
- 生产环境务必更换默认密码、使用足够长的 `SESSION_SECRET`，并把密钥配置到 Netlify 环境变量而非提交到仓库。

## 后续规划

- 任务自定义管理界面、技能与任务自动关联
- 财务年度报表、复盘统计与趋势
- AI 顾问推送通知、更细粒度的行为分析
- 多用户支持（迁移 Supabase Auth）
