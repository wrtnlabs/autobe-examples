import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleComment> {
  // Step 1: Fetch the comment, including minimal author and article IDs for summary joins
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    include: {
      user: true,
      article: { include: { user: true } },
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at) {
    throw new HttpException("Comment already deleted", 400);
  }

  // Step 2: Soft delete
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: now, updated_at: now },
  });

  // Step 3: Map author summary (IDiscussionBoardUser.ISummary)
  const authorUser = comment.user;

  const authorSummary = {
    id: authorUser.id,
    email: authorUser.email,
    created_at: toISOStringSafe(authorUser.created_at),
    updated_at: toISOStringSafe(authorUser.updated_at),
    deleted_at: authorUser.deleted_at
      ? toISOStringSafe(authorUser.deleted_at)
      : undefined,
  };

  // Step 4: Map article summary (IDiscussionBoardArticle.ISummary)
  const article = comment.article;
  const articleUser = article.user;
  const articleSummary = {
    id: article.id,
    title: article.title,
    user: {
      id: articleUser.id,
      email: articleUser.email,
      created_at: toISOStringSafe(articleUser.created_at),
      updated_at: toISOStringSafe(articleUser.updated_at),
      deleted_at: articleUser.deleted_at
        ? toISOStringSafe(articleUser.deleted_at)
        : undefined,
    },
    created_at: toISOStringSafe(article.created_at),
    updated_at: article.updated_at
      ? toISOStringSafe(article.updated_at)
      : undefined,
  };

  // Step 5: Return strictly mapped DTO
  return {
    id: updated.id,
    author: authorSummary,
    article: articleSummary,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
