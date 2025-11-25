import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSAnalyticsCommunityPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsCommunityPerformance";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityBBSModeratorAnalyticsCommunityPerformance(props: {
  moderator: ModeratorPayload;
  body: ICommunityBBSAnalyticsCommunityPerformance.IRequest;
}): Promise<ICommunityBBSAnalyticsCommunityPerformance> {
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  // Get total active subscribers for current and 30-day period
  const currentSubscriberCount =
    await MyGlobal.prisma.community_bbs_community_subscribers.count({
      where: {
        is_active: true,
        subscribed_at: {
          lte: now,
        },
      },
    });

  const subscriberCount30DaysAgo =
    await MyGlobal.prisma.community_bbs_community_subscribers.count({
      where: {
        is_active: true,
        subscribed_at: {
          lte: thirtyDaysAgo,
        },
      },
    });

  // Get total posts and comments created in 30-day window
  const totalPosts = await MyGlobal.prisma.community_bbs_posts.count({
    where: {
      deleted_at: null,
      created_at: {
        gte: thirtyDaysAgo,
      },
    },
  });

  const totalComments = await MyGlobal.prisma.community_bbs_comments.count({
    where: {
      deleted_at: null,
      created_at: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Get total votes (upvotes + downvotes) on posts and comments
  const totalPostVotes = await MyGlobal.prisma.community_bbs_post_votes.count({
    where: {
      deleted_at: null,
      created_at: {
        gte: thirtyDaysAgo,
      },
    },
  });

  const totalCommentVotes =
    await MyGlobal.prisma.community_bbs_comment_votes.count({
      where: {
        deleted_at: null,
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
    });

  const totalVotes = totalPostVotes + totalCommentVotes;

  // Get total content (posts + comments)
  const totalContent = totalPosts + totalComments;

  // Calculate content creation velocity (posts per hour)
  // Assuming 30-day window = 720 hours
  const contentCreationVelocity = totalPosts / 720;

  // Get total reports across supported entities in 30-day window
  const totalReports = await MyGlobal.prisma.community_bbs_reports.count({
    where: {
      created_at: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Calculate moderation activity level
  const moderationActivityLevel =
    totalContent > 0 ? totalReports / totalContent : 0;

  // Calculate ratios
  const subscriberGrowthRate =
    subscriberCount30DaysAgo > 0
      ? ((currentSubscriberCount - subscriberCount30DaysAgo) /
          subscriberCount30DaysAgo) *
        100
      : 0;
  const postToCommentRatio = totalComments > 0 ? totalPosts / totalComments : 0;
  const voteEngagementScore = totalContent > 0 ? totalVotes / totalContent : 0;

  // For seven_day_change and thirty_day_change, we'll need historical data which isn't available in basic schema
  // So we return 0 as default - production system would need precomputed analytics tables for trending
  const sevenDayChange = 0;
  const thirtyDayChange = 0;

  return {
    subscriber_growth_rate: subscriberGrowthRate, // number
    post_to_comment_ratio: postToCommentRatio, // number
    vote_engagement_score: voteEngagementScore, // number
    content_creation_velocity: contentCreationVelocity, // number
    moderation_activity_level: moderationActivityLevel, // number
    seven_day_change: sevenDayChange, // number
    thirty_day_change: thirtyDayChange, // number
  };
}
