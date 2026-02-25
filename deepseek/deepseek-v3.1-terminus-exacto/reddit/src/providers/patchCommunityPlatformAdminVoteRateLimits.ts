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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformVoteRateLimitAtSummaryTransformer } from "../transformers/CommunityPlatformVoteRateLimitAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminVoteRateLimits(props: {
  admin: AdminPayload;
  body: ICommunityPlatformVoteRateLimit.IRequest;
}): Promise<IPageICommunityPlatformVoteRateLimit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause based on request filters
  const whereInput = {
    deleted_at: null,
    ...(props.body.community_platform_user_id !== undefined &&
      props.body.community_platform_user_id !== null && {
        community_platform_user_id: props.body.community_platform_user_id,
      }),
    ...(props.body.entity_type !== undefined &&
      props.body.entity_type !== null && {
        entity_type: props.body.entity_type,
      }),
    ...(props.body.vote_type !== undefined &&
      props.body.vote_type !== null && { vote_type: props.body.vote_type }),
    ...(props.body.ip_address !== undefined &&
      props.body.ip_address !== null && { ip_address: props.body.ip_address }),
    ...(props.body.voted_at_start !== undefined &&
      props.body.voted_at_start !== null && {
        voted_at: {
          gte: new Date(props.body.voted_at_start),
        },
      }),
    ...(props.body.voted_at_end !== undefined &&
      props.body.voted_at_end !== null && {
        voted_at: {
          lte: new Date(props.body.voted_at_end),
        },
      }),
  } satisfies Prisma.community_platform_vote_rate_limitsWhereInput;
  // Execute queries
  const data =
    await MyGlobal.prisma.community_platform_vote_rate_limits.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { voted_at: "desc" as const },
      ...CommunityPlatformVoteRateLimitAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_vote_rate_limits.count(
    {
      where: whereInput,
    },
  );
  // Transform results
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
