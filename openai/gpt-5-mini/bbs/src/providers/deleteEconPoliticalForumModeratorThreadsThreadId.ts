import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconPoliticalForumModeratorThreadsThreadId(props: {
  moderator: ModeratorPayload;
  threadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, threadId } = props;

  // Re-verify moderator record and ensure active
  const moderatorRecord =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });

  if (moderatorRecord === null) {
    throw new HttpException(
      "Unauthorized: moderator not found or inactive",
      403,
    );
  }

  // Current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Check for active legal holds blocking deletion
  const activeHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: {
        thread_id: threadId,
        is_active: true,
        OR: [{ hold_end: null }, { hold_end: { gte: now } }],
      },
    });

  if (activeHold) {
    throw new HttpException("Forbidden: legal hold prevents deletion", 403);
  }

  // Fetch thread and ensure it exists and is not already deleted
  const thread = await MyGlobal.prisma.econ_political_forum_threads.findUnique({
    where: { id: threadId },
  });

  if (thread === null || thread.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  try {
    // Soft-delete the thread and set updated_at
    await MyGlobal.prisma.econ_political_forum_threads.update({
      where: { id: threadId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });

    // Record moderation log entry (server-generated audit data)
    await MyGlobal.prisma.econ_political_forum_moderation_logs.create({
      data: {
        id: v4(),
        moderator_id: moderatorRecord.id,
        target_thread_id: threadId,
        action_type: "soft_delete",
        reason_code: "soft_delete",
        rationale: "Soft-deleted by moderator via moderation API",
        created_at: now,
      },
    });

    // Create an audit log entry linking the moderator and thread
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4(),
        moderator_id: moderatorRecord.id,
        thread_id: threadId,
        action_type: "soft_delete",
        target_type: "thread",
        target_identifier: threadId,
        details: null,
        created_at: now,
        created_by_system: false,
      },
    });

    return;
  } catch (err) {
    // Unexpected error - do not leak internal details
    throw new HttpException("Internal Server Error", 500);
  }
}
