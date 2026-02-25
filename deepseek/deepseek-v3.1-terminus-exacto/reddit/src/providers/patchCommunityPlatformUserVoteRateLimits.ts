import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteRateLimit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformVoteRateLimitAtSummaryTransformer } from "../transformers/CommunityPlatformVoteRateLimitAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserVoteRateLimits(props: {
  user: UserPayload;
  body: ICommunityPlatformVoteRateLimit.IRequest;
}): Promise<IPageICommunityPlatformVoteRateLimit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Handle nullable date parameters with proper type checking
  const votedAtStart =
    props.body.voted_at_start !== null &&
    props.body.voted_at_start !== undefined
      ? new Date(props.body.voted_at_start)
      : undefined;
  const votedAtEnd =
    props.body.voted_at_end !== null && props.body.voted_at_end !== undefined
      ? new Date(props.body.voted_at_end)
      : undefined;
  // Build WHERE conditions with proper null handling for Prisma types
  const whereInput: Prisma.community_platform_vote_rate_limitsWhereInput = {
    deleted_at: null,
    ...(props.body.community_platform_user_id !== null &&
      props.body.community_platform_user_id !== undefined && {
        community_platform_user_id: props.body
          .community_platform_user_id satisfies string as string,
      }),
    ...(props.body.entity_type !== undefined &&
      props.body.entity_type !== null && {
        entity_type: props.body.entity_type,
      }),
    ...(props.body.vote_type !== undefined &&
      props.body.vote_type !== null && {
        vote_type: props.body.vote_type,
      }),
    ...(props.body.ip_address !== null &&
      props.body.ip_address !== undefined && {
        ip_address: props.body.ip_address satisfies string as string,
      }),
    ...(votedAtStart &&
      votedAtEnd && {
        voted_at: {
          gte: votedAtStart,
          lte: votedAtEnd,
        },
      }),
    ...(votedAtStart &&
      !votedAtEnd && {
        voted_at: {
          gte: votedAtStart,
        },
      }),
    ...(!votedAtStart &&
      votedAtEnd && {
        voted_at: {
          lte: votedAtEnd,
        },
      }),
  };
  // Execute queries in parallel for better performance
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_vote_rate_limits.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { voted_at: "desc" },
      ...CommunityPlatformVoteRateLimitAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_vote_rate_limits.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformVoteRateLimitAtSummaryTransformer.transform,
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
