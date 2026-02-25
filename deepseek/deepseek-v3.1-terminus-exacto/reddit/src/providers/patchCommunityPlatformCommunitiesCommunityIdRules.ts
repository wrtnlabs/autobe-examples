import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityRuleAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityRuleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunityIdRules(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IRequest;
}): Promise<IPageICommunityPlatformCommunityRule.ISummary> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate pagination bounds
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  // Build WHERE clause
  const whereInput = {
    community_platform_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search && {
      rule_text: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
  } satisfies Prisma.community_platform_community_rulesWhereInput;
  // Get paginated data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_rules.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { rule_order: "asc" as const },
      ...CommunityPlatformCommunityRuleAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_community_rules.count({
      where: whereInput,
    }),
  ]);
  // Transform data using ArrayUtil.asyncMap
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityRuleAtSummaryTransformer.transform,
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
