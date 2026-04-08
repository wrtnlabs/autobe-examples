import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestPosts(props: {
  guest: GuestPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  // Parse pagination parameters with defaults
  const page: number = props.body.page ?? 1;
  const limitRaw: number = props.body.limit ?? 25;
  const limit: number = Math.min(Math.max(limitRaw, 1), 100);
  // Determine feed type with default
  const feedType: "home" | "popular" | "community" =
    props.body.feed_type ?? "popular";
  // Block home feed for guests (requires member authentication)
  if (feedType === "home") {
    throw new HttpException("Home feed requires member authentication", 403);
  }
  // Validate community_id for community feed
  if (feedType === "community") {
    if (!props.body.community_id) {
      throw new HttpException("community_id required for community feed", 400);
    }
  }
  // Determine sort option with default
  const sort: "hot" | "new" | "top" | "controversial" =
    props.body.sort ?? "hot";
  // Validate time_filter for top sorting
  const timeFilter = props.body.time_filter;
  if (sort === "top" && timeFilter !== undefined && timeFilter !== null) {
    const validTimeFilters: Array<
      "today" | "week" | "month" | "year" | "all_time"
    > = ["today", "week", "month", "year", "all_time"];
    if (!validTimeFilters.includes(timeFilter)) {
      throw new HttpException("Invalid time_filter for top sorting", 400);
    }
  }
  // Build where clause
  const where: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
  };
  // Apply feed type filter
  if (feedType === "community" && props.body.community_id) {
    where.reddit_like_community_id = props.body.community_id;
  }
  // Apply time filter for top sorting
  if (sort === "top" && timeFilter && timeFilter !== "all_time") {
    const now = new Date();
    let fromDate: Date;
    switch (timeFilter) {
      case "today":
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(0);
    }
    where.created_at = { gte: fromDate };
  }
  // Apply cursor-based pagination
  if (props.body.cursor) {
    try {
      const cursorData = JSON.parse(atob(props.body.cursor));
      const cursorWhere: Prisma.reddit_like_postsWhereInput = {
        OR: [
          { created_at: { lt: new Date(cursorData.created_at) } },
          {
            AND: [
              { created_at: new Date(cursorData.created_at) },
              { id: { lt: cursorData.id } },
            ],
          },
        ],
      };
      where.AND = [cursorWhere];
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
  }
  // Build order by clause
  const orderBy: Prisma.reddit_like_postsOrderByWithRelationInput = {
    created_at: "desc",
  };
  // Fetch posts with transformer select
  const records = await MyGlobal.prisma.reddit_like_posts.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...RedditLikePostAtSummaryTransformer.select(),
  } satisfies Prisma.reddit_like_postsFindManyArgs);
  // Determine if there are more pages
  const hasNext: boolean = records.length > limit;
  const data = hasNext ? records.slice(0, limit) : records;
  // Transform records
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditLikePostAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: transformedData.length,
    pages: hasNext ? page + 1 : page,
  } satisfies IPage.IPagination;
  return {
    pagination,
    data: transformedData,
  } satisfies IPageIRedditLikePost.ISummary;
}
