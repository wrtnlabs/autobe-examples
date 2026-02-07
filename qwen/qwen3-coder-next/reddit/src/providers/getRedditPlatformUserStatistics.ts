import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUserStatistics(props: {
  user: UserPayload;
}): Promise<IRedditPlatformCommunity.ISummary> {
  const totalUsers = await MyGlobal.prisma.reddit_platform_users.count();
  const totalCommunities =
    await MyGlobal.prisma.reddit_platform_communities.count();
  const totalPosts = await MyGlobal.prisma.reddit_platform_posts.count({
    where: { deleted_at: null },
  });
  const totalComments = await MyGlobal.prisma.reddit_platform_comments.count({
    where: { deleted_at: null },
  });
  const totalPostVotes =
    await MyGlobal.prisma.reddit_platform_post_votes.count();
  const totalCommentVotes =
    await MyGlobal.prisma.reddit_platform_comment_votes.count();
  const totalVotes = totalPostVotes + totalCommentVotes;
  const avgKarma = await MyGlobal.prisma.reddit_platform_users.aggregate({
    _avg: { karma_score: true },
  });
  return {
    user_statistics: {
      total_users: totalUsers,
      total_communities: totalCommunities,
      total_posts: totalPosts,
      total_comments: totalComments,
      total_votes: totalVotes,
      average_karma_score: avgKarma._avg.karma_score ?? null,
    },
    community_statistics: null,
    content_statistics: null,
    engagement_statistics: null,
  };
}
