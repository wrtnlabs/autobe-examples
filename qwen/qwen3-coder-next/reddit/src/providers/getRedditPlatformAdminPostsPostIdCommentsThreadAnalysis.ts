import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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

export async function getRedditPlatformAdminPostsPostIdCommentsThreadAnalysis(props: {
  admin: AdminPayload;
  postId: string;
}): Promise<IRedditPlatformComment> {
  // Query all comments for the specified post
  const comments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
  });
  // Calculate thread analysis statistics
  const totalComments = comments.length;
  const totalVotes = comments.reduce(
    (sum, comment) => sum + comment.vote_score,
    0,
  );
  const avgVoteScore = totalComments > 0 ? totalVotes / totalComments : 0;
  // Analyze vote distribution
  const positiveComments = comments.filter((c) => c.vote_score > 0).length;
  const negativeComments = comments.filter((c) => c.vote_score < 0).length;
  const neutralComments = comments.filter((c) => c.vote_score === 0).length;
  // Analyze comment depth (parent-child relationships)
  const rootComments = comments.filter((c) => !c.parent_comment_id);
  const replyComments = comments.filter((c) => c.parent_comment_id);
  // Count unique commenters
  const uniqueAuthors = new Set(comments.map((c) => c.author_id)).size;
  // Calculate time-based metrics
  const createdAt = comments.length > 0 ? comments[0].created_at : new Date();
  const timeSpan =
    comments.length > 0
      ? (new Date().getTime() - new Date(comments[0].created_at).getTime()) /
        (1000 * 60 * 60 * 24) // days
      : 0;
  return {
    post_id: props.postId as string & tags.Format<"uuid">,
    comment_count: totalComments,
    total_vote_score: totalVotes,
    average_vote_score: Math.round(avgVoteScore * 100) / 100,
    vote_distribution: {
      positive: positiveComments,
      negative: negativeComments,
      neutral: neutralComments,
    },
    thread_structure: {
      root_comments: rootComments.length,
      reply_comments: replyComments.length,
      depth_ratio:
        rootComments.length > 0
          ? replyComments.length / rootComments.length
          : 0,
    },
    engagement_metrics: {
      unique_authors: uniqueAuthors,
      time_span_days: Math.round(timeSpan * 100) / 100,
      daily_comments:
        timeSpan > 0
          ? Math.round((totalComments / timeSpan) * 100) / 100
          : totalComments,
    },
    top_comments: comments
      .sort((a, b) => b.vote_score - a.vote_score)
      .slice(0, 5)
      .map((c) => ({
        id: c.id as string & tags.Format<"uuid">,
        vote_score: c.vote_score,
        comment_count: c.comment_count,
      })),
    created_at: toISOStringSafe(
      comments.length > 0 ? comments[0].created_at : new Date(),
    ),
  };
}
