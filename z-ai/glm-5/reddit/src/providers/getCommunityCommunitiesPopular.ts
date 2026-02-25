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

export async function getCommunityCommunitiesPopular(): Promise<IPageICommunityCommunity.ISummary> {
  const limit = 10;
  const page = 1;
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.community_communitiesWhereInput;
  const data = await MyGlobal.prisma.community_communities.findMany({
    where: whereInput,
    take: limit,
    orderBy: [{ subscriber_count: "desc" }, { created_at: "asc" }],
    ...CommunityCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_communities.count({
    where: whereInput,
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
  } satisfies IPageICommunityCommunity.ISummary;
}
