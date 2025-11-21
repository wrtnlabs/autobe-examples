import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function getShoppingMallArticlesArticleIdCommentsCommentId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallArticleComment> {
  // First verify the article exists
  const article = await MyGlobal.prisma.shopping_mall_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Find the comment with article verification
  const comment =
    await MyGlobal.prisma.shopping_mall_article_comments.findFirst({
      where: {
        id: props.commentId,
        shopping_mall_article_id: props.articleId,
        deleted_at: null,
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            summary: true,
            status: true,
            business_status: true,
            featured: true,
            allow_comments: true,
            view_count: true,
            published_at: true,
            created_at: true,
            updated_at: true,
            channel: {
              select: {
                id: true,
                name: true,
                description: true,
                code: true,
              },
            },
            section: {
              select: {
                id: true,
                name: true,
                description: true,
                display_order: true,
              },
            },
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            status: true,
            like_count: true,
            report_count: true,
            depth: true,
            actor_type: true,
          },
        },
      },
    });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Helper function to convert article to summary
  const convertArticleToSummary = (
    article: any,
  ): IShoppingMallArticle.ISummary => ({
    id: article.id,
    title: article.title,
    subtitle: article.subtitle ?? undefined,
    summary: article.summary ?? undefined,
    status: article.status,
    business_status: article.business_status,
    featured: article.featured,
    allow_comments: article.allow_comments,
    view_count: article.view_count,
    published_at: article.published_at
      ? toISOStringSafe(article.published_at)
      : undefined,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
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
  });

  // Convert parent comment summary if exists
  const parentSummary: IShoppingMallArticleComment.ISummary | undefined =
    comment.parent
      ? {
          id: comment.parent.id,
          content: comment.parent.content,
          status: comment.parent.status as
            | "pending"
            | "approved"
            | "rejected"
            | "flagged",
          like_count: comment.parent.like_count,
          report_count: comment.parent.report_count,
          depth: comment.parent.depth,
          actor_type: comment.parent.actor_type as
            | "customer"
            | "seller"
            | "administrator",
          article: convertArticleToSummary(comment.article),
        }
      : undefined;

  return {
    id: comment.id,
    content: comment.content,
    status: comment.status as "pending" | "approved" | "rejected" | "flagged",
    like_count: comment.like_count,
    report_count: comment.report_count,
    depth: comment.depth,
    actor_type: comment.actor_type as "customer" | "seller" | "administrator",
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
    shopping_mall_article_id: comment.shopping_mall_article_id,
    article: convertArticleToSummary(comment.article),
    parent: parentSummary,
  };
}
