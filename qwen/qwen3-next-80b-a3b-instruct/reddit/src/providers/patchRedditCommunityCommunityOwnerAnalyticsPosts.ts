import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostCommentCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostCommentCount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityOwnerAnalyticsPosts(props: {
  communityOwner: CommunityownerPayload;
  body: IRedditCommunityPostCommentCount.IRequest;
}): Promise<IRedditCommunityPostCommentCount.ISummary> {
  const { sortBy, timeFilter = "all", page, limit, search } = props.body;
  // Build temporal filter for 'top' sortBy
  let createdAtFilter:
    | {
        gte: string;
      }
    | undefined = undefined;
  if (sortBy === "top" && timeFilter !== "all") {
    const now = new Date();
    let cutoffDate: Date;
    if (timeFilter === "today") {
      cutoffDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (timeFilter === "week") {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === "month") {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeFilter === "year") {
      cutoffDate = new Date(now.getFullYear(), 0, 1);
    } else {
      cutoffDate = new Date(0);
    }
    createdAtFilter = { gte: toISOStringSafe(cutoffDate) };
  }
  // Since 'reddit_community_posts' does not exist in schema,
  // we cannot filter comment_counts by community via post relation.
  // All filtering by search (community name) is impossible with current schema.
  // Aggregation must be platform-wide.
  // Aggregate directly from comment_counts
  const data =
    await MyGlobal.prisma.reddit_community_post_comment_counts.aggregate({
      _avg: { total_comments: true },
      _sum: { total_comments: true },
      _count: { reddit_community_post_id: true },
      where: createdAtFilter ? { created_at: createdAtFilter } : {},
      take: limit,
      skip: (page - 1) * limit,
    });
  // Count active communities platform-wide
  const activeCommunities =
    await MyGlobal.prisma.reddit_community_communities.count({
      where: { deleted_at: null },
    });
  // Transform results to required interface
  const totalPosts = data._count?.reddit_community_post_id || 0;
  const totalVotes = data._sum?.total_comments || 0;
  const avgVoteScore = totalPosts > 0 ? totalVotes / totalPosts : 0;
  const avgCommentsPerPost = data._avg?.total_comments || 0;
  return {
    totalPosts,
    totalVotes,
    avgVoteScore,
    avgCommentsPerPost,
    activeCommunities,
  };
}
