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

export async function patchCommunityCommunities(props: {
  body: ICommunityCommunity.IRequest;
}): Promise<IPageICommunityCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause - filter soft-deleted communities
  const whereInput = {
    deleted_at: null,
    ...(props.body.query && props.body.query.length >= 2
      ? { name: { contains: props.body.query, mode: "insensitive" as const } }
      : {}),
  } satisfies Prisma.community_communitiesWhereInput;
  // Build order by clause
  const sort = props.body.sort ?? "subscriber_count";
  const orderByInput = (
    sort === "created_at"
      ? { created_at: "desc" as const }
      : { subscriber_count: "desc" as const }
  ) satisfies Prisma.community_communitiesOrderByWithRelationInput;
  // Execute queries sequentially (not Promise.all for Prisma best practice)
  const data = await MyGlobal.prisma.community_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
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
  };
}
