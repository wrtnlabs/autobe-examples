import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePosts(props: {
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const body = props.body;
  // Pagination parameters - offset-based
  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
  } satisfies Prisma.reddit_clone_postsWhereInput;
  // Community filter
  if (body.communityId !== undefined) {
    whereInput.reddit_clone_community_id = body.communityId;
  }
  // User/author filter
  if (body.userId !== undefined) {
    whereInput.reddit_clone_user_profile_id = body.userId;
  }
  // Search query (full-text search on title)
  if (body.searchQuery !== undefined && body.searchQuery.length > 0) {
    whereInput.title = {
      contains: body.searchQuery,
    };
  }
  // Post type filter
  if (body.postType !== undefined) {
    whereInput.post_type = body.postType;
  }
  // Time filter for top sorting
  if (
    body.sortType === "top" &&
    body.timeFilter !== undefined &&
    body.timeFilter !== "all"
  ) {
    const now = new Date();
    let timeThreshold: Date;
    switch (body.timeFilter) {
      case "today":
        timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeThreshold = new Date(0);
    }
    whereInput.created_at = {
      gte: timeThreshold,
    };
  }
  // Build ORDER BY clause
  const orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput = {};
  const sortType = body.sortType ?? "hot";
  switch (sortType) {
    case "new":
      orderByInput.created_at = "desc" as const;
      break;
    case "top":
      // Sort by creation date as proxy for top posts
      orderByInput.created_at = "desc" as const;
      break;
    case "hot":
      // Hot: recent posts
      orderByInput.created_at = "desc" as const;
      break;
    case "controversial":
      // Controversial: recent posts as proxy
      orderByInput.created_at = "desc" as const;
      break;
  }
  // Fetch posts
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditClonePostAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    RedditClonePostAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
