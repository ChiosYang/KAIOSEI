"use client";

import { useState } from "react";

interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: {
    appId: number;
    status: "created" | "updated" | "skipped";
    notionPageId?: string;
    error?: string;
  }[];
}

export function NotionSyncPanel() {
  const [since, setSince] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/notion/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          since: since ? new Date(since).toISOString() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "同步失败");
      }

      setResult(data);
      setLastSuccessAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              增量同步起始时间（可选）
            </label>
            <input
              type="datetime-local"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              留空则执行全量同步；填写后仅同步该时间之后更新的记录。
            </p>
            {lastSuccessAt && (
              <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1">
                上次成功时间：{new Date(lastSuccessAt).toLocaleString()}
              </p>
            )}
          </div>

          <button
            onClick={handleSync}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                同步中...
              </>
            ) : (
              "立即同步 Notion"
            )}
          </button>

          {error && (
            <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge label="总数" value={result.total} />
                <Badge label="创建" value={result.created} highlight />
                <Badge label="更新" value={result.updated} />
                <Badge label="跳过" value={result.skipped} />
                <Badge label="失败" value={result.failed} danger={result.failed > 0} />
              </div>

              {result.failed > 0 && (
                <div className="mt-3 space-y-2 text-sm text-red-700 dark:text-red-200">
                  <p className="font-medium">失败详情：</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.results
                      .filter((r) => r.error)
                      .map((r) => (
                        <li key={r.appId}>
                          App {r.appId}: {r.error}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>提示：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>需要在环境变量中配置 `NOTION_API_KEY`。</li>
          <li>若缺少数据源 ID，代码会尝试自动创建，但建议手动设置以避免写入错误库。</li>
          <li>同步频繁时请注意 Notion API 速率限制。</li>
        </ul>
      </div>
    </div>
  );
}

function Badge({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-3 py-1 border text-xs font-medium";
  const color = danger
    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
    : highlight
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
      : "border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

  return (
    <span className={`${base} ${color}`}>
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
