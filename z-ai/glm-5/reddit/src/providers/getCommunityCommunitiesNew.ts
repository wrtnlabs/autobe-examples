import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommunityAtSummaryTransformer } from "../transformers/CommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityCommunitiesNew(): Promise<IPageICommunityCommunity.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Calculate 30 days ago threshold for Prisma query
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const whereClause = {
    deleted_at: null,
    created_at: { gte: thirtyDaysAgo },
  } satisfies Prisma.community_communitiesWhereInput;
  const data = await MyGlobal.prisma.community_communities.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...CommunityCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_communities.count({
    where: whereClause,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityCommunityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
