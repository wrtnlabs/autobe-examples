import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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

export async function getRedditPlatformUserPostsPostIdCommentsThreadAnalysis(props: {
  user: UserPayload;
  postId: string;
}): Promise<IRedditPlatformComment> {
  const comments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
    select: {
      id: true,
      content: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      author_id: true,
    },
  });
  if (comments.length === 0) {
    throw new HttpException("No comments found for this post", 404);
  }
  // Calculate vote distribution
  const totalVotes = comments.reduce(
    (sum, comment) => Math.abs(comment.vote_score) + sum,
    0,
  );
  const positiveVotes = comments.filter((c) => c.vote_score > 0).length;
  const negativeVotes = comments.filter((c) => c.vote_score < 0).length;
  const neutralVotes = comments.filter((c) => c.vote_score === 0).length;
  // Calculate engagement metrics
  const totalComments = comments.length;
  const totalReplies = comments.reduce(
    (sum, comment) => comment.comment_count + sum,
    0,
  );
  // Calculate average engagement
  const avgVoteScore = totalVotes > 0 ? totalVotes / totalComments : 0;
  const avgCommentCount = totalComments > 0 ? totalReplies / totalComments : 0;
  // Get time-based statistics
  const firstCommentDate = comments[0]?.created_at;
  const lastCommentDate = comments[comments.length - 1]?.created_at;
  // Build comprehensive analysis result
  const result: IRedditPlatformComment = {
    id: comments[0].id as string & tags.Format<"uuid">,
    post_id: props.postId as string & tags.Format<"uuid">,
    thread_analysis: {
      total_comments: totalComments,
      total_replies: totalReplies,
      vote_distribution: {
        positive: positiveVotes,
        negative: negativeVotes,
        neutral: neutralVotes,
        total: totalVotes,
      },
      engagement: {
        average_vote_score: avgVoteScore,
        average_comment_count: avgCommentCount,
      },
      timeline: {
        first_comment: firstCommentDate
          ? (toISOStringSafe(firstCommentDate) as string &
              tags.Format<"date-time">)
          : null,
        last_comment: lastCommentDate
          ? (toISOStringSafe(lastCommentDate) as string &
              tags.Format<"date-time">)
          : null,
      },
      created_at: firstCommentDate
        ? (toISOStringSafe(firstCommentDate) as string &
            tags.Format<"date-time">)
        : null,
      updated_at: lastCommentDate
        ? (toISOStringSafe(lastCommentDate) as string &
            tags.Format<"date-time">)
        : null,
    },
  };
  return result;
}
