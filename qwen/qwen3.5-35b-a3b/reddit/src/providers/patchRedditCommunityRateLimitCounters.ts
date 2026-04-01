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
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * safeLimit;
  const whereInput: Prisma.reddit_community_rate_limit_countersWhereInput = {
    deleted_at: null,
    ...(props.body.member_id !== undefined && {
      reddit_community_member_id: props.body.member_id,
    }),
    ...(props.body.endpoint !== undefined && {
      endpoint: {
        contains: props.body.endpoint,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.request_count_min !== undefined && {
      request_count: {
        gte: props.body.request_count_min,
      },
    }),
    ...(props.body.request_count_max !== undefined && {
      request_count: {
        lte: props.body.request_count_max,
      },
    }),
    ...(props.body.window_start !== undefined && {
      window_start: props.body.window_start,
    }),
    ...(props.body.window_end !== undefined && {
      window_end: props.body.window_end,
    }),
  } satisfies Prisma.reddit_community_rate_limit_countersWhereInput;
  const orderByInput = (
    props.body.sortBy === "request_count"
      ? [{ request_count: props.body.sortOrder ?? ("desc" as "asc" | "desc") }]
      : props.body.sortBy === "endpoint"
        ? [{ endpoint: props.body.sortOrder ?? ("asc" as "asc" | "desc") }]
        : [{ window_start: props.body.sortOrder ?? ("desc" as "asc" | "desc") }]
  ) satisfies Prisma.reddit_community_rate_limit_countersOrderByWithRelationInput[];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_rate_limit_counters.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: safeLimit,
      ...RedditCommunityRateLimitCounterAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_rate_limit_counters.count({
      where: whereInput,
    }),
  ]);
  const pagination: IPage.IPagination = {
    current: page,
    limit: safeLimit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / safeLimit),
  } satisfies IPage.IPagination;
  return {
    pagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityRateLimitCounterAtSummaryTransformer.transform,
    ),
  };
}
