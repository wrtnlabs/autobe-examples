import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityFlair";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityFlairAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityFlairAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunityIdFlairs(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlair.IRequest;
}): Promise<IPageICommunityPlatformCommunityFlair.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId, deleted_at: null },
    });
  if (!community) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const whereInput: Prisma.community_platform_community_flairsWhereInput = {
    deleted_at: null,
    community_platform_community_id: props.communityId,
  };
  // Add text search filter if search parameter provided
  if (props.body.search) {
    whereInput.display_text = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Add boolean filter for active status if provided
  if (props.body.isActive !== undefined) {
    whereInput.is_active = props.body.isActive;
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_flairs.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommunityFlairAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_community_flairs.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await Promise.all(
    data.map(CommunityPlatformCommunityFlairAtSummaryTransformer.transform),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
