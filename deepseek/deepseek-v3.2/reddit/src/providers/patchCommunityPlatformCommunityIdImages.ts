import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityImageAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunityIdImages(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.IRequest;
}): Promise<IPageICommunityPlatformCommunityImage.ISummary> {
  // 1. Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
    });
  // 2. Build WHERE clause from request body
  const whereClause = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.active !== undefined && { active: props.body.active }),
    ...(props.body.minOrdering !== undefined && {
      ordering: { gte: props.body.minOrdering },
    }),
    ...(props.body.maxOrdering !== undefined && {
      ordering: { lte: props.body.maxOrdering },
    }),
    ...(props.body.search !== undefined && {
      filename: {
        contains: props.body.search,
      },
    }),
  } satisfies Prisma.community_platform_community_imagesWhereInput;
  // 3. Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Execute paginated query with transformer
  const data =
    await MyGlobal.prisma.community_platform_community_images.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: [{ ordering: "asc" }, { created_at: "desc" }],
      ...CommunityPlatformCommunityImageAtSummaryTransformer.select(),
    });
  // 5. Count total records for pagination
  const total = await MyGlobal.prisma.community_platform_community_images.count(
    {
      where: whereClause,
    },
  );
  // 6. Transform and assemble response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformCommunityImageAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
