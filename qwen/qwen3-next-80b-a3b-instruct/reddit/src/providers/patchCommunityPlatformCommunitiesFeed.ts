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

export async function patchCommunityPlatformCommunitiesFeed(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Define sort criteria based on request
  let orderBy: Prisma.community_platform_communitiesOrderByWithRelationInput;
  let where: Prisma.community_platform_communitiesWhereInput = {};
  switch (props.body.sort) {
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "top":
      orderBy = { subscriber_count: "desc" };
      break;
    case "hot":
      // 'hot' requires a score-based ranking combining recent activity and subscribers
      // Since we don't have activity metrics in schema, we'll use created_at and subscriber_count
      orderBy = {
        created_at: "desc",
        subscriber_count: "desc",
      };
      break;
    case "controversial":
      // 'controversial' requires high total votes but net score near zero
      // This is a complex metric that requires post-level data
      // Since we only have community-level data and no post/vote data in these schemas,
      // we'll treat 'controversial' as 'new' for now as per the schema constraints
      orderBy = { created_at: "desc" };
      break;
    default:
      orderBy = { created_at: "desc" };
  }
  // Query communities with required fields
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      skip,
      take: limit,
      orderBy: orderBy,
      where: where,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        created_at: true,
      },
    });
  // Get subscriber counts for these communities in a separate query
  const communityIds = communities.map((c) => c.id);
  const subscriberCounts =
    await MyGlobal.prisma.community_platform_community_subscriptions.groupBy({
      by: ["community_platform_community_id"],
      where: {
        community_platform_community_id: { in: communityIds },
      },
      _count: {
        community_platform_community_id: true,
      },
    });
  // Create a map of community_id to subscriber count
  const subscriberCountMap: Record<string, number> = {};
  subscriberCounts.forEach((count) => {
    subscriberCountMap[count.community_platform_community_id] =
      count._count.community_platform_community_id || 0;
  });
  // Transform to ISummary format with proper date formatting
  const data: ICommunityPlatformCommunity.ISummary[] = communities.map(
    (community) => ({
      name: community.name,
      description: community.description,
      icon: community.icon ? community.icon : "", // Convert null to empty string
      subscriber_count: subscriberCountMap[community.id] || 0,
      created_at: toISOStringSafe(community.created_at),
    }),
  );
  // Get total count for pagination
  const total = await MyGlobal.prisma.community_platform_communities.count();
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
