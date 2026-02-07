import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostViewStat";
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

export async function getRedditPlatformUserPostsStatistics(props: {
  user: UserPayload;
}): Promise<IRedditPlatformPostViewStat.ISummary> {
  // Get overall statistics
  const statistics =
    await MyGlobal.prisma.reddit_platform_post_view_stats.aggregate({
      _count: true,
      _sum: {
        vote_score: true,
        comment_count: true,
        view_count: true,
      },
      where: {
        deleted_at: null,
      },
    });
  // Get content type breakdown
  const contentStats =
    await MyGlobal.prisma.reddit_platform_post_view_stats.groupBy({
      by: ["content_type"],
      _count: true,
      _avg: {
        vote_score: true,
        comment_count: true,
        view_count: true,
      },
      where: {
        deleted_at: null,
      },
    });
  // Calculate averages
  const totalCount = statistics._count;
  const totalVoteScore = statistics._sum.vote_score ?? 0;
  const totalCommentCount = statistics._sum.comment_count ?? 0;
  const totalViewCount = statistics._sum.view_count ?? 0;
  // Build content type breakdown
  const contentTypeBreakdown: Record<string, any> = {};
  for (const stat of contentStats) {
    contentTypeBreakdown[stat.content_type] = {
      count: stat._count,
      average_vote_score: stat._avg.vote_score ?? 0,
      average_comment_count: stat._avg.comment_count ?? 0,
      average_view_count: stat._avg.view_count ?? 0,
    };
  }
  // Return the summary structure
  return {
    total_posts: totalCount,
    total_vote_score: totalVoteScore,
    total_comment_count: totalCommentCount,
    total_view_count: totalViewCount,
    average_vote_score: totalCount > 0 ? totalVoteScore / totalCount : 0,
    average_comment_count: totalCount > 0 ? totalCommentCount / totalCount : 0,
    average_view_count: totalCount > 0 ? totalViewCount / totalCount : 0,
    content_type_breakdown: contentTypeBreakdown,
  };
}
