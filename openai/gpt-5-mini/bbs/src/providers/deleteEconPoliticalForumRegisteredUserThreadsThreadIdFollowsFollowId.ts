import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteEconPoliticalForumRegisteredUserThreadsThreadIdFollowsFollowId(props: {
  registeredUser: RegistereduserPayload;
  threadId: string & tags.Format<"uuid">;
  followId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { registeredUser, threadId, followId } = props;

  const follow =
    await MyGlobal.prisma.econ_political_forum_thread_follows.findUnique({
      where: { id: followId },
      select: {
        id: true,
        thread_id: true,
        registereduser_id: true,
        deleted_at: true,
        updated_at: true,
      },
    });

  if (!follow) return;
  if (follow.deleted_at !== null) return;
  if (follow.thread_id !== threadId) return;

  if (follow.registereduser_id !== registeredUser.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own follows",
      403,
    );
  }

  const activeLegalHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: { thread_id: threadId, is_active: true },
      select: { id: true },
    });

  const now = toISOStringSafe(new Date());

  if (activeLegalHold) {
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4(),
        registereduser_id: registeredUser.id,
        thread_id: threadId,
        action_type: "erase_follow",
        target_type: "thread_follow",
        target_identifier: followId,
        details: "blocked_by_legal_hold",
        created_at: now,
        created_by_system: false,
      },
    });

    throw new HttpException("Forbidden: Legal hold prevents deletion", 403);
  }

  await MyGlobal.prisma.econ_political_forum_thread_follows.update({
    where: { id: followId },
    data: { deleted_at: now, updated_at: now },
  });

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4(),
      registereduser_id: registeredUser.id,
      thread_id: threadId,
      action_type: "erase_follow",
      target_type: "thread_follow",
      target_identifier: followId,
      details: null,
      created_at: now,
      created_by_system: false,
    },
  });

  return;
}
