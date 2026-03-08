import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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

export async function getRedditLikeAdminAnalyticsDashboard(props: {
  admin: AdminPayload;
}): Promise<IRedditLikeMember.IDatum> {
  const activeUsers = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: bigint;
      },
    ]
  >`
    SELECT COUNT(DISTINCT id) as count
    FROM reddit_like_members
    WHERE deleted_at IS NULL
      AND updated_at >= NOW() - INTERVAL '30 days'
  `;
  const totalCommunities = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: bigint;
      },
    ]
  >`
    SELECT COUNT(id) as count
    FROM reddit_like_communities
    WHERE deleted_at IS NULL
  `;
  const totalPosts = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: bigint;
      },
    ]
  >`
    SELECT COUNT(id) as count
    FROM reddit_like_posts
    WHERE deleted_at IS NULL
  `;
  const totalComments = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: bigint;
      },
    ]
  >`
    SELECT COUNT(id) as count
    FROM reddit_like_comments
    WHERE deleted_at IS NULL
  `;
  const totalVotes = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: bigint;
      },
    ]
  >`
    SELECT (
      (SELECT COUNT(id) FROM reddit_like_post_votes) +
      (SELECT COUNT(id) FROM reddit_like_comment_votes)
    ) as count
  `;
  const activeSubscriptions = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: bigint;
      },
    ]
  >`
    SELECT COUNT(id) as count
    FROM reddit_like_subscriptions
    WHERE deleted_at IS NULL AND status = 'subscribed'
  `;
  return {
    active_users: Number(activeUsers[0].count),
    total_communities: Number(totalCommunities[0].count),
    total_posts: Number(totalPosts[0].count),
    total_comments: Number(totalComments[0].count),
    total_votes: Number(totalVotes[0].count),
    active_subscriptions: Number(activeSubscriptions[0].count),
  };
}
