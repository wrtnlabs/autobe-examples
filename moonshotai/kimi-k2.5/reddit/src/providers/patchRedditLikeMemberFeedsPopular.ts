import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberFeedsPopular(props: {
  member: AdminPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const body = props.body;
  // Pagination with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause
  const whereInput: Prisma.reddit_like_postsWhereInput = {
    is_deleted: false,
  };
  // Community filter
  if (body.communityId !== undefined) {
    whereInput.community_id = body.communityId;
  }
  // Author filter
  if (body.authorId !== undefined) {
    whereInput.author_id = body.authorId;
  }
  // Post type filter
  if (body.postType !== undefined) {
    whereInput.post_type = body.postType;
  }
  // Search filter on title (case-insensitive contains)
  if (body.search !== undefined && body.search.length > 0) {
    whereInput.title = {
      contains: body.search,
      mode: "insensitive",
    };
  }
  const sort = body.sort ?? "hot";
  // Handle date filtering for time-based queries
  if (
    body.createdAfter !== undefined ||
    body.createdBefore !== undefined ||
    ((sort === "top" || sort === "controversial") &&
      body.timeFilter !== undefined &&
      body.timeFilter !== "all_time")
  ) {
    whereInput.created_at = {};
    if (body.createdAfter !== undefined) {
      whereInput.created_at.gte = body.createdAfter;
    }
    if (body.createdBefore !== undefined) {
      whereInput.created_at.lte = body.createdBefore;
    }
    // Time filter for top/controversial sorting
    if (
      (sort === "top" || sort === "controversial") &&
      body.timeFilter !== undefined &&
      body.timeFilter !== "all_time"
    ) {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      let cutoffTimestamp: number;
      switch (body.timeFilter) {
        case "today":
          cutoffTimestamp = now - oneDay;
          break;
        case "week":
          cutoffTimestamp = now - 7 * oneDay;
          break;
        case "month":
          cutoffTimestamp = now - 30 * oneDay;
          break;
        case "year":
          cutoffTimestamp = now - 365 * oneDay;
          break;
        default:
          cutoffTimestamp = 0;
      }
      const date = new Date(cutoffTimestamp);
      whereInput.created_at.gte = date.toISOString();
    }
  }
  // Determine order by based on sort strategy
  let orderBy:
    | Prisma.reddit_like_postsOrderByWithRelationInput
    | Prisma.reddit_like_postsOrderByWithRelationInput[];
  if (body.sortBy !== undefined && body.sortOrder !== undefined) {
    orderBy = { [body.sortBy]: body.sortOrder };
  } else {
    switch (sort) {
      case "new":
        orderBy = { created_at: "desc" };
        break;
      case "top":
        orderBy = { vote_score: "desc" };
        break;
      case "hot":
        orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
        break;
      case "controversial":
        whereInput.vote_score = {
          gte: -10,
          lte: 10,
        };
        orderBy = { comment_count: "desc" };
        break;
      default:
        orderBy = { created_at: "desc" };
    }
  }
  // Query posts
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereInput,
    orderBy: orderBy,
    skip: skip,
    take: limit,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  // Transform posts to summary format
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
  return {
    data: data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
