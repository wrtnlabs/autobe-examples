import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
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

export async function getRedditCloneMemberCommunitiesCommunityIdAnalytics(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunity.IAnalytic> {
  // Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
      select: {
        id: true,
        name: true,
        created_at: true,
        subscriber_count: true,
        owner_id: true,
      },
    });
  // Check if user is owner or moderator
  const isOwner = community.owner_id === props.member.id;
  const isModerator =
    (await MyGlobal.prisma.reddit_clone_community_moderators.count({
      where: {
        community: { id: props.communityId },
        member: { id: props.member.id },
      },
    })) > 0;
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Calculate time thresholds
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  // Count metrics for different periods (no subscriptions table, use denormalized subscriber_count)
  const [
    postsTotal,
    posts7d,
    posts30d,
    posts90d,
    commentsTotal,
    moderatorsCount,
    postAvgScore,
    commentsAvgScore,
  ] = await Promise.all([
    // Total active posts
    MyGlobal.prisma.reddit_clone_posts.count({
      where: {
        community: { id: props.communityId },
        deleted_at: null,
      },
    }),
    // Posts created in last 7 days
    MyGlobal.prisma.reddit_clone_posts.count({
      where: {
        community: { id: props.communityId },
        deleted_at: null,
        created_at: { gte: sevenDaysAgo },
      },
    }),
    // Posts created in last 30 days
    MyGlobal.prisma.reddit_clone_posts.count({
      where: {
        community: { id: props.communityId },
        deleted_at: null,
        created_at: { gte: thirtyDaysAgo },
      },
    }),
    // Posts created in last 90 days
    MyGlobal.prisma.reddit_clone_posts.count({
      where: {
        community: { id: props.communityId },
        deleted_at: null,
        created_at: { gte: ninetyDaysAgo },
      },
    }),
    // Total comments
    MyGlobal.prisma.reddit_clone_comments.count({
      where: {
        post: { community: { id: props.communityId } },
        deleted_at: null,
      },
    }),
    // Moderator count
    MyGlobal.prisma.reddit_clone_community_moderators.count({
      where: {
        community: { id: props.communityId },
      },
    }),
    // Average post score
    MyGlobal.prisma.reddit_clone_posts.aggregate({
      _avg: { score: true },
      where: {
        community: { id: props.communityId },
        deleted_at: null,
      },
    }),
    // Average comment score
    MyGlobal.prisma.reddit_clone_comments.aggregate({
      _avg: { score: true },
      where: {
        post: { community: { id: props.communityId } },
        deleted_at: null,
      },
    }),
  ]);
  return {
    id: community.id,
    name: community.name,
    created_at: community.created_at.toISOString(),
    subscriber_count: community.subscriber_count,
    subscribers_gained_7d: 0,
    subscribers_gained_30d: 0,
    subscribers_gained_90d: 0,
    posts_total: postsTotal,
    posts_created_7d: posts7d,
    posts_created_30d: posts30d,
    posts_created_90d: posts90d,
    posts_avg_score: postAvgScore._avg.score ?? 0,
    comments_total: commentsTotal,
    comments_avg_score: commentsAvgScore._avg.score ?? 0,
    moderators_count: moderatorsCount,
  };
}
