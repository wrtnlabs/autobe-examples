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
  // Verify article exists (findFirstOrThrow for better error handling)
  await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: { id: true }, // Only need existence check
  });
  // Fetch comment with ownership and article validation
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findFirstOrThrow({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
      },
    });
  // Authorization check - user must own the comment
  if (comment.discussion_board_user_id !== props.user.id) {
    throw new HttpException("You can only delete your own comments", 403);
  }
  // Check if already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 410);
  }
  // Get current timestamp as ISO string
  const now = new Date().toISOString();
  // Perform soft deletion with ISO string timestamps
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
