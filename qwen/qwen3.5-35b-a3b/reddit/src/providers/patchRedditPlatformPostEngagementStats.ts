import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostEngagementStat";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostEngagementStatAtSummaryTransformer } from "../transformers/RedditPlatformPostEngagementStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditPlatformPostEngagementStats(props: {
  body: IRedditPlatformPostEngagementStat.IRequest;
}): Promise<IPageIRedditPlatformPostEngagementStat.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with soft delete exclusion and optional filters
  const whereInput: Prisma.reddit_platform_post_engagement_statsWhereInput = {
    deleted_at: null,
    ...(props.body.post_id !== undefined && {
      post_id: props.body.post_id,
    }),
    ...(props.body.postIds !== undefined &&
      props.body.postIds.length > 0 && {
        post_id: {
          in: props.body.postIds,
        },
      }),
    ...(props.body.minViewCount !== undefined && {
      view_count: {
        gte: props.body.minViewCount,
      },
    }),
    ...(props.body.maxViewCount !== undefined && {
      view_count: {
        lte: props.body.maxViewCount,
      },
    }),
    ...(props.body.minUpvoteCount !== undefined && {
      upvote_count: {
        gte: props.body.minUpvoteCount,
      },
    }),
    ...(props.body.maxUpvoteCount !== undefined && {
      upvote_count: {
        lte: props.body.maxUpvoteCount,
      },
    }),
    ...(props.body.minDownvoteCount !== undefined && {
      downvote_count: {
        gte: props.body.minDownvoteCount,
      },
    }),
    ...(props.body.maxDownvoteCount !== undefined && {
      downvote_count: {
        lte: props.body.maxDownvoteCount,
      },
    }),
    ...(props.body.dateFrom !== undefined && {
      last_viewed_at: {
        gte: props.body.dateFrom,
      },
    }),
    ...(props.body.dateTo !== undefined && {
      last_viewed_at: {
        lte: props.body.dateTo,
      },
    }),
  };
  // Build ORDER BY clause
  const sortByField:
    | "view_count"
    | "upvote_count"
    | "downvote_count"
    | "last_viewed_at"
    | "created_at" = props.body.sortBy ?? "last_viewed_at";
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.reddit_platform_post_engagement_statsOrderByWithRelationInput[] =
    [
      {
        [sortByField]: sortOrder,
      },
    ] satisfies Prisma.reddit_platform_post_engagement_statsOrderByWithRelationInput[];
  // Get paginated data
  const data =
    await MyGlobal.prisma.reddit_platform_post_engagement_stats.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditPlatformPostEngagementStatAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.reddit_platform_post_engagement_stats.count({
      where: whereInput,
    });
  // Transform and return paginated result
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditPlatformPostEngagementStatAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
