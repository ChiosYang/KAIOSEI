import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NotionSyncPanel } from "@/components/notion/notion-sync-panel";

export default async function NotionPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Notion 同步
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          手动触发与你的 Notion 数据库的数据同步，可选按时间增量同步。
        </p>
      </header>

      <NotionSyncPanel />
    </div>
  );
}
