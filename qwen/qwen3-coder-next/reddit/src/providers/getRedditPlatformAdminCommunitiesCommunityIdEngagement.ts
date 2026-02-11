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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminCommunitiesCommunityIdEngagement(props: {
  admin: AdminPayload;
  communityId: string;
}): Promise<IRedditPlatformFeedView> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) throw new HttpException("Community not found", 404);
  // Post statistics
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: { community_id: props.communityId, deleted_at: null },
    select: { id: true, created_at: true },
  });
  const postCount = posts.length;
  const activePostDays = new Set(
    posts.map((p) => p.created_at.toISOString().slice(0, 10)),
  ).size;
  // Vote statistics
  const voteStats = await MyGlobal.prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'upvote' THEN 1 ELSE 0 END), 0) as upvoteCount,
      COALESCE(SUM(CASE WHEN type = 'downvote' THEN 1 ELSE 0 END), 0) as downvoteCount,
      COALESCE(AVG(CASE WHEN type = 'upvote' THEN 1 ELSE -1 END), 0) as netScore
    FROM reddit_platform_post_votes
    WHERE post_id IN (SELECT id FROM reddit_platform_posts WHERE community_id = ${props.communityId})
  `;
  // Comment statistics
  const commentStats = await MyGlobal.prisma.$queryRaw`
    SELECT 
      COUNT(*) as commentCount,
      COUNT(DISTINCT author_id) as activeCommenters
    FROM reddit_platform_comments
    WHERE post_id IN (SELECT id FROM reddit_platform_posts WHERE community_id = ${props.communityId})
      AND deleted_at IS NULL
  `;
  // Subscriber statistics
  const subscriberStats = await MyGlobal.prisma.$queryRaw`
    SELECT 
      COUNT(*) as subscriberCount,
      COUNT(DISTINCT member_id) as activeSubscribers
    FROM reddit_platform_subscriptions
    WHERE community_id = ${props.communityId}
      AND deleted_at IS NULL
  `;
  // Engagement metrics
  const engagementDuration = 0;
  const itemsViewed = postCount;
  // Extract subscriber count with proper null handling
  const subscriberCountRaw = (
    subscriberStats as unknown as Array<Record<string, number | null>>
  )[0]?.subscriberCount;
  const subscriberCount: number & tags.Type<"int32"> = (subscriberCountRaw ??
    0) satisfies number as number;
  return {
    id: v4(),
    userId: props.admin.id,
    feedResultId: null,
    communityId: props.communityId,
    sessionId: props.admin.session_id,
    feedType: "community",
    userAgent: null,
    ipAddress: null,
    viewedAt: toISOStringSafe(new Date()),
    engagementDuration: engagementDuration as
      | (number & tags.Type<"int32">)
      | null,
    itemsViewed: itemsViewed as (number & tags.Type<"int32">) | null,
    user: {
      id: props.admin.id,
      username: "admin",
      displayName: null,
      avatarUrl: null,
    },
    feedResult: null,
    community: {
      id: community.id,
      name: community.name,
      description: community.description ?? null,
      iconUrl: community.icon_url ?? null,
      subscriberCount,
    },
    createdAt: toISOStringSafe(new Date()),
  };
}
