import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function getDiscussionBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      author: true,
      category: true,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    body: article.body,
    excerpt: article.excerpt === null ? undefined : article.excerpt,
    status: typia.assert<"draft" | "published" | "archived">(article.status),
    view_count: article.view_count,
    is_edited: article.is_edited,
    published_at: article.published_at
      ? toISOStringSafe(article.published_at)
      : undefined,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at
      ? toISOStringSafe(article.deleted_at)
      : undefined,
    author: {
      id: article.author.id,
      username: article.author.username,
      display_name:
        article.author.display_name === null
          ? undefined
          : article.author.display_name,
    },
    category: {
      id: article.category.id,
      name: article.category.name,
      slug: article.category.slug,
      description:
        article.category.description === null
          ? undefined
          : article.category.description,
      sort_order: article.category.sort_order,
      created_at: toISOStringSafe(article.category.created_at),
      updated_at: toISOStringSafe(article.category.updated_at),
    },
  };
}
