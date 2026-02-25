import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesBrowse(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build search filter
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
  } satisfies Prisma.community_platform_communitiesWhereInput;
  // Build sorting - handle subscriber_count sorting with proper join
  const orderByInput = (
    props.body.sort === "subscriber_count"
      ? { statistic: { subscriber_count: "desc" as const } }
      : props.body.sort === "created_at"
        ? { created_at: "desc" as const }
        : props.body.sort === "name"
          ? { name: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.community_platform_communitiesOrderByWithRelationInput;
  // Get the base select from transformer
  const baseSelect = CommunityPlatformCommunityAtSummaryTransformer.select();
  // Merge statistic selection into the base select
  const selectWithStatistic = {
    ...baseSelect.select,
    statistic: {
      select: { subscriber_count: true },
    },
  };
  // Get paginated communities using merged select
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: selectWithStatistic,
    }),
    MyGlobal.prisma.community_platform_communities.count({
      where: whereInput,
    }),
  ]);
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityAtSummaryTransformer.transform,
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
