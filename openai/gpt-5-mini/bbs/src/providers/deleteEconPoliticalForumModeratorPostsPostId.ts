import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconPoliticalForumModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, postId } = props;

  // Verify moderator record and active status
  const moderatorRecord =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: moderator.id,
        deleted_at: null,
        is_active: true,
        registereduser: { deleted_at: null, is_banned: false },
      },
    });

  if (!moderatorRecord)
    throw new HttpException("Forbidden: You're not an active moderator", 403);

  // Ensure target post exists
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new HttpException("Not Found", 404);

  // Current timestamp (ISO string)
  const now = toISOStringSafe(new Date());

  // Check for active legal holds on the post
  const activeHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: { post_id: postId, is_active: true },
    });

  if (activeHold) {
    // Record audit attempt for blocked deletion
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: moderatorRecord.registereduser_id,
        moderator_id: moderatorRecord.id,
        post_id: postId,
        action_type: "attempted_delete_locked",
        target_type: "post",
        target_identifier: postId,
        details: `Deletion blocked by legal hold id=${activeHold.id}`,
        created_at: now,
        created_by_system: false,
      },
    });

    throw new HttpException("Locked: Legal hold prevents deletion", 423);
  }

  // Idempotency: if already soft-deleted, return without creating duplicate logs
  if (post.deleted_at) {
    return;
  }

  // Perform soft-delete
  await MyGlobal.prisma.econ_political_forum_posts.update({
    where: { id: postId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Record moderation log
  await MyGlobal.prisma.econ_political_forum_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: moderatorRecord.id,
      target_post_id: postId,
      action_type: "soft_delete",
      reason_code: "moderator_action",
      rationale: "Soft-deleted by moderator",
      created_at: now,
    },
  });

  // Record audit log for the action
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: moderatorRecord.registereduser_id,
      moderator_id: moderatorRecord.id,
      post_id: postId,
      action_type: "soft_delete",
      target_type: "post",
      target_identifier: postId,
      details: "Moderator soft-deleted post",
      created_at: now,
      created_by_system: false,
    },
  });

  return;
}
