import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformVoteKarmaImpactAtSummaryTransformer } from "../transformers/CommunityPlatformVoteKarmaImpactAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminVoteKarmaImpacts(props: {
  admin: AdminPayload;
  body: ICommunityPlatformVoteKarmaImpact.IRequest;
}): Promise<IPageICommunityPlatformVoteKarmaImpact.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.community_platform_vote_karma_impactsWhereInput = {};
  // Date range filtering with proper ISO string to Date conversion
  if (props.body.start_time || props.body.end_time) {
    whereInput.created_at = {};
    if (props.body.start_time) {
      whereInput.created_at.gte = new Date(props.body.start_time);
    }
    if (props.body.end_time) {
      whereInput.created_at.lte = new Date(props.body.end_time);
    }
  }
  // Metric categories filtering
  if (props.body.metric_categories && props.body.metric_categories.length > 0) {
    // For karma impact records, we can filter based on the presence of subtype records
    // to determine if they're from posts or comments
    const orConditions: Prisma.community_platform_vote_karma_impactsWhereInput[] =
      [];
    if (props.body.metric_categories.includes("karma_calculation")) {
      // Include all karma impacts since they're all karma-related
      orConditions.push({});
    }
    if (props.body.metric_categories.includes("transaction_times")) {
      // Include records that have either post or comment subtype
      orConditions.push({
        OR: [
          { postKarmaImpact: { isNot: null } },
          { commentKarmaImpact: { isNot: null } },
        ],
      });
    }
    if (orConditions.length > 0) {
      whereInput.AND = orConditions;
    }
  }
  // Execute paginated query
  const data =
    await MyGlobal.prisma.community_platform_vote_karma_impacts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformVoteKarmaImpactAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.community_platform_vote_karma_impacts.count({
      where: whereInput,
    });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformVoteKarmaImpactAtSummaryTransformer.transform,
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
