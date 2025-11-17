import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityForumUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityForumPostComment> {
  // First, find the comment to verify it exists and belongs to the user
  const comment = await MyGlobal.prisma.community_forum_comments.findUnique({
    where: {
      id: props.commentId,
    },
  });

  // If comment doesn't exist, throw 404
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Check if the comment belongs to the authenticated user
  if (comment.community_forum_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own comments",
      403,
    );
  }

  // Check if the comment is already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 400);
  }

  // Permanently delete the comment
  const deletedComment = await MyGlobal.prisma.community_forum_comments.delete({
    where: {
      id: props.commentId,
    },
  });

  // Return the deleted comment with proper date formatting
  return {
    id: deletedComment.id,
    body: deletedComment.body,
    created_at: toISOStringSafe(deletedComment.created_at),
    updated_at: deletedComment.updated_at
      ? toISOStringSafe(deletedComment.updated_at)
      : undefined,
    deleted_at: deletedComment.deleted_at
      ? toISOStringSafe(deletedComment.deleted_at)
      : null,
    community_forum_post_id: deletedComment.community_forum_post_id,
    community_forum_user_id: deletedComment.community_forum_user_id,
    parent_id:
      deletedComment.parent_id !== null
        ? (deletedComment.parent_id satisfies string as string)
        : undefined,
  };
}
