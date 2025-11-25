-- Auth.js v5 标准用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    provider TEXT, -- 新增字段，记录用户来源 (e.g., 'credentials', 'google', 'github')
    email_verified TIMESTAMPTZ,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auth.js v5 会话表
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auth.js v5 账户表（支持OAuth）
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

-- 用户Steam配置表（更新为引用users表）
CREATE TABLE IF NOT EXISTS user_steam_configs (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    steam_api_key TEXT NOT NULL,
    steam_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 用户游戏库表
CREATE TABLE IF NOT EXISTS user_games (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    playtime_forever INTEGER DEFAULT 0,
    img_icon_url TEXT,
    header_image TEXT,
    last_played TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, app_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_steam_configs_user_id ON user_steam_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_games_user_id ON user_games(user_id);
CREATE INDEX IF NOT EXISTS idx_user_games_app_id ON user_games(app_id);
CREATE INDEX IF NOT EXISTS idx_user_games_synced_at ON user_games(synced_at);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_user_steam_configs_updated_at
    BEFORE UPDATE ON user_steam_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_games_updated_at
    BEFORE UPDATE ON user_games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Notion 映射表，用于缓存 App ID ↔ Notion Page ID
CREATE TABLE IF NOT EXISTS notion_mappings (
    app_id INTEGER PRIMARY KEY,
    notion_page_id TEXT NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER IF NOT EXISTS update_notion_mappings_updated_at
    BEFORE UPDATE ON notion_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
