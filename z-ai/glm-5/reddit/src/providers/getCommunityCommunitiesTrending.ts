import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityTrending } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityTrending";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityCommunitiesTrending(): Promise<ICommunityTrending> {
  // Calculate date 7 days ago for Prisma query
  // Prisma accepts Date objects for DateTime comparison internally
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  // Query subscriptions from last 7 days
  const subscriptions = await MyGlobal.prisma.community_subscriptions.findMany({
    where: {
      created_at: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      community_community_id: true,
    },
  });
  // Count growth per community
  const growthMap = new Map<string, number>();
  for (const sub of subscriptions) {
    const count = growthMap.get(sub.community_community_id) ?? 0;
    growthMap.set(sub.community_community_id, count + 1);
  }
  // Sort by growth descending and take top 5 community IDs
  const sortedCommunityIds = Array.from(growthMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  // If no trending communities, return empty array
  if (sortedCommunityIds.length === 0) {
    return { data: [] };
  }
  // Fetch community details with transformer select
  const communities = await MyGlobal.prisma.community_communities.findMany({
    where: {
      id: { in: sortedCommunityIds },
      deleted_at: null,
    },
    ...CommunityCommunityAtSummaryTransformer.select(),
  });
  // Create a map for quick lookup to preserve sort order
  const communityMap = new Map(communities.map((c) => [c.id, c]));
  // Transform results in the correct order (by growth ranking)
  const data: ICommunityCommunity.ISummary[] = [];
  for (const id of sortedCommunityIds) {
    const community = communityMap.get(id);
    if (community) {
      data.push(
        await CommunityCommunityAtSummaryTransformer.transform(community),
      );
    }
  }
  return { data };
}
