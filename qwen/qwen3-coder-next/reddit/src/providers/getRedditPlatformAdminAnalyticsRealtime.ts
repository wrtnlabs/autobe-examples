import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
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

export async function getRedditPlatformAdminAnalyticsRealtime(props: {
  admin: AdminPayload;
}): Promise<IRedditPlatformFeedResult.IRealtime> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Active users - count distinct sessions from last 24 hours
  const memberCount =
    await MyGlobal.prisma.reddit_platform_member_sessions.count({
      where: { created_at: { gte: yesterday } },
    });
  const guestCount = await MyGlobal.prisma.reddit_platform_guest_sessions.count(
    {
      where: { created_at: { gte: yesterday } },
    },
  );
  // Content metrics - aggregate from posts and comments
  const postCount = await MyGlobal.prisma.reddit_platform_posts.aggregate({
    _count: true,
    _avg: {
      vote_score: true,
    },
  });
  const commentCount = await MyGlobal.prisma.reddit_platform_comments.aggregate(
    {
      _count: true,
    },
  );
  // Engagement metrics - aggregate from all votes
  const voteStats = await MyGlobal.prisma.reddit_platform_post_votes.aggregate({
    _count: true,
  });
  const commentVoteStats =
    await MyGlobal.prisma.reddit_platform_comment_votes.aggregate({
      _count: true,
    });
  // Community metrics - count communities and active ones
  const communityCount =
    await MyGlobal.prisma.reddit_platform_communities.count();
  const activeCommunities =
    await MyGlobal.prisma.reddit_platform_communities.count({
      where: {
        posts: {
          some: {
            created_at: { gte: yesterday },
          },
        },
      },
    });
  return {
    refreshedAt: toISOStringSafe(now),
    activeUsers: {
      total: (memberCount + guestCount) as number & tags.Type<"int32">,
      members: memberCount as number & tags.Type<"int32">,
      guests: guestCount as number & tags.Type<"int32">,
    },
    contentMetrics: {
      totalPosts: postCount._count as number & tags.Type<"int32">,
      posts24h: (await MyGlobal.prisma.reddit_platform_posts.count({
        where: { created_at: { gte: yesterday } },
      })) as number & tags.Type<"int32">,
      totalComments: commentCount._count as number & tags.Type<"int32">,
      comments24h: (await MyGlobal.prisma.reddit_platform_comments.count({
        where: { created_at: { gte: yesterday } },
      })) as number & tags.Type<"int32">,
    },
    engagementMetrics: {
      totalVotes: (voteStats._count + commentVoteStats._count) as number &
        tags.Type<"int32">,
      votes24h: ((await MyGlobal.prisma.reddit_platform_post_votes.count({
        where: { created_at: { gte: yesterday } },
      })) +
        (await MyGlobal.prisma.reddit_platform_comment_votes.count({
          where: { created_at: { gte: yesterday } },
        }))) as number & tags.Type<"int32">,
      averageVoteScore: 0,
    },
    communityMetrics: {
      totalCommunities: communityCount as number & tags.Type<"int32">,
      activeCommunities24h: activeCommunities as number & tags.Type<"int32">,
    },
  };
}
