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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberFeedsPopular(props: {
  member: MemberPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause
  const baseWhere: Prisma.reddit_like_postsWhereInput = {
    is_deleted: false,
    ...(props.body.communityId !== undefined && {
      community_id: props.body.communityId,
    }),
    ...(props.body.authorId !== undefined && {
      author_id: props.body.authorId,
    }),
    ...(props.body.postType !== undefined && {
      post_type: props.body.postType,
    }),
    ...(props.body.search !== undefined && {
      title: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  };
  // Handle date range filtering
  const dateFilter: Prisma.DateTimeFilter = {};
  if (props.body.createdAfter !== undefined) {
    dateFilter.gte = new Date(props.body.createdAfter);
  }
  if (props.body.createdBefore !== undefined) {
    dateFilter.lte = new Date(props.body.createdBefore);
  }
  // Apply time filter for 'top' and 'controversial' sorting
  const sort = props.body.sort ?? "hot";
  const timeFilter = props.body.timeFilter;
  if (
    (sort === "top" || sort === "controversial") &&
    timeFilter !== undefined &&
    timeFilter !== "all_time"
  ) {
    const now = new Date();
    let cutoffDate: Date;
    switch (timeFilter) {
      case "today":
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }
    dateFilter.gte = cutoffDate;
  }
  const where: Prisma.reddit_like_postsWhereInput = {
    ...baseWhere,
    ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
  };
  // Build order by based on sort parameter
  let orderBy:
    | Prisma.reddit_like_postsOrderByWithRelationInput
    | Prisma.reddit_like_postsOrderByWithRelationInput[];
  if (props.body.sortBy !== undefined && props.body.sortOrder !== undefined) {
    // Custom field sorting
    orderBy = { [props.body.sortBy]: props.body.sortOrder };
  } else {
    switch (sort) {
      case "new":
        orderBy = { created_at: "desc" };
        break;
      case "top":
        orderBy = { vote_score: "desc" };
        break;
      case "controversial":
        // Controversial: high engagement (vote_score absolute value close to 0 with high comment count)
        // Using comment_count as proxy for engagement
        orderBy = [{ comment_count: "desc" }, { vote_score: "asc" }];
        break;
      case "hot":
      default:
        // Hot: weighted combination - vote_score primary, recency secondary
        orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
        break;
    }
  }
  // Execute queries sequentially
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_posts.count({ where });
  // Transform results
  const transformedPosts = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
