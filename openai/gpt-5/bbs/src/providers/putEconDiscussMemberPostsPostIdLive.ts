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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconDiscussMemberPostsPostIdLive(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussLiveThread.IUpdate;
}): Promise<IEconDiscussLiveThread> {
  const { member, postId, body } = props;

  const existing = await MyGlobal.prisma.econ_discuss_live_threads.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
  });
  if (!existing) throw new HttpException("Not Found", 404);

  if (existing.host_user_id !== member.id) {
    const [moderator, admin] = await Promise.all([
      MyGlobal.prisma.econ_discuss_moderators.findFirst({
        where: { user_id: member.id, deleted_at: null },
      }),
      MyGlobal.prisma.econ_discuss_admins.findFirst({
        where: { user_id: member.id, deleted_at: null },
      }),
    ]);
    if (!moderator && !admin) {
      throw new HttpException("Forbidden", 403);
    }
  }

  const requestedState = body.state;
  if (requestedState !== undefined) {
    const currentState = existing.state;
    const allowed: Record<string, IELiveThreadState[]> = {
      scheduled: ["waiting", "live"],
      waiting: ["live"],
      live: ["paused", "ended"],
      paused: ["live", "ended"],
      ended: ["archived"],
      archived: [],
    };
    const allowedTargets = allowed[currentState] ?? [];
    if (
      requestedState !== currentState &&
      allowedTargets.includes(requestedState) === false
    ) {
      throw new HttpException("Conflict: illegal state transition", 409);
    }
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.econ_discuss_live_threads.update({
    where: { id: existing.id },
    data: {
      expert_only: body.expertOnly ?? undefined,
      access_scope: body.accessScope ?? undefined,
      slow_mode_interval_seconds: body.slowModeIntervalSeconds ?? undefined,
      scheduled_start_at:
        body.scheduledStartAt === null
          ? null
          : body.scheduledStartAt
            ? toISOStringSafe(body.scheduledStartAt)
            : undefined,
      ...(requestedState !== undefined ? { state: requestedState } : {}),
      ...(requestedState === "live" && existing.started_at === null
        ? { started_at: now }
        : {}),
      ...(requestedState === "paused" ? { paused_at: now } : {}),
      ...(requestedState === "ended" ? { ended_at: now } : {}),
      ...(requestedState === "archived" ? { archived_at: now } : {}),
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    postId: updated.econ_discuss_post_id as string & tags.Format<"uuid">,
    hostUserId: updated.host_user_id as string & tags.Format<"uuid">,
    state: updated.state as IELiveThreadState,
    expertOnly: updated.expert_only,
    accessScope: updated.access_scope as IELiveThreadAccessScope,
    scheduledStartAt: updated.scheduled_start_at
      ? toISOStringSafe(updated.scheduled_start_at)
      : null,
    startedAt: updated.started_at ? toISOStringSafe(updated.started_at) : null,
    pausedAt: updated.paused_at ? toISOStringSafe(updated.paused_at) : null,
    endedAt: updated.ended_at ? toISOStringSafe(updated.ended_at) : null,
    archivedAt: updated.archived_at
      ? toISOStringSafe(updated.archived_at)
      : null,
    slowModeIntervalSeconds: updated.slow_mode_interval_seconds ?? null,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
  };
}
