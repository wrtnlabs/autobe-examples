import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeed";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformFeedsPopular(props: {
  body: IRedditPlatformPostFeed.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortType = props.body.sortType;
  const timeRange = props.body.timeRange;
  const timeRangeFilter:
    | {
        gte: string & tags.Format<"date-time">;
      }
    | undefined = (() => {
    if (!timeRange || timeRange === "ALL") {
      return undefined;
    }
    const daysBefore = (() => {
      switch (timeRange) {
        case "TODAY":
          return 1;
        case "WEEK":
          return 7;
        case "MONTH":
          return 30;
        case "YEAR":
          return 365;
      }
    })();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysBefore);
    const isoString = toISOStringSafe(thresholdDate);
    return { gte: isoString } satisfies {
      gte: string & tags.Format<"date-time">;
    };
  })();
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(timeRangeFilter ? { created_at: timeRangeFilter } : {}),
  };
  const orderByInput = (() => {
    switch (sortType) {
      case "HOT":
        return {
          vote_score: "desc",
          created_at: "desc",
        } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
      case "NEW":
        return {
          created_at: "desc",
        } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
      case "TOP":
        return {
          vote_score: "desc",
        } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
      case "CONTROVERSIAL":
        return {
          vote_score: "asc",
        } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
    }
  })();
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
          created_at: true,
          _count: { select: { subscriptions: true } },
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
              created_at: true,
              _count: { select: { subscriptions: true } },
            },
          },
          posts: true,
          reports: true,
          subscriptions: true,
          moderators: true,
          moderationAuditLogs: true,
          moderatorHistories: true,
          bans: true,
        },
      },
      comments: true,
      moderationAuditLogs: true,
      postVotes: true,
      snapshots: true,
      images: true,
      engagementStats: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, (post) =>
    RedditPlatformPostAtSummaryTransformer.transform(post),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
