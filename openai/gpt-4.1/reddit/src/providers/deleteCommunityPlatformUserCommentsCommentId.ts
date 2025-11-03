import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the comment
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Only the author can delete
  if (comment.user_id !== props.user.id) {
    throw new HttpException("You are not the author of this comment", 403);
  }
  // If already removed, treat as idempotent
  if (comment.is_removed) {
    return;
  }
  // Check for child replies
  const childCount = await MyGlobal.prisma.community_platform_comments.count({
    where: { parent_comment_id: props.commentId },
  });
  if (childCount > 0) {
    // Soft-delete: mark as removed and insert placeholder
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: {
        is_removed: true,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    await MyGlobal.prisma.community_platform_deleted_comment_placeholders.create(
      {
        data: {
          id: v4(),
          original_comment_id: props.commentId,
          placeholder_type: "deleted_by_user",
          masked_by_user_id: props.user.id,
          masked_reason: "Deleted by comment author",
          created_at: toISOStringSafe(new Date()),
        },
      },
    );
    return;
  }
  // No children: hard delete
  await MyGlobal.prisma.community_platform_comments.delete({
    where: { id: props.commentId },
  });
}
