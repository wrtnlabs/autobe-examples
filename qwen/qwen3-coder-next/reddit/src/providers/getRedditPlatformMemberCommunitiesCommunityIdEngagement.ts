import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function getRedditPlatformMemberCommunitiesCommunityIdEngagement(props: {
  member: MemberPayload;
  communityId: string;
}): Promise<IRedditPlatformFeedView> {
  // Validate community exists
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Calculate engagement metrics
  const postsCount = await MyGlobal.prisma.reddit_platform_posts.count({
    where: {
      community_id: props.communityId,
    },
  });
  const commentsCount = await MyGlobal.prisma.reddit_platform_comments.count({
    where: {
      post: {
        community_id: props.communityId,
      },
    },
  });
  const votesCount = await MyGlobal.prisma.reddit_platform_post_votes.count({
    where: {
      post: {
        community_id: props.communityId,
      },
    },
  });
  const subscribersCount =
    await MyGlobal.prisma.reddit_platform_subscriptions.count({
      where: {
        community_id: props.communityId,
      },
    });
  // Calculate average vote score per post
  const postVotes = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: {
      community_id: props.communityId,
    },
    select: {
      vote_score: true,
    },
  });
  const avgVoteScore =
    postVotes.length > 0
      ? postVotes.reduce((sum, post) => sum + post.vote_score, 0) /
        postVotes.length
      : 0;
  // Get active users count (members who posted or commented in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeUsers = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: number;
      },
    ]
  >`
    SELECT COUNT(DISTINCT user_id) as count
    FROM (
      SELECT author_id as user_id
      FROM reddit_platform_posts
      WHERE community_id = ${props.communityId} 
        AND deleted_at IS NULL
        AND created_at >= ${thirtyDaysAgo}
      UNION
      SELECT author_id as user_id
      FROM reddit_platform_comments
      WHERE post_id IN (
        SELECT id FROM reddit_platform_posts 
        WHERE community_id = ${props.communityId} 
          AND deleted_at IS NULL
      ) 
        AND deleted_at IS NULL
        AND created_at >= ${thirtyDaysAgo}
    ) as active;
  `;
  const activeUsersCount = activeUsers[0].count;
  // Return engagement data in feed view format as specified
  return {
    id: v4(),
    userId: props.member.id,
    feedResultId: null,
    communityId: props.communityId,
    sessionId: props.member.session_id,
    feedType: "community_engagement",
    userAgent: null,
    ipAddress: null,
    createdAt: toISOStringSafe(new Date()),
    viewedAt: toISOStringSafe(new Date()),
    engagementDuration: null,
    itemsViewed: null,
    user: {
      id: props.member.id,
      username: "engagement_analytics",
    },
    feedResult: null,
    community: null,
  };
}
