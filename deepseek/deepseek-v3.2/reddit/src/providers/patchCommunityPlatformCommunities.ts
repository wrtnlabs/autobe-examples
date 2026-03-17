import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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

export async function patchCommunityPlatformCommunities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  // 1. Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 2. Build where conditions
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" as const } },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  } satisfies Prisma.community_platform_communitiesWhereInput;
  // 3. Build orderBy
  const orderByInput = (
    props.body.sort_by === "name"
      ? { name: props.body.sort_order ?? "asc" }
      : props.body.sort_by === "updated_at"
        ? { updated_at: props.body.sort_order ?? "desc" }
        : { created_at: props.body.sort_order ?? "desc" }
  ) satisfies Prisma.community_platform_communitiesOrderByWithRelationInput;
  // 4. Query data with pagination
  const data = await MyGlobal.prisma.community_platform_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformCommunityAtSummaryTransformer.select(),
  });
  // 5. Count total records
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where: whereInput,
  });
  // 6. Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityAtSummaryTransformer.transform,
  );
  // 7. Return paginated response
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
