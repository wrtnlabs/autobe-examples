import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicDiscussionModeratorArticlesArticleIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionComment> {
  // Verify the article exists
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Find the comment to verify it exists and belongs to this article
  const existingComment =
    await MyGlobal.prisma.economic_discussion_comments.findUnique({
      where: {
        id: props.commentId,
        economic_discussion_article_id: props.articleId,
      },
    });

  if (!existingComment) {
    throw new HttpException(
      "Comment not found or does not belong to this article",
      404,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  const deletedComment =
    await MyGlobal.prisma.economic_discussion_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: new Date(),
      },
    });

  // Return the comment with proper type conversion
  return {
    id: deletedComment.id,
    economic_discussion_article_id:
      deletedComment.economic_discussion_article_id,
    economic_discussion_member_id: deletedComment.economic_discussion_member_id,
    parent_id:
      deletedComment.parent_id === null ? undefined : deletedComment.parent_id,
    content: deletedComment.content,
    status: deletedComment.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(deletedComment.created_at),
    updated_at: toISOStringSafe(deletedComment.updated_at),
    deleted_at: deletedComment.deleted_at
      ? toISOStringSafe(deletedComment.deleted_at)
      : undefined,
  };
}
