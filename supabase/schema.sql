-- ============================================================
-- 个人成长系统 · 建表脚本（第一阶段 ~ 第七阶段 + 英语工作台）
-- 本脚本可重复执行（幂等），更新数据库时直接全部重新运行即可。
--
-- 使用方法：
--   1. 打开 Supabase Dashboard → SQL Editor
--   2. 新建查询，把本文件内容全部粘贴进去并运行
-- ============================================================

-- ── 1) 启用 UUID 生成扩展 ────────────────────────────────
create extension if not exists "pgcrypto";

-- ── 2) 用户表（第一阶段）─────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ── 3) 任务表（第二阶段）─────────────────────────────────
-- category: daily=每日任务 / weekly=每周任务 / milestone=里程碑任务
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text not null check (category in ('daily', 'weekly', 'milestone')),
  xp          integer not null default 0,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── 4) 打卡记录表（第二阶段）──────────────────────────────
-- period_key 用于防止重复打卡：
--   每日任务 = 当天日期（YYYY-MM-DD，上海时区）
--   每周任务 = ISO 周键（YYYY-Www，周一为一周起点）
--   里程碑任务 = 'once'（只能完成一次）
-- xp_earned 记录打卡当时发放的 XP（任务 XP 后续调整也不影响历史）
create table if not exists public.task_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  task_id      uuid not null references public.tasks(id) on delete cascade,
  period_key   text not null,
  xp_earned    integer not null default 0,
  completed_at timestamptz not null default now()
);

create index if not exists task_logs_user_task_period_idx
  on public.task_logs (user_id, task_id, period_key);
create index if not exists task_logs_user_time_idx
  on public.task_logs (user_id, completed_at);

-- ── 5) 技能表（第三阶段）─────────────────────────────────
-- 自关联结构：parent_id 为空 = 技能分支；parent_id 非空 = 该分支下的技能节点
create table if not exists public.skills (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  parent_id   uuid references public.skills(id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists skills_parent_idx
  on public.skills (parent_id);

-- 技能进度表：每个用户在每个技能节点上的进度（0-100）
create table if not exists public.skill_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  skill_id   uuid not null references public.skills(id) on delete cascade,
  progress   integer not null default 0 check (progress >= 0 and progress <= 100),
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

create index if not exists skill_progress_user_idx
  on public.skill_progress (user_id);

-- ── 6) 财务表（第四阶段）─────────────────────────────────
-- month: 'YYYY-MM'，每人每月一条
create table if not exists public.finances (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  month          text not null,
  income         numeric(12,2) not null default 0,
  forced_savings numeric(12,2) not null default 0,
  living_expense numeric(12,2) not null default 0,
  side_income    numeric(12,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, month)
);

-- 权利账本（第四阶段）：event_type: gave_up=我算了 / claimed=我要回来了
create table if not exists public.rights_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  event_date  date not null default current_date,
  description text not null,
  event_type  text not null check (event_type in ('gave_up', 'claimed')),
  created_at  timestamptz not null default now()
);

-- 每月复盘·止损三问（第四阶段）：month: 'YYYY-MM'，每人每月一条
create table if not exists public.monthly_review (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  month      text not null,
  q1         text not null,
  q2         text not null,
  q3         text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists finances_user_month_idx
  on public.finances (user_id, month);
create index if not exists rights_ledger_user_date_idx
  on public.rights_ledger (user_id, event_date);
create index if not exists monthly_review_user_month_idx
  on public.monthly_review (user_id, month);

-- 职业规划（第五阶段）：type 区分记录类型
--   position=目标岗位 / company=目标公司 / industry=行业调研
--   application=简历投递 / interview=面试记录
-- payload 为各类型专属字段（JSON）
create table if not exists public.career_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null check (type in ('position','company','industry','application','interview')),
  title      text not null,
  payload    jsonb not null default '{}'::jsonb,
  event_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 复盘（第五阶段）：type: daily=每日3分钟收尾 / weekly=周日复盘
-- 每日 date_key=YYYY-MM-DD；每周 date_key=该周周一日期
create table if not exists public.reflections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null check (type in ('daily','weekly')),
  date_key   text not null,
  q1         text not null,
  q2         text not null,
  q3         text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, date_key)
);

