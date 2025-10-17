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

export async function getEconDiscussPostsPostIdLive(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussLiveThread> {
  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!post) throw new HttpException("Not Found", 404);

  const row = await MyGlobal.prisma.econ_discuss_live_threads.findFirst({
    where: {
      econ_discuss_post_id: props.postId,
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

  if (!row) throw new HttpException("Not Found", 404);

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
    slowModeIntervalSeconds:
      row.slow_mode_interval_seconds === null
        ? null
        : (row.slow_mode_interval_seconds as number & tags.Type<"int32">),
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
  };
}
