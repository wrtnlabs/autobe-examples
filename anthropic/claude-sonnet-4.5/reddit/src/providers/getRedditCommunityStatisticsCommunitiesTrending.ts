import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityTrendingStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingStatistics";
import { IRedditCommunityTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingCommunity";

export async function getRedditCommunityStatisticsCommunitiesTrending(): Promise<IRedditCommunityTrendingStatistics> {
  const trendingWindowHours = 48;
  const trendingWindowStart = new Date();
  trendingWindowStart.setHours(
    trendingWindowStart.getHours() - trendingWindowHours,
  );

  const communities =
    await MyGlobal.prisma.reddit_community_communities.findMany({
      where: {
        deleted_at: null,
      },
      include: {
        reddit_community_community_subscriptions: true,
      },
    });

  const communityIds = communities.map((c) => c.id);

  const [recentPostCounts, oldSubscriberCounts] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.groupBy({
      by: ["reddit_community_community_id"],
      where: {
        reddit_community_community_id: { in: communityIds },
        created_at: { gte: trendingWindowStart },
        deleted_at: null,
      },
      _count: { id: true },
    }),
    MyGlobal.prisma.reddit_community_community_subscriptions.groupBy({
      by: ["community_id"],
      where: {
        community_id: { in: communityIds },
        created_at: { lt: trendingWindowStart },
      },
      _count: { id: true },
    }),
  ]);

  const recentPostMap = new Map(
    recentPostCounts.map((r) => [
      r.reddit_community_community_id,
      typeof r._count === "object" ? (r._count.id ?? 0) : 0,
    ]),
  );
  const oldSubscriberMap = new Map(
    oldSubscriberCounts.map((r) => [
      r.community_id,
      typeof r._count === "object" ? (r._count.id ?? 0) : 0,
    ]),
  );

  const trendingCommunities = communities.map((community) => {
    const recentPostCount = recentPostMap.get(community.id) ?? 0;
    const subscriberCount =
      community.reddit_community_community_subscriptions.length;
    const oldSubscriberCount = oldSubscriberMap.get(community.id) ?? 0;

    const newSubscribers = subscriberCount - oldSubscriberCount;
    const growthRate =
      oldSubscriberCount > 0
        ? (newSubscribers / oldSubscriberCount) * 100
        : subscriberCount > 0
          ? 100
          : 0;

    const activityScore =
      recentPostCount * 10 + subscriberCount * 0.1 + growthRate * 2;

    return {
      community,
      recentPostCount,
      subscriberCount,
      growthRate,
      activityScore,
    };
  });

  const sortedTrending = trendingCommunities
    .filter((tc) => tc.activityScore > 0 || tc.recentPostCount > 0)
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, 25);

  return {
    data: sortedTrending.map((tc) => ({
      id: tc.community.id,
      name: tc.community.name,
      display_title: tc.community.display_title,
      description: tc.community.description,
      icon_url: tc.community.icon_url ?? undefined,
      banner_url: tc.community.banner_url ?? undefined,
      creator_member_id: tc.community.creator_member_id,
      subscriber_count: tc.subscriberCount,
      post_count: tc.community.post_count,
      growth_rate: tc.growthRate,
      recent_post_count: tc.recentPostCount,
      activity_score: tc.activityScore,
      created_at: toISOStringSafe(tc.community.created_at),
      updated_at: toISOStringSafe(tc.community.updated_at),
      deleted_at: tc.community.deleted_at
        ? toISOStringSafe(tc.community.deleted_at)
        : undefined,
    })),
  };
}
