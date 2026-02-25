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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorDashboards(props: {
  moderator: ModeratorPayload;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  // Default pagination parameters
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Find communities where this moderator is assigned
  const moderatorAssignments =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: {
        user_id: props.moderator.id, // Fixed: moderator_id → user_id
        deleted_at: null,
      },
      select: {
        community_id: true,
      },
    });
  const communityIds = moderatorAssignments.map(
    (assignment) => assignment.community_id,
  );
  if (communityIds.length === 0) {
    // Return empty page if moderator has no assigned communities
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
  // Fetch paginated communities
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: {
        id: { in: communityIds },
        deleted_at: null,
      },
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommunityAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where: {
      id: { in: communityIds },
      deleted_at: null,
    },
  });
  // Transform communities using the transformer
  const transformedData = await Promise.all(
    communities.map((community) =>
      CommunityPlatformCommunityAtSummaryTransformer.transform(community),
    ),
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
