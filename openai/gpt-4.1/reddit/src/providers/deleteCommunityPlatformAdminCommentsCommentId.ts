import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Check if the comment exists
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { is_removed: true, id: true },
  });
  if (!comment) throw new HttpException("Comment not found", 404);

  // Step 2: Check for any child replies
  const childCount = await MyGlobal.prisma.community_platform_comments.count({
    where: { parent_comment_id: props.commentId },
  });

  // Step 3: If comment already removed (idempotent safe)
  if (comment.is_removed && childCount > 0) return;

  const now = toISOStringSafe(new Date());

  if (childCount === 0) {
    // If no child comments, hard delete (even if is_removed or not)
    await MyGlobal.prisma.community_platform_comments.delete({
      where: { id: props.commentId },
    });
    return;
  }

  if (comment.is_removed) {
    // Already removed, do nothing (idempotency)
    return;
  }

  // Step 4: comment has children, do soft remove
  await Promise.all([
    MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: { is_removed: true, updated_at: now },
    }),
    MyGlobal.prisma.community_platform_deleted_comment_placeholders.create({
      data: {
        id: v4(),
        original_comment_id: props.commentId,
        placeholder_type: "deleted_by_admin",
        masked_by_user_id: props.admin.id,
        masked_reason: null,
        created_at: now,
      },
    }),
  ]);
}
