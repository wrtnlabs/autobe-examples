import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneGuestAnalyticsPostsNew(props: {
  guest: GuestPayload;
}): Promise<IRedditCloneContentPost.INewPost> {
  const now = new Date();
  const currentPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousPeriodStart = new Date(
    now.getFullYear(),
    now.getMonth() - 2,
    1,
  );
  const previousPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // Query posts with current period using Date objects for Prisma
  const currentPeriodPosts =
    await MyGlobal.prisma.reddit_clone_content_posts.findMany({
      where: {
        created_at: {
          gte: currentPeriodStart,
          lt: currentPeriodEnd,
        },
      },
    });
  // Query posts with previous period
  const previousPeriodPosts =
    await MyGlobal.prisma.reddit_clone_content_posts.findMany({
      where: {
        created_at: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd,
        },
      },
    });
  // Aggregate posts by community for current period
  const communityCounts = new Map<string, number>();
  for (const post of currentPeriodPosts) {
    communityCounts.set(
      post.community_id,
      (communityCounts.get(post.community_id) || 0) + 1,
    );
  }
  // Fetch community details
  const communityIds = Array.from(communityCounts.keys());
  const communities = await MyGlobal.prisma.reddit_clone_communities.findMany({
    where: {
      id: { in: communityIds },
    },
  });
  // Build posts by community array with proper type conversion
  const postsByCommunity: IRedditCloneContentPost.ICommunityPostCount[] =
    communityIds.map((communityId) => {
      const community = communities.find((c) => c.id === communityId);
      return {
        communityId: communityId as string & tags.Format<"uuid">,
        communityName: community?.name || "Unknown",
        postCount: communityCounts.get(communityId) || 0,
      };
    });
  // Calculate creation rate metrics
  const currentPeriodCount = currentPeriodPosts.length;
  const previousPeriodCount = previousPeriodPosts.length;
  const absoluteGrowth = currentPeriodCount - previousPeriodCount;
  const percentageChange =
    previousPeriodCount > 0 ? (absoluteGrowth / previousPeriodCount) * 100 : 0;
  const growthRate =
    previousPeriodCount > 0
      ? currentPeriodCount / previousPeriodCount
      : currentPeriodCount > 0
        ? Infinity
        : 0;
  // Build trends data with proper type
  let trendType: IRedditCloneContentPost.ITrend;
  if (absoluteGrowth > 0) {
    trendType = "increasing";
  } else if (absoluteGrowth < 0) {
    trendType = "decreasing";
  } else {
    trendType = "stable";
  }
  return {
    type: "new",
    period: {
      start_date: currentPeriodStart.toISOString() as string &
        tags.Format<"date-time">,
      end_date: currentPeriodEnd.toISOString() as string &
        tags.Format<"date-time">,
      comparison: `${previousPeriodStart.toISOString()}/${previousPeriodEnd.toISOString()}`,
    },
    totalPosts: currentPeriodCount,
    postsByCommunity: postsByCommunity,
    creationRate: {
      absolute_growth: absoluteGrowth,
      percentage_change: percentageChange,
      current_period_count: currentPeriodCount,
      previous_period_count: previousPeriodCount,
      growth_rate: growthRate,
    },
    trends: trendType,
  };
}
