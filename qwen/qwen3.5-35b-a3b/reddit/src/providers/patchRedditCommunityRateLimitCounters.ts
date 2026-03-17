import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRateLimitCounter";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRateLimitCounter";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityRateLimitCounterAtSummaryTransformer } from "../transformers/RedditCommunityRateLimitCounterAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityRateLimitCounters(props: {
  body: IRedditCommunityRateLimitCounter.IRequest;
}): Promise<IPageIRedditCommunityRateLimitCounter.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.member_id !== undefined && {
      reddit_community_member_id: props.body.member_id,
    }),
    ...(props.body.endpoint !== undefined && {
      endpoint: { contains: props.body.endpoint, mode: "insensitive" as const },
    }),
    ...(props.body.request_count_min !== undefined && {
      request_count: { gte: props.body.request_count_min },
    }),
    ...(props.body.request_count_max !== undefined && {
      request_count: { lte: props.body.request_count_max },
    }),
    ...(props.body.window_start !== undefined && {
      window_start: props.body.window_start,
    }),
    ...(props.body.window_end !== undefined && {
      window_end: props.body.window_end,
    }),
  } satisfies Prisma.reddit_community_rate_limit_countersWhereInput;
  const orderByInput = (() => {
    if (props.body.sortBy === "request_count") {
      return {
        request_count: props.body.sortOrder === "asc" ? "asc" : "desc",
      } satisfies Prisma.reddit_community_rate_limit_countersOrderByWithRelationInput;
    }
    if (props.body.sortBy === "endpoint") {
      return {
        endpoint: props.body.sortOrder === "asc" ? "asc" : "desc",
      } satisfies Prisma.reddit_community_rate_limit_countersOrderByWithRelationInput;
    }
    return {
      window_start: props.body.sortOrder === "asc" ? "asc" : "desc",
    } satisfies Prisma.reddit_community_rate_limit_countersOrderByWithRelationInput;
  })();
  const data =
    await MyGlobal.prisma.reddit_community_rate_limit_counters.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditCommunityRateLimitCounterAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_community_rate_limit_counters.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityRateLimitCounterAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  };
}
