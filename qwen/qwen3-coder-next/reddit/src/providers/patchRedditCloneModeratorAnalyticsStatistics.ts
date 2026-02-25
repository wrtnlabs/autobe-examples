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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorAnalyticsStatistics(props: {
  moderator: ModeratorPayload;
  body: IRedditCloneFeedConfig.IRequest;
}): Promise<IPageIRedditCloneFeedConfig.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // User statistics
  const membersCount = await MyGlobal.prisma.reddit_clone_members.count({
    where: { deleted_at: null },
  });
  const moderatorsCount = await MyGlobal.prisma.reddit_clone_moderators.count({
    where: { deleted_at: null },
  });
  const ownersCount = await MyGlobal.prisma.reddit_clone_owners.count({
    where: { deleted_at: null },
  });
  const totalUsers = membersCount + moderatorsCount + ownersCount;
  // Content statistics
  const postsCount = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where: { deleted_at: null },
  });
  const commentsCount =
    await MyGlobal.prisma.reddit_clone_content_comments.count({
      where: { deleted_at: null },
    });
  const postVotesCount =
    await MyGlobal.prisma.reddit_clone_content_post_votes.count();
  const commentVotesCount =
    await MyGlobal.prisma.reddit_clone_comment_votes.count();
  const votesPerPost =
    postsCount > 0 ? (postVotesCount + commentVotesCount) / postsCount : 0;
  const commentsPerPost = postsCount > 0 ? commentsCount / postsCount : 0;
  // Community statistics
  const communitiesCount =
    await MyGlobal.prisma.reddit_clone_communities.count();
  const subscriptionsCount =
    await MyGlobal.prisma.reddit_clone_content_subscriptions.count();
  // Moderation statistics
  const reportsTotal = await MyGlobal.prisma.reddit_clone_content_reports.count(
    { where: { deleted_at: null } },
  );
  const reportsPending =
    await MyGlobal.prisma.reddit_clone_content_reports.count({
      where: { status: "pending", deleted_at: null },
    });
  const reportsApproved =
    await MyGlobal.prisma.reddit_clone_content_report_resolutions.count({
      where: { action: "approve" },
    });
  const reportsDismissed =
    await MyGlobal.prisma.reddit_clone_content_report_resolutions.count({
      where: { action: "dismiss" },
    });
  const bansTotal = await MyGlobal.prisma.reddit_clone_ban_records.count();
  const activeBans = await MyGlobal.prisma.reddit_clone_ban_records.count({
    where: { is_active: true },
  });
  const moderationLogsCount =
    await MyGlobal.prisma.reddit_clone_moderation_logs.count();
  const resolutionRate =
    reportsTotal > 0 ? (reportsApproved + reportsDismissed) / reportsTotal : 0;
  // Karma statistics
  const karmaStats = await MyGlobal.prisma.reddit_clone_karmas.aggregate({
    _avg: { karma_score: true },
    _count: true,
    _min: { karma_score: true },
    _max: { karma_score: true },
  });
  const generatedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  return {
    data: [
      {
        users: {
          total: totalUsers,
          members: membersCount,
          moderators: moderatorsCount,
          owners: ownersCount,
          active_24h: 0,
          active_7d: 0,
          active_30d: 0,
        },
        content: {
          posts: postsCount,
          comments: commentsCount,
          votes: postVotesCount + commentVotesCount,
          votes_per_post: votesPerPost,
          comments_per_post: commentsPerPost,
        },
        communities: {
          total: communitiesCount,
          new_24h: 0,
          new_7d: 0,
          subscribers_total: subscriptionsCount,
        },
        moderation: {
          reports_total: reportsTotal,
          reports_pending: reportsPending,
          reports_approved: reportsApproved,
          reports_dismissed: reportsDismissed,
          resolution_rate: resolutionRate,
          bans_total: bansTotal,
          active_bans: activeBans,
          moderation_actions_total: moderationLogsCount,
        },
        karma: {
          average: karmaStats._avg.karma_score ?? 0,
          median: 0,
          min: karmaStats._min.karma_score ?? 0,
          max: karmaStats._max.karma_score ?? 0,
          users_with_karma: karmaStats._count,
        },
        generated_at: generatedAt,
      },
    ],
    pagination: {
      current: page,
      limit: limit,
      records: 1,
      pages: 1,
    },
  } satisfies IPageIRedditCloneFeedConfig.ISummary;
}
