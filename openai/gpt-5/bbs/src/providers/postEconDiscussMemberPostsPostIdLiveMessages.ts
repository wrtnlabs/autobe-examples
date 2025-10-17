import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveMessage";
import { IELiveMessageType } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveMessageType";
import { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberPostsPostIdLiveMessages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussLiveMessage.ICreate;
}): Promise<IEconDiscussLiveMessage> {
  const { member, postId, body } = props;

  const thread = await MyGlobal.prisma.econ_discuss_live_threads.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
      post: { is: { deleted_at: null } },
    },
    select: {
      id: true,
      state: true,
      expert_only: true,
      access_scope: true,
      slow_mode_interval_seconds: true,
    },
  });
  if (!thread)
    throw new HttpException(
      "Live thread not found for the specified post",
      404,
    );

  if (thread.state !== "live") {
    throw new HttpException(
      "Live thread is not accepting messages in its current state",
      409,
    );
  }

  if (thread.expert_only === true) {
    const expert =
      await MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
        where: {
          user_id: member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!expert) {
      throw new HttpException("Forbidden: Expert-only live thread", 403);
    }
  }

  if (thread.access_scope !== "public") {
    throw new HttpException(
      "Forbidden: Access scope does not permit participation",
      403,
    );
  }

  const slowSeconds = thread.slow_mode_interval_seconds ?? null;
  if (slowSeconds !== null && slowSeconds > 0) {
    const last = await MyGlobal.prisma.econ_discuss_live_messages.findFirst({
      where: {
        econ_discuss_live_thread_id: thread.id,
        econ_discuss_user_id: member.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    });
    if (last) {
      const nowIso = toISOStringSafe(new Date());
      const lastIso = toISOStringSafe(last.created_at);
      const diffSeconds = (Date.parse(nowIso) - Date.parse(lastIso)) / 1000;
      if (diffSeconds < slowSeconds) {
        throw new HttpException("Too Many Requests: Slow mode is enabled", 429);
      }
    }
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.econ_discuss_live_messages.create({
    data: {
      id,
      econ_discuss_live_thread_id: thread.id,
      econ_discuss_user_id: member.id,
      message_type: body.messageType,
      content: body.content ?? null,
      pinned: body.pinned === true,
      edited_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      message_type: true,
      content: true,
      pinned: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id,
    liveThreadId: thread.id as string & tags.Format<"uuid">,
    authorUserId: member.id,
    messageType: created.message_type as IELiveMessageType,
    content: created.content ?? null,
    pinned: created.pinned,
    editedAt: null,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt: null,
  };
}
