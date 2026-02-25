import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicBoardAdministratorArticlesArticleIdCommentsCommentId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate article exists and is not deleted
  const article =
    await MyGlobal.prisma.economic_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
      } satisfies Prisma.economic_board_articlesWhereInput,
      select: { id: true, is_deleted: true },
    });
  if (article.is_deleted) {
    throw new HttpException("Article not found", 404);
  }
  // Find comment and verify relationship
  const comment =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
      } satisfies Prisma.economic_board_commentsWhereInput,
      select: { id: true, article_id: true, author_id: true, deleted_at: true },
    });
  // Validate comment belongs to correct article
  if (comment.article_id !== props.articleId) {
    throw new HttpException("Comment not found", 404);
  }
  // Check permission: either administrator or comment author
  if (comment.author_id !== props.administrator.id) {
    throw new HttpException("Forbidden", 403);
  }
  // If already deleted, no-op
  if (comment.deleted_at !== null) {
    return;
  }
  // Soft delete comment without updating comment_count (field not in schema)
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: now },
  });
  // Log audit event with required fields
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: props.administrator.id,
      target_id: props.commentId,
      action_type: "delete",
      reason: JSON.stringify({
        article_id: props.articleId,
        comment_author_id: comment.author_id,
      }),
      created_at: now,
      // Required by schema but not provided in props - use default
      ip_address: "unknown", // Fallback when no request context available
      updated_at: now, // Required field
    },
  });
}
