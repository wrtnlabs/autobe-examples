import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function getDiscussionBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        id: article.discussion_board_article_category_id,
        deleted_at: null,
      },
    });

  if (!category) {
    // Category referenced by article is missing or logically deleted.
    throw new HttpException("Article category not found", 404);
  }

  return {
    id: article.id,
    title: article.title,
    body: article.body,
    summary: article.summary,
    category: {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
    },
    moderationState: article.moderation_state,
    createdAt: toISOStringSafe(article.created_at),
    updatedAt: toISOStringSafe(article.updated_at),
  };
}
