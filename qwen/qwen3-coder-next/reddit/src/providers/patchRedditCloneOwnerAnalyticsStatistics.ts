import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFeedConfig";
import { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneOwnerAnalyticsStatistics(props: {
  owner: OwnerPayload;
  body: IRedditCloneFeedConfig.IRequest;
}): Promise<IPageIRedditCloneFeedConfig.ISummary> {
  const { sort, timeFilter, page = 1, limit = 100 } = props.body;
  // Calculate date ranges for active user statistics
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // User statistics
  const [membersCount, moderatorsCount, ownersCount] = await Promise.all([
    MyGlobal.prisma.reddit_clone_members.count({ where: { deleted_at: null } }),
    MyGlobal.prisma.reddit_clone_moderators.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.reddit_clone_owners.count({ where: { deleted_at: null } }),
  ]);
  // Active user counts
  const active24h = await MyGlobal.prisma.reddit_clone_member_sessions.count({
    where: {
      active: true,
      created_at: { gte: dayAgo },
    },
  });
  const active7d = await MyGlobal.prisma.reddit_clone_member_sessions.count({
    where: {
      active: true,
      created_at: { gte: weekAgo },
    },
  });
  const active30d = await MyGlobal.prisma.reddit_clone_member_sessions.count({
    where: {
      active: true,
      created_at: { gte: monthAgo },
    },
  });
  // Content statistics
  const [postsCount, commentsCount, postVotesCount, commentVotesCount] =
    await Promise.all([
      MyGlobal.prisma.reddit_clone_content_posts.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.reddit_clone_content_comments.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.reddit_clone_content_post_votes.count(),
      MyGlobal.prisma.reddit_clone_comment_votes.count(),
    ]);
  const votesPerPost =
    postsCount > 0 ? (postVotesCount / postsCount).toFixed(2) : "0";
  const commentsPerPost =
    postsCount > 0 ? (commentsCount / postsCount).toFixed(2) : "0";
  // Community statistics
  const [communitiesCount, subscriptionsCount] = await Promise.all([
    MyGlobal.prisma.reddit_clone_communities.count(),
    MyGlobal.prisma.reddit_clone_content_subscriptions.count(),
  ]);
  const new24h = await MyGlobal.prisma.reddit_clone_communities.count({
    where: { created_at: { gte: dayAgo } },
  });
  const new7d = await MyGlobal.prisma.reddit_clone_communities.count({
    where: { created_at: { gte: weekAgo } },
  });
  // Moderation statistics
  const [reportsTotal, reportsPending, reportsApproved, reportsDismissed] =
    await Promise.all([
      MyGlobal.prisma.reddit_clone_content_reports.count(),
      MyGlobal.prisma.reddit_clone_content_reports.count({
        where: { status: "pending" },
      }),
      MyGlobal.prisma.reddit_clone_content_reports.count({
        where: { status: "approved" },
      }),
      MyGlobal.prisma.reddit_clone_content_reports.count({
        where: { status: "dismissed" },
      }),
    ]);
  const resolutionRate =
    reportsTotal > 0
      ? (((reportsApproved + reportsDismissed) / reportsTotal) * 100).toFixed(2)
      : "0";
  const [bansTotal, activeBans] = await Promise.all([
    MyGlobal.prisma.reddit_clone_ban_records.count(),
    MyGlobal.prisma.reddit_clone_ban_records.count({
      where: { is_active: true },
    }),
  ]);
  const moderationActionsTotal =
    await MyGlobal.prisma.reddit_clone_moderation_logs.count();
  // Karma statistics
  const karmaStats = await MyGlobal.prisma.reddit_clone_karmas.aggregate({
    _avg: { karma_score: true },
    _count: true,
  });
  const { _count, _avg } = karmaStats;
  const averageKarma = _count > 0 ? (_avg?.karma_score ?? 0) : 0;
  return {
    data: [
      {
        users: {
          total: membersCount + moderatorsCount + ownersCount,
          members: membersCount,
          moderators: moderatorsCount,
          owners: ownersCount,
          active_24h: active24h,
          active_7d: active7d,
          active_30d: active30d,
        },
        content: {
          posts: postsCount,
          comments: commentsCount,
          votes: postVotesCount + commentVotesCount,
          votes_per_post: parseFloat(votesPerPost),
          comments_per_post: parseFloat(commentsPerPost),
        },
        communities: {
          total: communitiesCount,
          new_24h: new24h,
          new_7d: new7d,
          subscribers_total: subscriptionsCount,
        },
        moderation: {
          reports_total: reportsTotal,
          reports_pending: reportsPending,
          reports_approved: reportsApproved,
          reports_dismissed: reportsDismissed,
          resolution_rate: parseFloat(resolutionRate),
          bans_total: bansTotal,
          active_bans: activeBans,
          moderation_actions_total: moderationActionsTotal,
        },
        karma: {
          average: averageKarma,
          median: 0, // Would require complex percentile calculation
          min: 0, // Placeholder - would need min aggregation
          max: 0, // Placeholder - would need max aggregation
          users_with_karma: _count,
        },
        generated_at: toISOStringSafe(now),
      },
    ],
    pagination: {
      current: page,
      limit: limit,
      records: 1,
      pages: 1,
    },
  };
}
