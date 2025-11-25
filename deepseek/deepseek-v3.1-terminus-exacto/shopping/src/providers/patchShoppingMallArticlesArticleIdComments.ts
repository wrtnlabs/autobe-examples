import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import { IPageIShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function patchShoppingMallArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IShoppingMallArticleComment.IRequest;
}): Promise<IPageIShoppingMallArticleComment.ISummary> {
  // Verify article exists
  const article = await MyGlobal.prisma.shopping_mall_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Build where condition
  const whereCondition: Prisma.shopping_mall_article_commentsWhereInput = {
    shopping_mall_article_id: props.articleId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.search && {
      content: { contains: props.body.search, mode: "insensitive" },
    }),
  };

  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Sorting with type-safe assignment
  const orderBy: Prisma.shopping_mall_article_commentsOrderByWithRelationInput =
    {};

  if (props.body.sort_by && props.body.order) {
    const sortField = props.body.sort_by;
    const orderDirection = props.body.order as "asc" | "desc";

    // Use explicit conditional checks instead of dynamic property access
    if (sortField === "created_at") {
      orderBy.created_at = orderDirection;
    } else if (sortField === "like_count") {
      orderBy.like_count = orderDirection;
    } else if (sortField === "depth") {
      orderBy.depth = orderDirection;
    } else if (sortField === "updated_at") {
      orderBy.updated_at = orderDirection;
    } else {
      // Default fallback
      orderBy.created_at = "desc";
    }
  } else {
    orderBy.created_at = "desc";
  }

  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_article_comments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
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
      },
    }),
    MyGlobal.prisma.shopping_mall_article_comments.count({
      where: whereCondition,
    }),
  ]);

  // Transform response to match ISummary DTO
  const transformedData: IShoppingMallArticleComment.ISummary[] = data.map(
    (comment) => ({
      id: comment.id,
      content: comment.content,
      status: comment.status as "pending" | "approved" | "rejected" | "flagged",
      like_count: comment.like_count,
      report_count: comment.report_count,
      depth: comment.depth,
      actor_type: comment.actor_type as "customer" | "seller" | "administrator",
      article: {
        id: comment.article.id,
        title: comment.article.title,
        subtitle: comment.article.subtitle ?? undefined,
        summary: comment.article.summary ?? undefined,
        status: comment.article.status,
        business_status: comment.article.business_status,
        featured: comment.article.featured,
        allow_comments: comment.article.allow_comments,
        view_count: comment.article.view_count,
        published_at: comment.article.published_at
          ? toISOStringSafe(comment.article.published_at)
          : undefined,
        created_at: toISOStringSafe(comment.article.created_at),
        updated_at: toISOStringSafe(comment.article.updated_at),
        channel: {
          id: comment.article.channel.id,
          name: comment.article.channel.name,
          description: comment.article.channel.description ?? undefined,
          code: comment.article.channel.code,
        },
        section: comment.article.section
          ? {
              id: comment.article.section.id,
              name: comment.article.section.name,
              description: comment.article.section.description ?? undefined,
              display_order: comment.article.section.display_order,
            }
          : undefined,
      },
    }),
  );

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
