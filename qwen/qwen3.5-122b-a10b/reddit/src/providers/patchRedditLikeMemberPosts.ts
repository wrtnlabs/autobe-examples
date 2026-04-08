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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberPosts(props: {
  member: MemberPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const cursor = props.body.cursor;
  // Validate limit range
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Parse cursor if provided
  let cursorData: {
    created_at: string & tags.Format<"date-time">;
    id: string & tags.Format<"uuid">;
  } | null = null;
  if (cursor) {
    try {
      cursorData = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
  }
  // Determine feed type (default to popular)
  const feedType = props.body.feed_type ?? "popular";
  // Validate feed_type
  if (feedType !== "popular" && feedType !== "community") {
    throw new HttpException("Invalid feed_type", 400);
  }
  // Validate sort option
  const sort = props.body.sort ?? "hot";
  if (
    sort !== "hot" &&
    sort !== "new" &&
    sort !== "top" &&
    sort !== "controversial"
  ) {
    throw new HttpException("Invalid sort option", 400);
  }
  // Validate time_filter
  const timeFilter = props.body.time_filter;
  if (
    timeFilter &&
    timeFilter !== "today" &&
    timeFilter !== "week" &&
    timeFilter !== "month" &&
    timeFilter !== "year" &&
    timeFilter !== "all_time"
  ) {
    throw new HttpException("Invalid time_filter", 400);
  }
  // Validate community_id for community feed
  if (feedType === "community" && !props.body.community_id) {
    throw new HttpException("community_id required for community feed", 400);
  }
  // Build where clause based on feed type
  let whereInput: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
  };
  // Apply time filter for top sorting
  if (sort === "top" && timeFilter && timeFilter !== "all_time") {
    const now = new Date();
    let startDate: Date;
    switch (timeFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    whereInput = {
      ...whereInput,
      created_at: { gte: startDate },
    } satisfies Prisma.reddit_like_postsWhereInput;
  }
  if (feedType === "community") {
    // Community feed: posts from specific community
    whereInput = {
      ...whereInput,
      reddit_like_community_id: props.body.community_id,
    } satisfies Prisma.reddit_like_postsWhereInput;
  }
  // Build orderBy based on sort option
  let orderByInput: Prisma.reddit_like_postsOrderByWithRelationInput[] = [];
  if (sort === "new") {
    orderByInput = [{ created_at: "desc" }];
  } else if (sort === "top" || sort === "controversial") {
    // vote_score doesn't exist, use created_at as fallback
    orderByInput = [{ created_at: "desc" }];
  } else {
    // hot (default)
    orderByInput = [{ created_at: "desc" }];
  }
  // Apply cursor-based pagination
  const skipInput = cursorData ? 1 : 0;
  // Fetch posts with transformer select
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: skipInput,
    take: limit + 1, // Fetch one extra to check if there are more pages
    ...RedditLikePostAtSummaryTransformer.select(),
  } satisfies Prisma.reddit_like_postsFindManyArgs);
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  // Check if there are more pages
  const hasNextPage = posts.length > limit;
  const postsToReturn = hasNextPage ? posts.slice(0, limit) : posts;
  // Transform posts to summary format
  const data = await ArrayUtil.asyncMap(
    postsToReturn,
    RedditLikePostAtSummaryTransformer.transform,
  );
  // Generate next cursor if there are more pages
  let nextCursor: string | undefined = undefined;
  if (hasNextPage && postsToReturn.length > 0) {
    const lastPost = postsToReturn[postsToReturn.length - 1];
    const cursorObj = {
      created_at: lastPost.created_at,
      id: lastPost.id,
    };
    nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString("base64");
  }
  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditLikePost.ISummary;
}
