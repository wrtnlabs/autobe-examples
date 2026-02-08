import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserCommunitiesBrowse(props: {
  user: UserPayload;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  // Set default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Retrieve paginated community records ordered by creation date descending
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        created_at: true,
      },
    });
  // Count total communities for pagination metadata
  const total = await MyGlobal.prisma.community_platform_communities.count();
  // Retrieve subscriber counts grouped by community ID
  const subscriptionCounts =
    await MyGlobal.prisma.community_platform_community_subscriptions.groupBy({
      by: ["community_id"],
      _count: { community_id: true },
      where: {
        community_id: { in: communities.map((community) => community.id) },
      },
    });
  // Map community ID to subscriber count
  const subscriptionCountMap = new Map(
    subscriptionCounts.map(({ community_id, _count }) => [
      community_id,
      _count.community_id,
    ]),
  );
  // Map communities to summary data with subscriber counts
  const data = communities.map((community) => ({
    id: community.id,
    name: community.name,
    description:
      community.description === null ? undefined : community.description,
    icon_url: community.icon_url === null ? undefined : community.icon_url,
    subscriber_count: subscriptionCountMap.get(community.id) ?? 0,
    created_at: community.created_at,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
