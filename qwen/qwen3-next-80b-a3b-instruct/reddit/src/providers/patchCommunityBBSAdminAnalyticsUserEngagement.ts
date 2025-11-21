import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSUserEngagementAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSUserEngagementAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityBBSAdminAnalyticsUserEngagement(props: {
  admin: AdminPayload;
  body: ICommunityBBSUserEngagementAnalytics.IRequest;
}): Promise<ICommunityBBSUserEngagementAnalytics> {
  // Type assertion to ensure body has the expected properties
  const body = props.body as unknown as {
    start_date?: string;
    end_date?: string;
    user_segment?: string;
    metrics_focus?: string;
  };

  // Handle missing values with default times
  const startDate = body.start_date ? new Date(body.start_date) : new Date();
  const endDate = body.end_date ? new Date(body.end_date) : new Date();

  // Use toISOStringSafe for consistent date formatting
  const safeStartDate = toISOStringSafe(startDate);
  const safeEndDate = toISOStringSafe(endDate);

  // Daily post volume - count of published posts
  const dailyPostVolume = await MyGlobal.prisma.community_bbs_posts.count({
    where: {
      created_at: {
        gte: safeStartDate,
        lte: safeEndDate,
      },
      status: "published",
      deleted_at: null,
    },
  });

  // Average comment depth - total comments divided by total posts
  const [totalComments, totalActivePosts] = await Promise.all([
    MyGlobal.prisma.community_bbs_comments.count({
      where: {
        created_at: {
          gte: safeStartDate,
          lte: safeEndDate,
        },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.community_bbs_posts.count({
      where: {
        created_at: {
          gte: safeStartDate,
          lte: safeEndDate,
        },
        status: "published",
        deleted_at: null,
      },
    }),
  ]);

  const averageCommentDepth =
    totalActivePosts > 0 ? totalComments / totalActivePosts : 0;

  // Karma growth rate - total karma changes divided by total karma events
  const [totalKarmaChange, totalKarmaEvents] = await Promise.all([
    MyGlobal.prisma.community_bbs_karma_history.aggregate({
      where: {
        created_at: {
          gte: safeStartDate,
          lte: safeEndDate,
        },
        deleted_at: null,
      },
      _sum: {
        change_amount: true,
      },
    }),
    MyGlobal.prisma.community_bbs_karma_history.count({
      where: {
        created_at: {
          gte: safeStartDate,
          lte: safeEndDate,
        },
        deleted_at: null,
      },
    }),
  ]);

  const karmaGrowthRate =
    totalKarmaEvents > 0 ? totalKarmaChange._sum.change_amount || 0 : 0;

  // Engagement tier breakdown - users with different activity levels
  const [newUsers, activeUsers, trustedUsers] = await Promise.all([
    MyGlobal.prisma.community_bbs_citizen.count({
      where: {
        created_at: {
          gte: safeStartDate,
          lte: safeEndDate,
        },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.community_bbs_citizen.count({
      where: {
        created_at: {
          gte: safeStartDate,
          lte: safeEndDate,
        },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.community_bbs_citizen.count({
      where: {
        created_at: {
          lte: safeStartDate,
        },
        deleted_at: null,
      },
    }),
  ]);

  // Total user activity distribution
  const [totalPosts, totalPostVotes, totalCommentVotes] = await Promise.all([
    MyGlobal.prisma.community_bbs_posts.count({
      where: {
        created_at: {
          gte: safeStartDate,
          lte: safeEndDate,
        },
        status: "published",
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.community_bbs_post_votes.count({
      where: {
        created_at: {
          gte: safeStartDate,
          lte: safeEndDate,
        },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.community_bbs_comment_votes.count({
      where: {
        created_at: {
          gte: safeStartDate,
          lte: safeEndDate,
        },
        deleted_at: null,
      },
    }),
  ]);

  // Return the analytics as a JSON string per ICommunityBBSUserEngagementAnalytics type
  return JSON.stringify({
    dailyPostVolume,
    averageCommentDepth,
    karmaGrowthRate,
    engagementTierBreakdown: {
      new: newUsers,
      active: activeUsers,
      trusted: trustedUsers,
    },
    activityDistribution: {
      totalPosts,
      totalPostVotes,
      totalCommentVotes,
    },
  });
}