-- 成就（第六阶段）：记录已解锁的成就
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  code        text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, code)
);

-- 休息日（第六阶段）：标记今天休息，不打断连续打卡
create table if not exists public.rest_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  date_key   text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date_key)
);

create index if not exists career_plans_user_type_idx
  on public.career_plans (user_id, type);
create index if not exists reflections_user_idx
  on public.reflections (user_id, type, date_key);
create index if not exists achievements_user_idx
  on public.achievements (user_id);
create index if not exists rest_days_user_idx
  on public.rest_days (user_id, date_key);

-- ── 8) 英语工作台（第八阶段）────────────────────────────
-- 节奏定义（全局）：每日可选的 6 种节奏
create table if not exists public.english_rhythms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  icon        text not null,
  description text,
  tasks       jsonb not null default '[]'::jsonb, -- [{key,label,xp}]
  is_fallback boolean not null default false,     -- 快速日=保底节奏
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 每日记录：date_key=YYYY-MM-DD，每人每天一条
create table if not exists public.english_daily_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  date_key         text not null,
  rhythm_code      text not null,
  completed_tasks  jsonb not null default '[]'::jsonb, -- ["input","words",...]
  used_quick_quota boolean not null default false,
  xp_earned        integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, date_key)
);

-- 每周硬指标统计：week_key=YYYY-Www
create table if not exists public.english_weekly_stats (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  week_key        text not null,
  speech_count    integer not null default 0, -- 口语输出次数（AI对话+真人连线）
  real_talk_count integer not null default 0, -- 其中真人连线次数
  intensive_count integer not null default 0,
  review_count    integer not null default 0,
  input_days      integer not null default 0,
  quick_count     integer not null default 0, -- 快速日使用次数（防偷懒）
  updated_at      timestamptz not null default now(),
  unique (user_id, week_key)
);

-- 月度目标：month_index=1..6（对应半年计划），每人每月一条
create table if not exists public.english_monthly_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  month_index    integer not null,
  vocab_goal     integer not null default 250,
  oral_exam_goal integer not null default 1,
  real_talk_goal integer not null default 4,
  oral_exam_done boolean not null default false,
  oral_exam_xp   integer not null default 0, -- 完成口试时写入 50
  updated_at     timestamptz not null default now(),
  unique (user_id, month_index)
);

-- 半年计划表（全局，内置数据）：每月节奏组合 + 特殊日
create table if not exists public.english_schedule (
  id           uuid primary key default gen_random_uuid(),
  month_index  integer not null unique,
  month_label  text not null,
  start_date   date not null,
  end_date     date not null,
  combo        jsonb not null default '[]'::jsonb,     -- [{rhythm,count}]
  special_days jsonb not null default '[]'::jsonb,     -- [{date,type,label}]
  note         text,
  created_at   timestamptz not null default now()
);

-- 词汇记录（用于月度词汇量统计）
create table if not exists public.english_words (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  word       text not null,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists english_daily_user_date_idx
  on public.english_daily_logs (user_id, date_key);
create index if not exists english_weekly_user_idx
  on public.english_weekly_stats (user_id, week_key);
create index if not exists english_words_user_idx
  on public.english_words (user_id);

-- ── 9) 开启行级安全（RLS）────────────────────────────────
-- 默认不开放任何匿名策略：anon key 无法读取任何表
-- 服务端通过 Service Role Key 访问，不受 RLS 限制
alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.task_logs enable row level security;
alter table public.skills enable row level security;
alter table public.skill_progress enable row level security;
alter table public.finances enable row level security;
alter table public.rights_ledger enable row level security;
alter table public.monthly_review enable row level security;
alter table public.career_plans enable row level security;
alter table public.reflections enable row level security;
alter table public.achievements enable row level security;
alter table public.rest_days enable row level security;
alter table public.english_rhythms enable row level security;
alter table public.english_daily_logs enable row level security;
alter table public.english_weekly_stats enable row level security;
alter table public.english_monthly_goals enable row level security;
alter table public.english_schedule enable row level security;
alter table public.english_words enable row level security;

