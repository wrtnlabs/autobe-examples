import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSCommunityStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunityStats";

export async function getCommunityBBSDashboardCommunityStats(): Promise<ICommunityBBSCommunityStats> {
  const totalCommunities =
    await MyGlobal.prisma.community_bbs_communities.count({
      where: { deleted_at: null },
    });

  const totalSubscribers =
    await MyGlobal.prisma.community_bbs_community_subscribers.count();

  const postsPerCommunity = await MyGlobal.prisma.community_bbs_posts.groupBy({
    by: ["community_id"],
    _count: { id: true },
    where: { deleted_at: null },
  });

  const avgPostsPerCommunity =
    postsPerCommunity.length > 0
      ? postsPerCommunity.reduce((sum, p) => sum + (p._count?.id ?? 0), 0) /
        postsPerCommunity.length
      : 0;

  const commentsPerPost = await MyGlobal.prisma.community_bbs_comments.groupBy({
    by: ["post_id"],
    _count: { id: true },
    where: { deleted_at: null },
  });

  const avgCommentsPerPost =
    commentsPerPost.length > 0
      ? commentsPerPost.reduce((sum, c) => sum + (c._count?.id ?? 0), 0) /
        commentsPerPost.length
      : 0;

  return JSON.stringify({
    total_communities: totalCommunities,
    total_subscribers: totalSubscribers,
    avg_posts_per_community: avgPostsPerCommunity,
    avg_comments_per_post: avgCommentsPerPost,
  });
}
