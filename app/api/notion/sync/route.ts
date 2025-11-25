import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncNotionForUser } from '@/lib/services/notion_sync';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const since = body.since ? new Date(body.since) : undefined;

    const result = await syncNotionForUser(session.user.id, { since });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync Notion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