-- ── 10) 插入初始用户 admin（默认密码 123456，请尽快修改）──
insert into public.users (username, password_hash)
values (
  'admin',
  'scrypt$16384$8$1$0a09e62d2b319860c2639ea0fbd20494$52192a7b0dadbf20bf503f5eddc6068d23bad128e71b6e6ec9e31a90aa36a75f843fb02809b7617b9363414c184122e697e01f0ff6e8fcde901a76f2833e1f32'
)
on conflict (username) do nothing;

-- ── 11) 预设任务种子（第二阶段，后续可自定义）────────────
-- 固定 ID 保证重复执行不会产生重复任务；如需修改任务，直接更新本表即可
insert into public.tasks (id, title, description, category, xp, sort_order)
values
  -- 每日任务（每天 0 点重置）
  ('00000000-0000-4000-8000-000000000001', '英语学习30分钟', '背单词、听听力、读文章均可', 'daily', 10, 10),
  ('00000000-0000-4000-8000-000000000002', '健身30-45分钟', '力量、有氧、拉伸均可', 'daily', 10, 20),
  ('00000000-0000-4000-8000-000000000003', '行业调研/看招聘JD 30分钟', '阅读行业报告、浏览招聘 JD 均可', 'daily', 10, 30),
  ('00000000-0000-4000-8000-000000000004', '存钱记账5分钟', '花 5 分钟记下今天的收支', 'daily', 5, 40),

  -- 每周任务（周一重置）
  ('00000000-0000-4000-8000-000000000005', '投出至少3份简历', '招聘网站、公司官网等渠道均可', 'weekly', 30, 10),
  ('00000000-0000-4000-8000-000000000006', '深度调研1个行业', '写一份简短的行业总结', 'weekly', 20, 20),
  ('00000000-0000-4000-8000-000000000007', '周日复盘', '回顾一周完成情况，规划下周', 'weekly', 10, 30),

  -- 里程碑任务（一次性）
  ('00000000-0000-4000-8000-000000000008', '投出第一份简历', '投出第一份简历的那一刻', 'milestone', 50, 10),
  ('00000000-0000-4000-8000-000000000009', '存款到10000元', '总存款首次达到 10000 元', 'milestone', 100, 20),
  ('00000000-0000-4000-8000-00000000000a', '连续打卡30天', '连续 30 天至少完成 1 项任务（自动完成）', 'milestone', 200, 30)
on conflict (id) do nothing;

-- ── 12) 预设技能种子（第三阶段，后续可自定义）────────────
-- 分支（parent_id 为空）
insert into public.skills (id, name, description, parent_id, sort_order)
values
  ('00000000-0000-4000-8000-0000000000b1', '英语技能树', '持续积累，从日常到职场', null, 10),
  ('00000000-0000-4000-8000-0000000000b2', '健身技能树', '力量与健康，双线并进', null, 20),
  ('00000000-0000-4000-8000-0000000000b3', '职业技能树', '职业竞争力的核心能力', null, 30),
  ('00000000-0000-4000-8000-0000000000b4', '副业技能树', '把兴趣变成第二收入', null, 40),
  ('00000000-0000-4000-8000-0000000000b5', '财商技能树', '让金钱为你工作', null, 50)
on conflict (id) do nothing;

