import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IPageIShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function patchShoppingMallArticles(props: {
  body: IShoppingMallArticle.IRequest;
}): Promise<IPageIShoppingMallArticle.ISummary> {
  const page = props.body.page;
  const limit = Math.min(props.body.limit, 100); // Cap limit to 100 for performance
  const skip = (page - 1) * limit;

  // Build where conditions based on request filters
  const whereConditions: Record<string, unknown> = {
    deleted_at: null, // Only non-deleted articles
  };

  // Full-text search using PostgreSQL GIN indexes
  if (props.body.search) {
    whereConditions.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Actor type filtering
  if (props.body.actor_type) {
    whereConditions.actor_type = props.body.actor_type;
  }

  // Publication status filtering
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Business status filtering
  if (props.body.business_status) {
    whereConditions.business_status = props.body.business_status;
  }

  // Featured article filtering
  if (props.body.featured !== undefined) {
    whereConditions.featured = props.body.featured;
  }

  // Comment permission filtering
  if (props.body.allow_comments !== undefined) {
    whereConditions.allow_comments = props.body.allow_comments;
  }

  // Engagement metrics filtering
  if (
    props.body.view_count_min !== undefined ||
    props.body.view_count_max !== undefined
  ) {
    const viewCountObj: Record<string, unknown> = {};
    if (props.body.view_count_min !== undefined) {
      viewCountObj.gte = props.body.view_count_min;
    }
    if (props.body.view_count_max !== undefined) {
      viewCountObj.lte = props.body.view_count_max;
    }
    whereConditions.view_count = viewCountObj;
  }

  if (
    props.body.like_count_min !== undefined ||
    props.body.like_count_max !== undefined
  ) {
    const likeCountObj: Record<string, unknown> = {};
    if (props.body.like_count_min !== undefined) {
      likeCountObj.gte = props.body.like_count_min;
    }
    if (props.body.like_count_max !== undefined) {
      likeCountObj.lte = props.body.like_count_max;
    }
    whereConditions.like_count = likeCountObj;
  }

  if (
    props.body.share_count_min !== undefined ||
    props.body.share_count_max !== undefined
  ) {
    const shareCountObj: Record<string, unknown> = {};
    if (props.body.share_count_min !== undefined) {
      shareCountObj.gte = props.body.share_count_min;
    }
    if (props.body.share_count_max !== undefined) {
      shareCountObj.lte = props.body.share_count_max;
    }
    whereConditions.share_count = shareCountObj;
  }

  // Channel and section filtering
  if (props.body.channel_id) {
    whereConditions.shopping_mall_channel_id = props.body.channel_id;
  }

  if (props.body.section_id) {
    whereConditions.shopping_mall_section_id = props.body.section_id;
  }

  // Publication date filtering - use ISO strings directly
  if (props.body.published_after || props.body.published_before) {
    const publishedAtObj: Record<string, unknown> = {};
    if (props.body.published_after) {
      publishedAtObj.gte = props.body.published_after;
    }
    if (props.body.published_before) {
      publishedAtObj.lte = props.body.published_before;
    }
    whereConditions.published_at = publishedAtObj;
  }

  // Build orderBy based on sort parameters
  const orderBy: Record<string, "asc" | "desc"> = {};
  const sortField = props.body.sort_by || "created_at";
  const sortOrder = props.body.order === "asc" ? "asc" : "desc";

  orderBy[sortField] = sortOrder;

  // Execute concurrent queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_articles.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        channel: true,
        section: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_articles.count({
      where: whereConditions,
    }),
  ]);

  // Transform data to match ISummary interface
  const transformedData = data.map((article) => ({
    id: article.id as string & tags.Format<"uuid">,
    title: article.title,
    subtitle: article.subtitle ?? undefined,
    summary: article.summary ?? undefined,
    status: article.status,
    business_status: article.business_status,
    featured: article.featured,
    allow_comments: article.allow_comments,
    view_count: article.view_count,
    published_at: article.published_at
      ? (toISOStringSafe(article.published_at) as string &
          tags.Format<"date-time">)
      : undefined,
    created_at: toISOStringSafe(article.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(article.updated_at) as string &
      tags.Format<"date-time">,
    channel: {
      id: article.channel.id as string & tags.Format<"uuid">,
      name: article.channel.name,
      description: article.channel.description ?? undefined,
      code: article.channel.code,
    },
    section: article.section
      ? {
          id: article.section.id as string & tags.Format<"uuid">,
          name: article.section.name,
          description: article.section.description ?? undefined,
          display_order: article.section.display_order,
        }
      : undefined,
  }));

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
