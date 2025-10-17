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

export async function postEconDiscussMemberPostsPostIdLive(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussLiveThread.ICreate;
}): Promise<IEconDiscussLiveThread> {
  const { member, postId, body } = props;

  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true, econ_discuss_user_id: true },
  });
  if (!post) throw new HttpException("Not Found: Post does not exist", 404);

  if (post.econ_discuss_user_id !== member.id) {
    throw new HttpException(
      "Forbidden: Only the post author can create a live thread",
      403,
    );
  }

  const existing = await MyGlobal.prisma.econ_discuss_live_threads.findFirst({
    where: { econ_discuss_post_id: postId },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException(
      "Conflict: Live thread already exists for this post",
      409,
    );
  }

  const initState: IELiveThreadState =
    body.state !== undefined
      ? body.state
      : body.scheduledStartAt !== undefined && body.scheduledStartAt !== null
        ? "scheduled"
        : "waiting";

  const accessScope: IELiveThreadAccessScope = body.accessScope ?? "public";
  const expertOnly: boolean = body.expertOnly ?? false;

  const scheduledStartAt: (string & tags.Format<"date-time">) | null =
    body.scheduledStartAt === undefined
      ? null
      : body.scheduledStartAt === null
        ? null
        : toISOStringSafe(body.scheduledStartAt);

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  try {
    await MyGlobal.prisma.econ_discuss_live_threads.create({
      data: {
        id,
        econ_discuss_post_id: postId,
        host_user_id: member.id,
        state: initState,
        expert_only: expertOnly,
        access_scope: accessScope,
        scheduled_start_at: scheduledStartAt,
        started_at: null,
        paused_at: null,
        ended_at: null,
        archived_at: null,
        slow_mode_interval_seconds: body.slowModeIntervalSeconds ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Conflict: Live thread already exists for this post",
        409,
      );
    }
    throw err;
  }

  return {
    id,
    postId,
    hostUserId: member.id,
    state: initState,
    expertOnly,
    accessScope,
    scheduledStartAt,
    startedAt: null,
    pausedAt: null,
    endedAt: null,
    archivedAt: null,
    slowModeIntervalSeconds: body.slowModeIntervalSeconds ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