-- 技能节点（parent_id 指向对应分支）
insert into public.skills (id, name, description, parent_id, sort_order)
values
  -- 英语技能树
  ('00000000-0000-4000-8000-0000000000c1', '日常口语', null, '00000000-0000-4000-8000-0000000000b1', 10),
  ('00000000-0000-4000-8000-0000000000c2', '外贸英语', null, '00000000-0000-4000-8000-0000000000b1', 20),
  ('00000000-0000-4000-8000-0000000000c3', '商务邮件', null, '00000000-0000-4000-8000-0000000000b1', 30),
  ('00000000-0000-4000-8000-0000000000c4', '听力', null, '00000000-0000-4000-8000-0000000000b1', 40),
  -- 健身技能树
  ('00000000-0000-4000-8000-0000000000c5', '肩部训练', null, '00000000-0000-4000-8000-0000000000b2', 10),
  ('00000000-0000-4000-8000-0000000000c6', '手臂训练', null, '00000000-0000-4000-8000-0000000000b2', 20),
  ('00000000-0000-4000-8000-0000000000c7', '背部训练', null, '00000000-0000-4000-8000-0000000000b2', 30),
  ('00000000-0000-4000-8000-0000000000c8', '饮食管理', null, '00000000-0000-4000-8000-0000000000b2', 40),
  -- 职业技能树
  ('00000000-0000-4000-8000-0000000000c9', '供应链管理', null, '00000000-0000-4000-8000-0000000000b3', 10),
  ('00000000-0000-4000-8000-0000000000ca', '采购谈判', null, '00000000-0000-4000-8000-0000000000b3', 20),
  ('00000000-0000-4000-8000-0000000000cb', '数据分析', null, '00000000-0000-4000-8000-0000000000b3', 30),
  ('00000000-0000-4000-8000-0000000000cc', 'AI工具应用', null, '00000000-0000-4000-8000-0000000000b3', 40),
  -- 副业技能树
  ('00000000-0000-4000-8000-0000000000cd', '内容创作', null, '00000000-0000-4000-8000-0000000000b4', 10),
  ('00000000-0000-4000-8000-0000000000ce', '信息差变现', null, '00000000-0000-4000-8000-0000000000b4', 20),
  ('00000000-0000-4000-8000-0000000000cf', '个人品牌', null, '00000000-0000-4000-8000-0000000000b4', 30),
  -- 财商技能树
  ('00000000-0000-4000-8000-0000000000d0', '储蓄纪律', null, '00000000-0000-4000-8000-0000000000b5', 10),
  ('00000000-0000-4000-8000-0000000000d1', '理财认知', null, '00000000-0000-4000-8000-0000000000b5', 20),
  ('00000000-0000-4000-8000-0000000000d2', '风险控制', null, '00000000-0000-4000-8000-0000000000b5', 30)
on conflict (id) do nothing;

-- ── 13) 英语节奏种子（第八阶段）──────────────────────────
insert into public.english_rhythms (id, code, name, icon, description, tasks, is_fallback, sort_order)
values
  ('00000000-0000-4000-8000-0000000000e1', 'quick', '快速日', '⚡', '忙/累/没状态时选，保底任务', '[{"key":"input","label":"输入15分钟","xp":10},{"key":"words","label":"记5个生词","xp":10}]', true, 10),
  ('00000000-0000-4000-8000-0000000000e2', 'input', '输入日', '📺', '有空但不想开口', '[{"key":"input","label":"输入30-60分钟","xp":10},{"key":"words","label":"记10个生词","xp":10}]', false, 20),
  ('00000000-0000-4000-8000-0000000000e3', 'dialogue', '对话日', '🗣', '状态正常，练口语', '[{"key":"input","label":"输入30分钟","xp":10},{"key":"words","label":"记10个生词","xp":10},{"key":"ai_chat","label":"AI对话15分钟","xp":10}]', false, 30),
  ('00000000-0000-4000-8000-0000000000e4', 'real', '真人日', '👥', '状态好，敢开口', '[{"key":"input","label":"输入30分钟","xp":10},{"key":"words","label":"记10个生词","xp":10},{"key":"real_talk","label":"真人连线15-20分钟","xp":10}]', false, 40),
  ('00000000-0000-4000-8000-0000000000e5', 'intensive', '精学日', '📚', '周末/大块时间', '[{"key":"input","label":"输入30分钟","xp":10},{"key":"words","label":"记10个生词","xp":10},{"key":"intensive","label":"字幕精读（或角色扮演）","xp":10}]', false, 50),
  ('00000000-0000-4000-8000-0000000000e6', 'review', '复盘日', '🔄', '每周收尾', '[{"key":"input","label":"输入30分钟","xp":10},{"key":"words","label":"记10个生词","xp":10},{"key":"review","label":"周复盘","xp":10}]', false, 60)
