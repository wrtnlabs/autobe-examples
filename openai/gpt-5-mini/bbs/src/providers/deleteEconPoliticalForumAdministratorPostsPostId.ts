import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteEconPoliticalForumAdministratorPostsPostId(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, postId } = props;

  try {
    // Verify administrator enrollment (must be active)
    const admin =
      await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
        where: { registereduser_id: administrator.id, deleted_at: null },
      });

    if (admin === null) {
      throw new HttpException("Forbidden: administrator not enrolled", 403);
    }

    // Fetch the post; fail with 404 if not found
    const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
      where: { id: postId },
    });
    if (post === null) {
      throw new HttpException("Not Found", 404);
    }

    // Check for active legal holds that target this post or its thread
    const existingHold =
      await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
        where: {
          is_active: true,
          OR: [{ post_id: postId }, { thread_id: post.thread_id }],
        },
      });

    if (existingHold !== null) {
      // Record attempt in audit logs before rejecting
      await MyGlobal.prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: administrator.id,
          action_type: "delete_blocked",
          target_type: "post",
          target_identifier: postId,
          details: `Deletion blocked by active legal hold (hold_id=${existingHold.id})`,
          created_at: toISOStringSafe(new Date()),
          created_by_system: false,
        },
      });

      throw new HttpException(
        "Locked: active legal hold prevents deletion",
        423,
      );
    }

    // Idempotent behavior: if already soft-deleted, do nothing
    if (post.deleted_at) return;

    // Single timestamp used across update and log entries
    const now = toISOStringSafe(new Date());

    // Soft-delete the post (inline data object per guidelines)
    await MyGlobal.prisma.econ_political_forum_posts.update({
      where: { id: postId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });

    // Record audit log entry
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: administrator.id,
        action_type: "delete",
        target_type: "post",
        target_identifier: postId,
        details: `Administrator ${administrator.id} soft-deleted post ${postId}`,
        created_at: now,
        created_by_system: false,
      },
    });

    // Record moderation log referencing the administrator record
    await MyGlobal.prisma.econ_political_forum_moderation_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        acted_admin_id: admin.id,
        action_type: "remove",
        reason_code: "admin_soft_delete",
        rationale: "Soft delete performed by administrator",
        created_at: now,
      },
    });

    return;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    // Unexpected error
    throw new HttpException("Internal Server Error", 500);
  }
}
