import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function getShoppingMallArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallArticle> {
  const article = await MyGlobal.prisma.shopping_mall_articles.findUnique({
    where: { id: props.articleId },
    include: {
      channel: true,
      section: true,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (!article.channel) {
    throw new HttpException("Article channel information is missing", 500);
  }

  return {
    id: article.id,
    actor_type: article.actor_type,
    title: article.title,
    subtitle: article.subtitle ?? undefined,
    content: article.content,
    summary: article.summary ?? undefined,
    status: article.status,
    business_status: article.business_status,
    view_count: article.view_count,
    like_count: article.like_count,
    share_count: article.share_count,
    featured: article.featured,
    allow_comments: article.allow_comments,
    published_at: article.published_at
      ? toISOStringSafe(article.published_at)
      : undefined,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at
      ? toISOStringSafe(article.deleted_at)
      : undefined,
    channel: {
      id: article.channel.id,
      name: article.channel.name,
      description: article.channel.description ?? undefined,
      code: article.channel.code,
    },
    section: article.section
      ? {
          id: article.section.id,
          name: article.section.name,
          description: article.section.description ?? undefined,
          display_order: article.section.display_order,
        }
      : undefined,
  };
}