on conflict (id) do nothing;

-- ── 14) 半年计划种子（第八阶段，内置数据）─────────────────
insert into public.english_schedule (id, month_index, month_label, start_date, end_date, combo, special_days, note)
values
  (
    '00000000-0000-4000-8000-0000000000f1', 1, '月1（8/26-9/25）', '2026-08-26', '2026-09-25',
    '[{"rhythm":"dialogue","count":3},{"rhythm":"input","count":2},{"rhythm":"intensive","count":1},{"rhythm":"review","count":1}]',
    '[{"date":"2026-09-15","type":"event","label":"注册连线软件"},{"date":"2026-09-17","type":"event","label":"第一次给老外发消息"},{"date":"2026-09-25","type":"exam","label":"口试①"}]',
    null
  ),
  (
    '00000000-0000-4000-8000-0000000000f2', 2, '月2（9/26-10/25）', '2026-09-26', '2026-10-25',
    '[{"rhythm":"dialogue","count":3},{"rhythm":"real","count":1},{"rhythm":"input","count":1},{"rhythm":"intensive","count":1},{"rhythm":"review","count":1}]',
    '[{"date":"2026-10-25","type":"exam","label":"口试②"}]',
    '真人日=打字/语音消息'
  ),
  (
    '00000000-0000-4000-8000-0000000000f3', 3, '月3（10/26-11/25）', '2026-10-26', '2026-11-25',
    '[{"rhythm":"dialogue","count":3},{"rhythm":"real","count":1},{"rhythm":"input","count":1},{"rhythm":"intensive","count":1},{"rhythm":"review","count":1}]',
    '[{"date":"2026-11-25","type":"exam","label":"口试③"}]',
    '真人日=15分钟语音通话'
  ),
  (
    '00000000-0000-4000-8000-0000000000f4', 4, '月4（11/26-12/25）', '2026-11-26', '2026-12-25',
    '[{"rhythm":"dialogue","count":3},{"rhythm":"real","count":1},{"rhythm":"input","count":1},{"rhythm":"intensive","count":1},{"rhythm":"review","count":1}]',
    '[{"date":"2026-12-25","type":"exam","label":"口试④"}]',
    '真人日=视频通话；精学日=精读+角色扮演'
  ),
  (
    '00000000-0000-4000-8000-0000000000f5', 5, '月5（12/26-1/25）', '2026-12-26', '2027-01-25',
    '[{"rhythm":"dialogue","count":3},{"rhythm":"real","count":1},{"rhythm":"input","count":1},{"rhythm":"intensive","count":1},{"rhythm":"review","count":1}]',
    '[{"date":"2027-01-25","type":"exam","label":"口试⑤（B1验收）"}]',
    '真人日=20分钟视频；精学日=30分钟全真模拟'
  ),
  (
    '00000000-0000-4000-8000-0000000000f6', 6, '月6（1/26-2/25）', '2027-01-26', '2027-02-25',
    '[{"rhythm":"dialogue","count":3},{"rhythm":"real","count":1},{"rhythm":"input","count":1},{"rhythm":"intensive","count":1},{"rhythm":"review","count":1}]',
    '[{"date":"2027-02-25","type":"exam","label":"口试⑥（半年总结）"}]',
    '精学日=住宿全真模拟（AI扮一家三口）'
  )
on conflict (id) do nothing;

-- ── 15) 查看结果（可选）──────────────────────────────────
-- select name, category, xp from public.tasks order by category, sort_order;
-- select s1.name as 分支, s2.name as 技能 from public.skills s1 join public.skills s2 on s2.parent_id = s1.id order by s1.sort_order, s2.sort_order;
-- select code, name, icon from public.english_rhythms order by sort_order;
