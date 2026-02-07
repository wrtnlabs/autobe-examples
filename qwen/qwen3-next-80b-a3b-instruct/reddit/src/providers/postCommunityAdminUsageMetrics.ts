import { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postCommunityAdminUsageMetrics(props: {
  admin: AdminPayload;
  body: ICommunityUsageMetric.ICreate;
}): Promise<ICommunityUsageMetric> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Use transaction for atomicity
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Calculate totals (must use separate await for each)
    const totalAdmins = await prisma.community_admins.count({
      where: { deleted_at: null },
    });
    const totalMembers = await prisma.community_members.count({
      where: { deleted_at: null },
    });
    const totalModerators = await prisma.community_moderators.count({
      where: { deleted_at: null },
    });
    const totalGuests = await prisma.community_guests.count();
    const totalUsers =
      totalAdmins + totalMembers + totalModerators + totalGuests;
    const activeAdminSessions = await prisma.community_admin_sessions.count({
      where: { expired_at: { gt: now } },
    });
    const activeMemberSessions = await prisma.community_member_sessions.count({
      where: { expired_at: { gt: now } },
    });
    const activeModeratorSessions =
      await prisma.community_moderator_sessions.count({
        where: { expired_at: { gt: now } },
      });
    const activeGuestSessions = await prisma.community_guest_sessions.count({
      where: { expired_at: { gt: now } },
    });
    const activeSessions =
      activeAdminSessions +
      activeMemberSessions +
      activeModeratorSessions +
      activeGuestSessions;
    const postsCreated = await prisma.community_posts.count({
      where: { created_at: { gte: oneHourAgo } },
    });
    const commentsCreated = await prisma.community_comments.count({
      where: { created_at: { gte: oneHourAgo } },
    });
    const votesCast =
      (await prisma.community_post_votes.count({
        where: { created_at: { gte: oneHourAgo } },
      })) +
      (await prisma.community_comment_votes.count({
        where: { created_at: { gte: oneHourAgo } },
      }));
    const communitiesCreated = await prisma.community_communities.count({
      where: { created_at: { gte: oneHourAgo } },
    });
    const reportsSubmitted = await prisma.community_reports.count({
      where: { created_at: { gte: oneHourAgo } },
    });
    // 24-hour aggregates for averages
    const postsIn24Hours = await prisma.community_posts.count({
      where: { created_at: { gte: twentyFourHoursAgo } },
    });
    const commentsIn24Hours = await prisma.community_comments.count({
      where: { created_at: { gte: twentyFourHoursAgo } },
    });
    const postVotesIn24Hours = await prisma.community_post_votes.count({
      where: { created_at: { gte: twentyFourHoursAgo } },
    });
    const commentVotesIn24Hours = await prisma.community_comment_votes.count({
      where: { created_at: { gte: twentyFourHoursAgo } },
    });
    const totalActiveUsers = totalAdmins + totalMembers + totalModerators; // Only active users count (not guests)
    // Calculate total session duration in minutes from created_at and expired_at
    // Query all active sessions at once for better performance
    const [adminSessions, memberSessions, moderatorSessions, guestSessions] =
      await Promise.all([
        prisma.community_admin_sessions.findMany({
          where: { expired_at: { gt: now } },
          select: { created_at: true, expired_at: true },
        }),
        prisma.community_member_sessions.findMany({
          where: { expired_at: { gt: now } },
          select: { created_at: true, expired_at: true },
        }),
        prisma.community_moderator_sessions.findMany({
          where: { expired_at: { gt: now } },
          select: { created_at: true, expired_at: true },
        }),
        prisma.community_guest_sessions.findMany({
          where: { expired_at: { gt: now } },
          select: { created_at: true, expired_at: true },
        }),
      ]);
    const allActiveSessions = [
      ...adminSessions,
      ...memberSessions,
      ...moderatorSessions,
      ...guestSessions,
    ];
    const totalSessionDuration = allActiveSessions.reduce((sum, session) => {
      const durationMs =
        session.expired_at.getTime() - session.created_at.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      return sum + durationMinutes;
    }, 0);
    const activeCommunityCount = await prisma.community_posts.aggregate({
      _count: { _all: true },
      where: { created_at: { gte: twentyFourHoursAgo } },
    });
    // Calculate averages with zero division protection
    const avgPostsPerUser =
      totalActiveUsers > 0 ? postsIn24Hours / totalActiveUsers : 0;
    const avgCommentsPerUser =
      totalActiveUsers > 0 ? commentsIn24Hours / totalActiveUsers : 0;
    const avgVotesPerPost =
      postsCreated > 0 ? postVotesIn24Hours / postsCreated : 0;
    const avgVotesPerComment =
      commentsCreated > 0 ? commentVotesIn24Hours / commentsCreated : 0;
    const avgSessionDuration =
      activeSessions > 0 ? totalSessionDuration / activeSessions : 0;
    // For active communities, count distinct communities that have posts/comments in last 24 hours
    const distinctActiveCommunities = await prisma.community_posts.aggregate({
      _count: {
        community_id: true,
      },
      where: {
        created_at: { gte: twentyFourHoursAgo },
        deleted_at: null,
      },
    });
    const actualActiveCommunityCount =
      distinctActiveCommunities._count.community_id || 0;
    // Create the usage metric record
    const metric = await prisma.community_usage_metrics.create({
      data: {
        id: v4(),
        timestamp: toISOStringSafe(now),
        total_users: totalUsers,
        active_sessions: activeSessions,
        posts_created: postsCreated,
        comments_created: commentsCreated,
        votes_cast: votesCast,
        communities_created: communitiesCreated,
        reports_submitted: reportsSubmitted,
        avg_posts_per_user: avgPostsPerUser,
        avg_comments_per_user: avgCommentsPerUser,
        avg_votes_per_post: avgVotesPerPost,
        avg_votes_per_comment: avgVotesPerComment,
        avg_session_duration: avgSessionDuration,
        active_community_count: actualActiveCommunityCount,
      },
    });
    return metric;
  });
  return {
    id: result.id,
    timestamp: result.timestamp,
    total_users: result.total_users,
    active_sessions: result.active_sessions,
    posts_created: result.posts_created,
    comments_created: result.comments_created,
    votes_cast: result.votes_cast,
    communities_created: result.communities_created,
    reports_submitted: result.reports_submitted,
    avg_posts_per_user: result.avg_posts_per_user,
    avg_comments_per_user: result.avg_comments_per_user,
    avg_votes_per_post: result.avg_votes_per_post,
    avg_votes_per_comment: result.avg_votes_per_comment,
    avg_session_duration: result.avg_session_duration,
    active_community_count: result.active_community_count,
  };
}
