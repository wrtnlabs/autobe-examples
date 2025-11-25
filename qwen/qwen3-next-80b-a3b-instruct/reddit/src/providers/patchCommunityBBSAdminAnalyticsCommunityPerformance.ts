import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSAnalyticsCommunityPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsCommunityPerformance";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityBBSAdminAnalyticsCommunityPerformance(props: {
  admin: AdminPayload;
  body: ICommunityBBSAnalyticsCommunityPerformance.IRequest;
}): Promise<ICommunityBBSAnalyticsCommunityPerformance> {
  // Define time window defaults: last 30 days
  const now = toISOStringSafe(new Date());
  const thirtyDaysAgo = toISOStringSafe(
    new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
  );
  const sevenDaysAgo = toISOStringSafe(
    new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
  );

  // Parse body as JSON since it's a string representation of an object
  const filter: any = props.body ? JSON.parse(props.body) : {};

  // Use body filter if provided, otherwise use default date range
  const fromDate = filter.from_date || thirtyDaysAgo;
  const toDate = filter.to_date || now;

  // Build citizen filter based on karma if provided
  const citizenIds: string[] = [];
  if (filter.min_karma !== undefined || filter.max_karma !== undefined) {
    const karmaFilter: any = {};
    if (filter.min_karma !== undefined) {
      karmaFilter.score = { gte: filter.min_karma };
    }
    if (filter.max_karma !== undefined) {
      karmaFilter.score = { lte: filter.max_karma };
    }
    const citizensWithKarma =
      await MyGlobal.prisma.community_bbs_user_karma_summary.findMany({
        where: karmaFilter,
        select: { citizen_id: true },
      });
    citizenIds.push(...citizensWithKarma.map((c) => c.citizen_id));
  }

  // Establish community filter via citizen subscriptions or direct community
  const communityIds: string[] = [];
  if (citizenIds.length > 0) {
    const communitiesOfCitizens =
      await MyGlobal.prisma.community_bbs_community_subscribers.findMany({
        where: {
          citizen_id: { in: citizenIds },
        },
        select: { community_id: true },
      });
    communityIds.push(...communitiesOfCitizens.map((c) => c.community_id));
  }

  const communityFilter =
    communityIds.length > 0 ? { id: { in: communityIds } } : {};

  // Retrieve all post_ids that belong to the filtered communities
  let postIds: string[] = [];
  if (communityFilter.id?.in && communityFilter.id.in.length > 0) {
    const posts = await MyGlobal.prisma.community_bbs_posts.findMany({
      where: { community_id: { in: communityFilter.id.in } },
      select: { id: true },
    });
    postIds = posts.map((p) => p.id);
  }

  // Retrieve all comment_ids that belong to posts in the filtered communities
  let commentIds: string[] = [];
  if (postIds.length > 0) {
    const comments = await MyGlobal.prisma.community_bbs_comments.findMany({
      where: { post_id: { in: postIds } },
      select: { id: true },
    });
    commentIds = comments.map((c) => c.id);
  }

  // Aggregations for current window (from_date to to_date)
  const [
    totalSubscribers,
    totalPosts,
    totalComments,
    totalPostVotes,
    totalCommentVotes,
    totalReportsOnPosts,
    totalReportsOnComments,
    totalCommunities,
  ] = await Promise.all([
    MyGlobal.prisma.community_bbs_community_subscribers.count({
      where: {
        subscribed_at: { gte: fromDate, lte: toDate },
        is_active: true,
        community: communityFilter,
      },
    }),
    MyGlobal.prisma.community_bbs_posts.count({
      where: {
        created_at: { gte: fromDate, lte: toDate },
        deleted_at: null,
        community: communityFilter,
      },
    }),
    MyGlobal.prisma.community_bbs_comments.count({
      where: {
        created_at: { gte: fromDate, lte: toDate },
        deleted_at: null,
        post: {
          community: communityFilter,
        },
      },
    }),
    MyGlobal.prisma.community_bbs_post_votes.count({
      where: {
        created_at: { gte: fromDate, lte: toDate },
        deleted_at: null,
        community_bbs_post_id: postIds.length > 0 ? { in: postIds } : {},
      },
    }),
    MyGlobal.prisma.community_bbs_comment_votes.count({
      where: {
        created_at: { gte: fromDate, lte: toDate },
        deleted_at: null,
        community_bbs_comment_id:
          commentIds.length > 0 ? { in: commentIds } : {},
      },
    }),
    MyGlobal.prisma.community_bbs_reported_posts.count({
      where: {
        created_at: { gte: fromDate, lte: toDate },
      },
    }),
    MyGlobal.prisma.community_bbs_reported_comments.count({
      where: {
        created_at: { gte: fromDate, lte: toDate },
      },
    }),
    MyGlobal.prisma.community_bbs_communities.count({
      where: communityFilter,
    }),
  ]);

  // Total reports = reports on posts + reports on comments
  const totalReports = totalReportsOnPosts + totalReportsOnComments;

  // Calculate key analytics
  // Subscriber growth rate: percentage increase over last 30 days (comparing current to 30-day-back)
  const [currentSubscribers, previousSubscribers] = await Promise.all([
    MyGlobal.prisma.community_bbs_community_subscribers.count({
      where: {
        subscribed_at: { gte: fromDate, lte: toDate },
        is_active: true,
        community: communityFilter,
      },
    }),
    MyGlobal.prisma.community_bbs_community_subscribers.count({
      where: {
        subscribed_at: {
          gte: toISOStringSafe(
            new Date(new Date(fromDate).getTime() - 30 * 24 * 60 * 60 * 1000),
          ),
          lte: fromDate,
        },
        is_active: true,
        community: communityFilter,
      },
    }),
  ]);
  const subscriberGrowthRate =
    previousSubscribers > 0
      ? ((currentSubscribers - previousSubscribers) / previousSubscribers) * 100
      : 0;

  // Post-to-comment ratio
  const postToCommentRatio = totalPosts > 0 ? totalComments / totalPosts : 0;

  // Vote engagement score: total votes divided by total content items (posts + comments)
  const voteEngagementScore =
    totalPosts + totalComments > 0
      ? (totalPostVotes + totalCommentVotes) / (totalPosts + totalComments)
      : 0;

  // Content creation velocity: posts per day
  const timeDiffDays =
    (new Date(toDate).getTime() - new Date(fromDate).getTime()) /
    (24 * 60 * 60 * 1000);
  const contentCreationVelocity =
    timeDiffDays > 0 ? totalPosts / timeDiffDays : 0;

  // Moderation activity level: reports per content item
  const moderationActivityLevel =
    totalPosts + totalComments > 0
      ? totalReports / (totalPosts + totalComments)
      : 0;

  // Calculate 7-day change (comparison with previous 7-day window)
  const weekAgo = toISOStringSafe(
    new Date(new Date(fromDate).getTime() - 7 * 24 * 60 * 60 * 1000),
  );
  const [
    prevSubscribers,
    prevPosts,
    prevComments,
    prevPostVotes,
    prevCommentVotes,
    prevReportsOnPosts,
    prevReportsOnComments,
  ] = await Promise.all([
    MyGlobal.prisma.community_bbs_community_subscribers.count({
      where: {
        subscribed_at: { gte: weekAgo, lte: fromDate },
        is_active: true,
        community: communityFilter,
      },
    }),
    MyGlobal.prisma.community_bbs_posts.count({
      where: {
        created_at: { gte: weekAgo, lte: fromDate },
        deleted_at: null,
        community: communityFilter,
      },
    }),
    MyGlobal.prisma.community_bbs_comments.count({
      where: {
        created_at: { gte: weekAgo, lte: fromDate },
        deleted_at: null,
        post: {
          community: communityFilter,
        },
      },
    }),
    MyGlobal.prisma.community_bbs_post_votes.count({
      where: {
        created_at: { gte: weekAgo, lte: fromDate },
        deleted_at: null,
        community_bbs_post_id: postIds.length > 0 ? { in: postIds } : {},
      },
    }),
    MyGlobal.prisma.community_bbs_comment_votes.count({
      where: {
        created_at: { gte: weekAgo, lte: fromDate },
        deleted_at: null,
        community_bbs_comment_id:
          commentIds.length > 0 ? { in: commentIds } : {},
      },
    }),
    MyGlobal.prisma.community_bbs_reported_posts.count({
      where: {
        created_at: { gte: weekAgo, lte: fromDate },
      },
    }),
    MyGlobal.prisma.community_bbs_reported_comments.count({
      where: {
        created_at: { gte: weekAgo, lte: fromDate },
      },
    }),
  ]);

  // Combine previous values
  const prevTotalContent = prevPosts + prevComments;
  const prevTotalVotes = prevPostVotes + prevCommentVotes;
  const prevReports = prevReportsOnPosts + prevReportsOnComments;
  const prevVoteEngagementScore =
    prevTotalContent > 0 ? prevTotalVotes / prevTotalContent : 0;
  const currVoteEngagementScore =
    (totalPostVotes + totalCommentVotes) / (totalPosts + totalComments);
  const sevenDayChange =
    prevVoteEngagementScore > 0
      ? ((currVoteEngagementScore - prevVoteEngagementScore) /
          prevVoteEngagementScore) *
        100
      : 0;

  // Calculate 30-day change (comparison with previous 30-day window)
  const monthAgo = toISOStringSafe(
    new Date(new Date(fromDate).getTime() - 30 * 24 * 60 * 60 * 1000),
  );
  const [
    prevSubscribers30,
    prevPosts30,
    prevComments30,
    prevPostVotes30,
    prevCommentVotes30,
    prevReportsOnPosts30,
    prevReportsOnComments30,
  ] = await Promise.all([
    MyGlobal.prisma.community_bbs_community_subscribers.count({
      where: {
        subscribed_at: { gte: monthAgo, lte: weekAgo },
        is_active: true,
        community: communityFilter,
      },
    }),
    MyGlobal.prisma.community_bbs_posts.count({
      where: {
        created_at: { gte: monthAgo, lte: weekAgo },
        deleted_at: null,
        community: communityFilter,
      },
    }),
    MyGlobal.prisma.community_bbs_comments.count({
      where: {
        created_at: { gte: monthAgo, lte: weekAgo },
        deleted_at: null,
        post: {
          community: communityFilter,
        },
      },
    }),
    MyGlobal.prisma.community_bbs_post_votes.count({
      where: {
        created_at: { gte: monthAgo, lte: weekAgo },
        deleted_at: null,
        community_bbs_post_id: postIds.length > 0 ? { in: postIds } : {},
      },
    }),
    MyGlobal.prisma.community_bbs_comment_votes.count({
      where: {
        created_at: { gte: monthAgo, lte: weekAgo },
        deleted_at: null,
        community_bbs_comment_id:
          commentIds.length > 0 ? { in: commentIds } : {},
      },
    }),
    MyGlobal.prisma.community_bbs_reported_posts.count({
      where: {
        created_at: { gte: monthAgo, lte: weekAgo },
      },
    }),
    MyGlobal.prisma.community_bbs_reported_comments.count({
      where: {
        created_at: { gte: monthAgo, lte: weekAgo },
      },
    }),
  ]);

  const prevTotalContent30 = prevPosts30 + prevComments30;
  const prevTotalVotes30 = prevPostVotes30 + prevCommentVotes30;
  const prevReports30 = prevReportsOnPosts30 + prevReportsOnComments30;
  const prevVoteEngagementScore30 =
    prevTotalContent30 > 0 ? prevTotalVotes30 / prevTotalContent30 : 0;
  const currVoteEngagementScore30 =
    (totalPostVotes + totalCommentVotes) / (totalPosts + totalComments);
  const thirtyDayChange =
    prevVoteEngagementScore30 > 0
      ? ((currVoteEngagementScore30 - prevVoteEngagementScore30) /
          prevVoteEngagementScore30) *
        100
      : 0;

  return {
    subscriber_growth_rate: subscriberGrowthRate,
    post_to_comment_ratio: postToCommentRatio,
    vote_engagement_score: voteEngagementScore,
    content_creation_velocity: contentCreationVelocity,
    moderation_activity_level: moderationActivityLevel,
    seven_day_change: sevenDayChange,
    thirty_day_change: thirtyDayChange,
  };
}
