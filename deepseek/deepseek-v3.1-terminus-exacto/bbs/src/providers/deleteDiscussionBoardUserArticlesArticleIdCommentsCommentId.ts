import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleIdCommentsCommentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the comment exists and belongs to the specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      discussion_board_article_id: true,
      discussion_board_user_id: true,
      deleted_at: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      404,
    );
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 404);
  }
  // Check authorization: users can only delete their own comments
  if (comment.discussion_board_user_id !== props.user.id) {
    // Check if user has administrator privileges
    const adminCheck = await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        id: props.user.id,
        deleted_at: null,
      },
    });
    if (!adminCheck) {
      throw new HttpException(
        "You don't have permission to delete this comment",
        403,
      );
    }
  }
  // Soft delete the comment by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Return void for 204 No Content response
}
