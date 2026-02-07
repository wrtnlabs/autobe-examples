import { ICommunityMvCommunityPopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvCommunityPopularFeed";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMvCommunityPopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvCommunityPopularFeed";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityFeedPopular(props: {
  body: ICommunityMvCommunityPopularFeed.IRequest;
}): Promise<IPageICommunityMvCommunityPopularFeed.ISummary> {
  // Extract parameters from request body. Default sort_algorithm to 'hot' as primary algorithm.
  const sortAlgorithm = "hot";
  const pageToken = "";
  const monthPartition = new Date().toISOString().substring(0, 7);
  // Construct cache key
  const cacheKey = {
    feed_type: "popular" as const,
    sort_algorithm: sortAlgorithm,
    page_token: pageToken,
    month_partition: monthPartition,
  };
  // Fetch cache entry
  const cacheEntry =
    await MyGlobal.prisma.community_mv_feed_cache_entries.findFirst({
      where: cacheKey,
    });
  // If cache exists and last_updated > 5 minutes ago, return cached payload
  const fiveMinutesAgo = toISOStringSafe(new Date(Date.now() - 5 * 60 * 1000));
  if (
    cacheEntry &&
    new Date(cacheEntry.last_updated) >= new Date(fiveMinutesAgo)
  ) {
    return JSON.parse(cacheEntry.payload);
  }
  // Build query conditions for materialized view
  const whereClause: Prisma.community_mv_community_popular_feedsWhereInput = {
    is_active: true,
    sort_algorithm: sortAlgorithm,
  };
  // Handle cursor-based pagination using sort_order as cursor key
  if (pageToken) {
    whereClause.sort_order = { gt: parseInt(pageToken) };
  }
  // Query materialized view for data
  const data =
    await MyGlobal.prisma.community_mv_community_popular_feeds.findMany({
      where: whereClause,
      orderBy: { sort_order: "asc" },
      take: 20,
    });
  // If no data, return empty list
  if (data.length === 0) {
    return {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // Calculate total count for pagination
  const total =
    await MyGlobal.prisma.community_mv_community_popular_feeds.count({
      where: {
        is_active: true,
        sort_algorithm: sortAlgorithm,
      },
    });
  // Determine next page cursor (last item's sort_order)
  const nextPageToken =
    data.length === 20 ? data[data.length - 1].sort_order.toString() : "";
  // Create pagination object
  const pagination: IPage.IPagination = {
    current: pageToken ? Math.floor(parseInt(pageToken) / 20) + 2 : 1,
    limit: 20,
    records: total,
    pages: Math.ceil(total / 20),
  };
  // Build response
  const response: IPageICommunityMvCommunityPopularFeed.ISummary = {
    pagination,
    data,
  };
  // Store response in cache
  await MyGlobal.prisma.community_mv_feed_cache_entries.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      feed_type: "popular" as const,
      sort_algorithm: sortAlgorithm,
      page_token: nextPageToken,
      month_partition: monthPartition,
      payload: JSON.stringify(response),
      last_updated: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return response;
}
