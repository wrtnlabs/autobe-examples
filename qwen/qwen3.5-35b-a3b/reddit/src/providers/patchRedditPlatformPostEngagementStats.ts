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

export async function patchRedditPlatformPostEngagementStats(props: {
  body: IRedditPlatformPostEngagementStat.IRequest;
}): Promise<IPageIRedditPlatformPostEngagementStat.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const deletedAtCondition = (() => {
    if (props.body.deleted_at_is_null === true) {
      return { deleted_at: null };
    }
    if (props.body.deleted_at_is_null === false) {
      return { deleted_at: { not: null } };
    }
    return undefined;
  })();
  const whereInput: Prisma.reddit_platform_post_engagement_statsWhereInput = {
    ...(deletedAtCondition !== undefined && deletedAtCondition),
    ...(props.body.post_id !== undefined && {
      post_id: props.body.post_id,
    }),
    ...(props.body.min_view_count !== undefined && {
      view_count: {
        gte: props.body.min_view_count,
      },
    }),
    ...(props.body.max_view_count !== undefined && {
      view_count: {
        lte: props.body.max_view_count,
      },
    }),
    ...(props.body.min_upvote_count !== undefined && {
      upvote_count: {
        gte: props.body.min_upvote_count,
      },
    }),
    ...(props.body.max_upvote_count !== undefined && {
      upvote_count: {
        lte: props.body.max_upvote_count,
      },
    }),
    ...(props.body.min_downvote_count !== undefined && {
      downvote_count: {
        gte: props.body.min_downvote_count,
      },
    }),
    ...(props.body.max_downvote_count !== undefined && {
      downvote_count: {
        lte: props.body.max_downvote_count,
      },
    }),
    ...(props.body.last_viewed_at_after !== undefined && {
      last_viewed_at: {
        gt: props.body.last_viewed_at_after,
      },
    }),
    ...(props.body.last_viewed_at_before !== undefined && {
      last_viewed_at: {
        lt: props.body.last_viewed_at_before,
      },
    }),
  };
  const sortField = props.body.sort ?? "last_viewed_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.reddit_platform_post_engagement_statsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_post_engagement_stats.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformPostEngagementStatAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_post_engagement_stats.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostEngagementStatAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
