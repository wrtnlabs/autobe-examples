import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function getRedditPlatformMemberCommunitiesCommunityIdAnalytics(props: {
  member: MemberPayload;
  communityId: string;
}): Promise<IRedditPlatformCommunity.IAnalytic> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Get posts with correct fields from schema
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: {
      community_id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      type: true,
      created_at: true,
      vote_score: true,
      comment_count: true,
    },
  });
  const totalViews = 0; // view_count not in schema
  const averageKarma =
    posts.length > 0
      ? posts.reduce((sum, post) => sum + (post.vote_score ?? 0), 0) /
        posts.length
      : 0;
  const contentTypes = {
    textPosts: posts.filter((p) => p.type === "TEXT").length,
    linkPosts: posts.filter((p) => p.type === "LINK").length,
    imagePosts: posts.filter((p) => p.type === "IMAGE").length,
  };
  // Comments aggregation - use post relation instead of community_id
  const comments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: {
      post_id: {
        in: posts.map((p) => p.id),
      },
    },
    select: {
      vote_score: true,
    },
  });
  const totalComments = comments.length;
  const averageCommentKarma =
    comments.length > 0
      ? comments.reduce((sum, comment) => sum + (comment.vote_score ?? 0), 0) /
        comments.length
      : 0;
  // Vote aggregation
  const postVotes = await MyGlobal.prisma.reddit_platform_post_votes.findMany({
    where: {
      post_id: {
        in: posts.map((p) => p.id),
      },
    },
    select: {
      vote_type: true,
    },
  });
  const totalVotes = postVotes.length;
  const upvotes = postVotes.filter((v) => v.vote_type === "UPVOTE").length;
  const downvotes = postVotes.filter((v) => v.vote_type === "DOWNVOTE").length;
  // Subscription aggregation
  const subscriptions =
    await MyGlobal.prisma.reddit_platform_subscriptions.findMany({
      where: {
        community_id: props.communityId,
      },
      select: {
        created_at: true,
      },
    });
  // Active users (members who posted or commented)
  const activeMembers = await MyGlobal.prisma.$queryRaw<
    [
      {
        member_id: string;
      },
    ]
  >`
    SELECT DISTINCT member_id
    FROM (
      SELECT member_id FROM reddit_platform_posts WHERE community_id = ${props.communityId} AND deleted_at IS NULL
      UNION
      SELECT author_id FROM reddit_platform_comments WHERE post_id IN (${posts.map((p) => p.id).join(", ")})
    ) AS active_users
  `;
  const memberCount = await MyGlobal.prisma.reddit_platform_subscriptions.count(
    {
      where: {
        community_id: props.communityId,
      },
    },
  );
  const postingFrequency =
    activeMembers.length > 0 ? posts.length / activeMembers.length : 0;
  // Growth metrics (current day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = new Date();
  const newMembers = subscriptions.filter(
    (s) => s.created_at >= todayStart,
  ).length;
  const newPosts = posts.filter((p) => p.created_at >= todayStart).length;
  const netSubscriberChange = newMembers;
  const growthRate = memberCount > 0 ? (newMembers / memberCount) * 100 : 0;
  return {
    communityId: community.id as string,
    communityName: community.name,
    engagement: {
      viewCount: 0,
      voteCount: totalVotes,
      commentCount: totalComments,
      averageVoteScore: averageKarma,
    },
    content: {
      postCount: posts.length,
      averageKarma: averageKarma,
      contentTypes: {
        textPosts: contentTypes.textPosts,
        linkPosts: contentTypes.linkPosts,
        imagePosts: contentTypes.imagePosts,
      },
    },
    users: {
      memberCount: memberCount,
      activeMembers: activeMembers.length,
      postingFrequency: postingFrequency,
    },
    growth: {
      newMembers: newMembers,
      newPosts: newPosts,
      netSubscriberChange: netSubscriberChange,
      growthRate: growthRate,
    },
    timeRange: {
      startDate: toISOStringSafe(todayStart),
      endDate: toISOStringSafe(now),
      period: "TODAY" as const,
    },
  };
}
