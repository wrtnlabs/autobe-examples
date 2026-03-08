import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberActivityDashboard(props: {
  member: MemberPayload;
}): Promise<IRedditLikeMember> {
  // Calculate total posts
  const totalPostsResult = await MyGlobal.prisma.reddit_like_posts.aggregate({
    _count: true,
  });
  // Calculate posts created today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const postsTodayResult = await MyGlobal.prisma.reddit_like_posts.aggregate({
    _count: true,
    where: {
      created_at: {
        gte: today,
      },
    },
  });
  // Calculate total comments
  const totalCommentsResult =
    await MyGlobal.prisma.reddit_like_comments.aggregate({
      _count: true,
    });
  // Calculate comments created today
  const commentsTodayResult =
    await MyGlobal.prisma.reddit_like_comments.aggregate({
      _count: true,
      where: {
        created_at: {
          gte: today,
        },
      },
    });
  // Calculate total votes from post votes
  const postVotesSumResult =
    await MyGlobal.prisma.reddit_like_post_votes.aggregate({
      _sum: {
        value: true,
      },
    });
  // Calculate total votes from comment votes
  const commentVotesSumResult =
    await MyGlobal.prisma.reddit_like_comment_votes.aggregate({
      _sum: {
        value: true,
      },
    });
  // Calculate comment votes created today
  const commentVotesTodayResult =
    await MyGlobal.prisma.reddit_like_comment_votes.aggregate({
      _count: true,
      where: {
        created_at: {
          gte: today,
        },
      },
    });
  // Calculate total communities
  const totalCommunitiesResult =
    await MyGlobal.prisma.reddit_like_communities.aggregate({
      _count: true,
    });
  // Calculate active subscriptions
  const subscribedCountResult =
    await MyGlobal.prisma.reddit_like_subscriptions.aggregate({
      _count: true,
      where: {
        status: "subscribed",
      },
    });
  // Calculate pending reports
  const pendingReportsResult =
    await MyGlobal.prisma.reddit_like_reports.aggregate({
      _count: true,
      where: {
        status: "pending",
      },
    });
  // Calculate active users by finding distinct user IDs from three tables
  const todayISOString = today.toISOString();
  // Get active users from posts
  const activePostUsers = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: {
      created_at: {
        gte: new Date(todayISOString),
      },
    },
    select: {
      author_id: true,
    },
    distinct: ["author_id"],
  });
  // Get active users from post votes
  const activePostVoteUsers =
    await MyGlobal.prisma.reddit_like_post_votes.findMany({
      where: {
        created_at: {
          gte: new Date(todayISOString),
        },
      },
      select: {
        voter_id: true,
      },
      distinct: ["voter_id"],
    });
  // Get active users from comments
  const activeCommentUsers =
    await MyGlobal.prisma.reddit_like_comments.findMany({
      where: {
        created_at: {
          gte: new Date(todayISOString),
        },
      },
      select: {
        author_id: true,
      },
      distinct: ["author_id"],
    });
  // Combine all unique user IDs
  const allActiveUserIds = new Set([
    ...activePostUsers.map((u) => u.author_id),
    ...activePostVoteUsers.map((u) => u.voter_id),
    ...activeCommentUsers.map((u) => u.author_id),
  ]);
  const activeUsersCount = allActiveUserIds.size;
  // Build the dashboard object with proper type conversion
  return {
    total_posts: totalPostsResult._count || 0,
    posts_today: postsTodayResult._count || 0,
    total_comments: totalCommentsResult._count || 0,
    comments_today: commentsTodayResult._count || 0,
    total_votes:
      (postVotesSumResult._sum?.value || 0) +
      (commentVotesSumResult._sum?.value || 0),
    comment_votes_today: commentVotesTodayResult._count || 0,
    total_communities: totalCommunitiesResult._count || 0,
    subscribed_count: subscribedCountResult._count || 0,
    pending_reports: pendingReportsResult._count || 0,
    active_users: activeUsersCount,
  };
}
