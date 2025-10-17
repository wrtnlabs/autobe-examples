import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconPoliticalForumModeratorThreadsThreadIdTagsTagId(props: {
  moderator: ModeratorPayload;
  threadId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, threadId, tagId } = props;

  // Authorization: verify moderator enrollment and active status
  const moderatorRecord =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });
  if (!moderatorRecord) {
    throw new HttpException("Unauthorized: not an active moderator", 403);
  }

  // Verify thread exists
  const thread = await MyGlobal.prisma.econ_political_forum_threads.findUnique({
    where: { id: threadId },
  });
  if (!thread) throw new HttpException("Thread not found", 404);

  // Verify tag exists
  const tag = await MyGlobal.prisma.econ_political_forum_tags.findUnique({
    where: { id: tagId },
  });
  if (!tag) throw new HttpException("Tag not found", 404);

  // Check for active legal holds on the thread
  const activeHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: {
        thread_id: threadId,
        is_active: true,
      },
    });
  if (activeHold) {
    throw new HttpException(`Locked by legal hold: ${activeHold.id}`, 423);
  }

  // Locate the thread-tag mapping
  const mapping =
    await MyGlobal.prisma.econ_political_forum_thread_tags.findFirst({
      where: {
        thread_id: threadId,
        tag_id: tagId,
      },
    });

  // Idempotent behaviour: if mapping missing or already soft-deleted, succeed
  if (!mapping) return;
  if (mapping.deleted_at !== null) return;

  // Prepare timestamp once and perform soft-delete
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_political_forum_thread_tags.update({
    where: { id: mapping.id },
    data: { deleted_at: now },
  });

  // Record moderation action
  await MyGlobal.prisma.econ_political_forum_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: moderatorRecord.id,
      target_thread_id: threadId,
      action_type: "erase_thread_tag",
      reason_code: "tag_removed",
      rationale: null,
      evidence_reference: null,
      created_at: now,
    },
  });

  // Record audit log for compliance
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: moderator.id,
      moderator_id: moderatorRecord.id,
      thread_id: threadId,
      action_type: "erase_thread_tag",
      target_type: "thread_tag",
      target_identifier: `${threadId}:${tagId}`,
      details: null,
      created_at: now,
      created_by_system: false,
    },
  });

  return;
}
