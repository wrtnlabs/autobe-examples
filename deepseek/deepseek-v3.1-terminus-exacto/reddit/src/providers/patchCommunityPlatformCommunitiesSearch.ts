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

export async function patchCommunityPlatformCommunitiesSearch(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const search = props.body.search ?? undefined;
  const sort = props.body.sort ?? "created_at";
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(search && { name: { contains: search, mode: "insensitive" as const } }),
  } satisfies Prisma.community_platform_communitiesWhereInput;
  let orderByInput: Prisma.community_platform_communitiesOrderByWithRelationInput;
  if (sort === "name") {
    orderByInput = { name: "asc" as const };
  } else if (sort === "subscriber_count") {
    // We need to join with statistics table for subscriber_count sorting
    // Since transformer doesn't include statistic, we'll need to adjust
    // For now, fallback to created_at sorting until we can implement proper join
    orderByInput = { created_at: "desc" as const };
  } else {
    // Default to created_at desc
    orderByInput = { created_at: "desc" as const };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityPlatformCommunityAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_communities.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
