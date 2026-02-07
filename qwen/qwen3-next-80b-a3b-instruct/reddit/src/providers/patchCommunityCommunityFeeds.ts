import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityCommunityFeeds(props: {
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  // IRequest is empty ({}), so no parameters are available in body
  // Per API specification, default sort_algorithm is 'hot'
  const sortAlgorithm: "hot" | "new" | "top" | "controversial" = "hot";
  // Since top_period is not in IRequest, we ignore it entirely (default behavior)
  // Since page_token is not in IRequest, we use offset-based pagination with default values
  const skip = 0;
  const take = 100;
  // Query the materialized view directly with default sort_algorithm and required where clause
  const data =
    await MyGlobal.prisma.community_mv_community_popular_feeds.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      skip,
      take,
      select: {
        id: true,
        title: true,
        author_username: true,
        community_name: true,
        vote_score: true,
        comment_count: true,
        post_type: true,
        content_preview: true,
        created_at: true,
        domain_name: true,
        thumbnail_url: true,
        is_active: true,
        sort_order: true, // ✅ Added sort_order to match database schema and pagination requirement
      },
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.community_mv_community_popular_feeds.count({
      where: { is_active: true },
    });
  // Calculate pagination
  const page = Math.floor(skip / take) + 1;
  const pages = Math.ceil(total / take);
  const hasnextPage = data.length === take;
  const nextToken = hasnextPage
    ? `${data[data.length - 1].sort_order}:${data[data.length - 1].id}`
    : null;
  // Transform to response format - ensure date fields are formatted as strings
  const transformedData = data.map((item) => ({
    id: item.id,
    title: item.title,
    author_username: item.author_username,
    community_name: item.community_name,
    vote_score: item.vote_score,
    comment_count: item.comment_count,
    post_type: item.post_type,
    content_preview: item.content_preview ?? undefined,
    created_at: toISOStringSafe(item.created_at),
    domain_name: item.domain_name ?? undefined,
    thumbnail_url: item.thumbnail_url ?? undefined,
    is_active: item.is_active,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: pages,
    },
  };
}
