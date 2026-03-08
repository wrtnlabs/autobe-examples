import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminArticlesArticleIdCommentsCommentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the comment by commentId
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      discussion_board_article_id: true,
      discussion_board_member_id: true,
      deleted_at: true,
    },
  });
  // Verify comment exists
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify comment is not already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 409);
  }
  // Fetch the article to verify it exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true },
  });
  // Verify article exists
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  // Verify articleId matches comment's discussion_board_article_id
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Article-comment ID mismatch", 400);
  }
  // Perform soft deletion
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
