import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeDashboard";
import { IRedditLikeDashboardActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeDashboardActivity";
import { IRedditLikeDashboardEngagement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeDashboardEngagement";
import { IRedditLikeDashboardSubscriptionStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeDashboardSubscriptionStat";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeAdminDashboard(props: {
  admin: AdminPayload;
}): Promise<IRedditLikeDashboard> {
  const subscribedCommunities =
    await MyGlobal.prisma.reddit_like_subscriptions.findMany({
      where: {
        status: "subscribed",
        deleted_at: null,
      },
      select: {
        reddit_like_community_id: true,
        community: {
          select: {
            name: true,
            icon_url: true,
            _count: {
              select: {
                subscriptions: {
                  where: {
                    status: "subscribed",
                    deleted_at: null,
                  },
                },
              },
            },
          },
        },
      },
      distinct: ["reddit_like_community_id"],
    });
  const transformedSubscribedCommunities = subscribedCommunities.map(
    (sub) =>
      ({
        name: sub.community.name as string,
        icon_url: sub.community.icon_url,
        subscriber_count: sub.community._count.subscriptions,
      }) satisfies IRedditLikeCommunity.ISummary,
  );
  const recentActivityPosts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: {
      deleted_at: null,
    },
    take: 10,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      title: true,
      content: true,
      created_at: true,
      author_id: true,
      community_id: true,
    },
  });
  const transformedRecentActivityPosts = recentActivityPosts.map(
    (post) =>
      ({
        id: post.id,
        type: "activity" as const,
        activity_type: "post" as const,
        title: post.title,
        content: post.content ?? "",
        created_at: toISOStringSafe(post.created_at),
        author: {
          id: post.author_id,
          username: "",
          display_name: "",
          bio: "",
          avatar_url: "",
          karma_score: 0,
          created_at: toISOStringSafe(new Date()),
        } satisfies IRedditLikeMember.ISummary,
        community: {
          name: "",
          icon_url: "",
          subscriber_count: 0,
        } satisfies IRedditLikeCommunity.ISummary,
      }) satisfies IRedditLikeDashboardActivity.ISummary,
  );
  const recentActivityComments =
    await MyGlobal.prisma.reddit_like_comments.findMany({
      where: {
        deleted_at: null,
      },
      take: 10,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        content: true,
        created_at: true,
        post_id: true,
        author_id: true,
      },
    });
  const transformedRecentActivityComments = recentActivityComments.map(
    (comment) =>
      ({
        id: comment.id,
        type: "activity" as const,
        activity_type: "comment" as const,
        title: "",
        content: comment.content ?? "",
        created_at: toISOStringSafe(comment.created_at),
        author: {
          id: comment.author_id,
          username: "",
          display_name: "",
          bio: "",
          avatar_url: "",
          karma_score: 0,
          created_at: toISOStringSafe(new Date()),
        } satisfies IRedditLikeMember.ISummary,
        community: {
          name: "",
          icon_url: "",
          subscriber_count: 0,
        } satisfies IRedditLikeCommunity.ISummary,
      }) satisfies IRedditLikeDashboardActivity.ISummary,
  );
  const recentActivity = [
    ...transformedRecentActivityPosts,
    ...transformedRecentActivityComments,
  ];
  const engagementMetricsResult = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_like_post_votes.count({
      where: {
        value: 1,
      },
    }),
    MyGlobal.prisma.reddit_like_post_votes.count({
      where: {
        value: -1,
      },
    }),
    MyGlobal.prisma.reddit_like_comment_votes.count({
      where: {
        value: 1,
      },
    }),
    MyGlobal.prisma.reddit_like_comment_votes.count({
      where: {
        value: -1,
      },
    }),
  ]);
  const engagementMetrics = {
    upvote_count: engagementMetricsResult[0] + engagementMetricsResult[2],
    downvote_count: engagementMetricsResult[1] + engagementMetricsResult[3],
  } satisfies IRedditLikeDashboardEngagement.ISummary;
  const subscriptionStatsResult = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_like_subscriptions.count(),
    MyGlobal.prisma.reddit_like_subscriptions.count({
      where: {
        status: "subscribed",
        deleted_at: null,
      },
    }),
  ]);
  const subscriptionStats = {
    total_subscriptions: subscriptionStatsResult[0],
    subscribed_count: subscriptionStatsResult[1],
  } satisfies IRedditLikeDashboardSubscriptionStat.ISummary;
  return {
    subscribedCommunities: transformedSubscribedCommunities,
    recentActivity,
    engagementMetrics,
    subscriptionStats,
  } satisfies IRedditLikeDashboard;
}
