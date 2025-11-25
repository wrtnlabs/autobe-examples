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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postDiscussionBoardUserComments(props: {
  user: UserPayload;
  body: IDiscussionBoardArticleComment.ICreate;
}): Promise<IDiscussionBoardArticleComment> {
  // 1. Ensure article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: { id: props.body.discussion_board_article_id, deleted_at: null },
    include: { user: true },
  });
  if (!article) {
    throw new HttpException("Article not found or has been deleted", 404);
  }

  // 2. Ensure user exists and is active
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { id: props.user.id, deleted_at: null },
  });
  if (!user) {
    throw new HttpException("User not found or has been deleted", 404);
  }

  // 3. Prepare audit fields
  const now = toISOStringSafe(new Date());

  // 4. Insert comment
  const comment = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: v4(),
      discussion_board_article_id: props.body.discussion_board_article_id,
      discussion_board_user_id: props.user.id,
      body: props.body.body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Build author summary
  const authorSummary = {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };

  // 6. Build article summary
  const articleSummary = {
    id: article.id,
    title: article.title,
    user: {
      id: article.user.id,
      email: article.user.email,
      created_at: toISOStringSafe(article.user.created_at),
      updated_at: toISOStringSafe(article.user.updated_at),
      deleted_at: article.user.deleted_at
        ? toISOStringSafe(article.user.deleted_at)
        : undefined,
    },
    created_at: toISOStringSafe(article.created_at),
    updated_at: article.updated_at
      ? toISOStringSafe(article.updated_at)
      : undefined,
  };

  // 7. Return DTO
  return {
    id: comment.id,
    author: authorSummary,
    article: articleSummary,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
