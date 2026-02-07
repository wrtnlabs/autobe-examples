import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
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

export async function getRedditPlatformUserDashboard(props: {
  user: UserPayload;
}): Promise<IRedditPlatformAdmin> {
  // 1. Get total user count
  const totalUsers = await MyGlobal.prisma.reddit_platform_users.count();
  // 2. Get active users (last 24 hours, 7 days, 30 days)
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const activeUsers24h = await MyGlobal.prisma.reddit_platform_users.count({
    where: {
      updated_at: {
        gte: last24Hours.toISOString().replace("Z", "+00:00"),
      },
    },
  });
  const activeUsers7d = await MyGlobal.prisma.reddit_platform_users.count({
    where: {
      updated_at: {
        gte: last7Days.toISOString().replace("Z", "+00:00"),
      },
    },
  });
  const activeUsers30d = await MyGlobal.prisma.reddit_platform_users.count({
    where: {
      updated_at: {
        gte: last30Days.toISOString().replace("Z", "+00:00"),
      },
    },
  });
  // 3. Get total posts and comments
  const totalPosts = await MyGlobal.prisma.reddit_platform_posts.count();
  const totalComments = await MyGlobal.prisma.reddit_platform_comments.count();
  // 4. Get total votes
  const totalPostVotes =
    await MyGlobal.prisma.reddit_platform_post_votes.count();
  const totalCommentVotes =
    await MyGlobal.prisma.reddit_platform_comment_votes.count();
  // 5. Get total communities and active communities
  const totalCommunities =
    await MyGlobal.prisma.reddit_platform_communities.count();
  const activeCommunities =
    await MyGlobal.prisma.reddit_platform_communities.count({
      where: {
        posts: {
          some: {
            created_at: {
              gte: last7Days.toISOString().replace("Z", "+00:00"),
            },
          },
        },
      },
    });
  // 6. Get pending reports
  const pendingReports = await MyGlobal.prisma.reddit_platform_reports.count({
    where: {
      status: "pending",
    },
  });
  // 7. Get moderation actions (approvals and dismissals)
  const moderationActions =
    await MyGlobal.prisma.reddit_platform_moderation_logs.count();
  // 8. Get popular content (posts with highest vote scores)
  const popularPosts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    take: 10,
    orderBy: {
      vote_score: "desc",
    },
    select: {
      id: true,
      title: true,
      vote_score: true,
      author: {
        select: {
          username: true,
        },
      },
    },
  });
  // 9. Get communities with most subscribers
  const popularCommunities =
    await MyGlobal.prisma.reddit_platform_communities.findMany({
      take: 10,
      orderBy: {
        subscriber_count: "desc",
      },
      select: {
        id: true,
        name: true,
        subscriber_count: true,
        owner: {
          select: {
            username: true,
          },
        },
      },
    });
  // 10. Get new users (current day, week, month)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const newUsersToday = await MyGlobal.prisma.reddit_platform_users.count({
    where: {
      created_at: {
        gte: today.toISOString().replace("Z", "+00:00"),
      },
    },
  });
  const newUsersThisWeek = await MyGlobal.prisma.reddit_platform_users.count({
    where: {
      created_at: {
        gte: currentWeekStart.toISOString().replace("Z", "+00:00"),
      },
    },
  });
  const newUsersThisMonth = await MyGlobal.prisma.reddit_platform_users.count({
    where: {
      created_at: {
        gte: currentMonthStart.toISOString().replace("Z", "+00:00"),
      },
    },
  });
  // Return consolidated statistics object
  return {
    // User Statistics
    userStatistics: {
      totalUsers,
      activeUsers: {
        last24Hours: activeUsers24h,
        last7Days: activeUsers7d,
        last30Days: activeUsers30d,
      },
      newUsers: {
        today: newUsersToday,
        thisWeek: newUsersThisWeek,
        thisMonth: newUsersThisMonth,
      },
    },
    // Content Statistics
    contentStatistics: {
      totalPosts,
      totalComments,
      postsAndCommentsTrends: {
        dailyPosts: 0, // Simplified - would need actual daily aggregation
        dailyComments: 0, // Simplified - would need actual daily aggregation
      },
    },
    // Engagement Metrics
    engagementMetrics: {
      totalVotes: totalPostVotes + totalCommentVotes,
      averageVotesPerPost: totalPosts > 0 ? totalPostVotes / totalPosts : 0,
      averageVotesPerComment:
        totalComments > 0 ? totalCommentVotes / totalComments : 0,
      popularContent: {
        topPosts: popularPosts.map((post) => ({
          postId: post.id,
          title: post.title,
          voteScore: post.vote_score,
          authorUsername: post.author?.username ?? "",
        })),
      },
    },
    // Community Statistics
    communityStatistics: {
      totalCommunities,
      activeCommunities,
      topCommunities: popularCommunities.map((comm) => ({
        communityId: comm.id,
        name: comm.name,
        subscriberCount: comm.subscriber_count,
        ownerUsername: comm.owner?.username ?? "",
      })),
    },
    // Moderation Metrics
    moderationMetrics: {
      pendingReports,
      moderationActions,
      banStatistics: {
        totalBans: 0, // Would need actual ban aggregation
        temporaryBans: 0, // Would need actual ban aggregation
        permanentBans: 0, // Would need actual ban aggregation
      },
    },
  };
}
