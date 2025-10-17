import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussLiveThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveThread";
import { IELiveThreadState } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadState";
import { IELiveThreadAccessScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadAccessScope";

export async function getEconDiscussLiveThreadsLiveThreadId(props: {
  liveThreadId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussLiveThread> {
  const { liveThreadId } = props;

  let row: {
    id: string;
    econ_discuss_post_id: string;
    host_user_id: string;
    state: string;
    expert_only: boolean;
    access_scope: string;
    scheduled_start_at: Date | null;
    started_at: Date | null;
    paused_at: Date | null;
    ended_at: Date | null;
    archived_at: Date | null;
    slow_mode_interval_seconds: number | null;
    created_at: Date;
    updated_at: Date;
  };

  try {
    row = await MyGlobal.prisma.econ_discuss_live_threads.findFirstOrThrow({
      where: {
        id: liveThreadId,
        deleted_at: null,
      },
      select: {
        id: true,
        econ_discuss_post_id: true,
        host_user_id: true,
        state: true,
        expert_only: true,
        access_scope: true,
        scheduled_start_at: true,
        started_at: true,
        paused_at: true,
        ended_at: true,
        archived_at: true,
        slow_mode_interval_seconds: true,
        created_at: true,
        updated_at: true,
      },
    });
  } catch {
    throw new HttpException("Not Found", 404);
  }

  // Enforce access scope without authentication context: hide invite_only
  if (row.access_scope === "invite_only") {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: row.id as string & tags.Format<"uuid">,
    postId: row.econ_discuss_post_id as string & tags.Format<"uuid">,
    hostUserId: row.host_user_id as string & tags.Format<"uuid">,
    state: row.state as IELiveThreadState,
    expertOnly: row.expert_only,
    accessScope: row.access_scope as IELiveThreadAccessScope,
    scheduledStartAt: row.scheduled_start_at
      ? toISOStringSafe(row.scheduled_start_at)
      : null,
    startedAt: row.started_at ? toISOStringSafe(row.started_at) : null,
    pausedAt: row.paused_at ? toISOStringSafe(row.paused_at) : null,
    endedAt: row.ended_at ? toISOStringSafe(row.ended_at) : null,
    archivedAt: row.archived_at ? toISOStringSafe(row.archived_at) : null,
    slowModeIntervalSeconds: row.slow_mode_interval_seconds ?? null,
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
  };
}
