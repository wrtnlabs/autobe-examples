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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformPostEngagementStatAtSummaryTransformer } from "../transformers/RedditPlatformPostEngagementStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminAnalyticsPosts(props: {
  admin: AdminPayload;
  body: IRedditPlatformPostEngagementStat.IRequest;
}): Promise<IPageIRedditPlatformPostEngagementStat.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const finalLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * finalLimit;
  const whereInput: Prisma.reddit_platform_post_engagement_statsWhereInput = {
    deleted_at: null,
    ...(props.body.post_id !== undefined && {
      post_id: props.body.post_id,
    }),
    ...(props.body.postIds !== undefined && {
      post_id: { in: props.body.postIds },
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
        gte: new Date(props.body.dateFrom),
      },
    }),
    ...(props.body.dateTo !== undefined && {
      last_viewed_at: {
        lte: new Date(props.body.dateTo),
      },
    }),
  } satisfies Prisma.reddit_platform_post_engagement_statsWhereInput;
  const orderByInput: Prisma.reddit_platform_post_engagement_statsOrderByWithRelationInput[] =
    (() => {
      if (props.body.sortBy === "view_count") {
        return [
          { view_count: props.body.sortOrder === "asc" ? "asc" : "desc" },
        ];
      }
      if (props.body.sortBy === "upvote_count") {
        return [
          { upvote_count: props.body.sortOrder === "asc" ? "asc" : "desc" },
        ];
      }
      if (props.body.sortBy === "downvote_count") {
        return [
          {
            downvote_count: props.body.sortOrder === "asc" ? "asc" : "desc",
          },
        ];
      }
      if (props.body.sortBy === "last_viewed_at") {
        return [
          { last_viewed_at: props.body.sortOrder === "asc" ? "asc" : "desc" },
        ];
      }
      if (props.body.sortBy === "created_at") {
        return [
          { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" },
        ];
      }
      return [{ view_count: "desc" }];
    })();
  const data =
    await MyGlobal.prisma.reddit_platform_post_engagement_stats.findMany({
      where: whereInput,
      skip,
      take: finalLimit,
      orderBy: orderByInput,
      ...RedditPlatformPostEngagementStatAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_platform_post_engagement_stats.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: finalLimit,
      records: total,
      pages: Math.ceil(total / finalLimit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostEngagementStatAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformPostEngagementStat.ISummary;
}
