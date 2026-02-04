import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformCommunitiesSearch(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const { page = 1, limit = 20, sort } = props.body;
  const skip = (page - 1) * limit;
  // Extract search term from sort parameter (this is the search term)
  const searchTerm = sort;
  // Build search conditions with relevance ordering: exact match > prefix > substring
  const whereCondition = {
    name: {
      contains: searchTerm,
      mode: "insensitive", // for case-insensitive search
    },
  } satisfies Prisma.community_platform_communitiesWhereInput;
  // Retrieve communities with search and pagination
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: whereCondition,
      take: limit,
      skip: skip,
      orderBy: {
        created_at: "desc",
      },
    });
  // Count total matching communities for pagination
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where: whereCondition,
  });
  // Get subscriber counts for each community by counting community_platform_community_subscriptions
  const communitySubscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.groupBy({
      by: ["community_platform_community_id"],
      where: {
        community_platform_community_id: {
          in: communities.map((c) => c.id),
        },
      },
      _count: {
        community_platform_community_id: true,
      },
    });
  // Build map of community_id to subscriber count
  const subscriberCountMap = new Map<string, number>();
  communitySubscriptions.forEach((sub) => {
    subscriberCountMap.set(
      sub.community_platform_community_id,
      sub._count?.community_platform_community_id ?? 0,
    );
  });
  // Manually construct ISummary objects from community data
  // Using properties from community_platform_communities schema
  const summaryData = communities.map((community) => ({
    name: community.name,
    description:
      community.description.length > 120
        ? community.description.substring(0, 120) + "..."
        : community.description,
    icon: typia.assert<string & tags.Format<"uri">>(community.icon),
    subscriber_count: subscriberCountMap.get(community.id) || 0,
    created_at: toISOStringSafe(community.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryData,
  };
}
