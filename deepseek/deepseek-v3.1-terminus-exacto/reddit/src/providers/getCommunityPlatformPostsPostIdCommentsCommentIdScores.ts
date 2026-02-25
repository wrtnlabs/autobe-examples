import { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPlatformPostsPostIdCommentsCommentIdScores(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVoteScore> {
  // First validate that the comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, community_platform_post_id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Verify the post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Find the vote score record for this comment using the correct unique constraint
  const voteScore =
    await MyGlobal.prisma.community_platform_comment_vote_scores.findUnique({
      where: { community_platform_comment_id: props.commentId },
    });
  // If vote score record exists, return it with default values
  if (voteScore) {
    return {
      id: voteScore.id,
      upvote_count: voteScore.upvote_count,
      downvote_count: voteScore.downvote_count,
      score: voteScore.score,
      last_updated_at: voteScore.last_updated_at.toISOString(),
      created_at: voteScore.created_at.toISOString(),
    };
  }
  // If no vote score record exists, we need to calculate the current vote statistics
  // by aggregating individual votes
  const voteStats =
    await MyGlobal.prisma.community_platform_comment_votes.groupBy({
      by: ["vote_type"],
      where: { comment: { id: props.commentId } },
      _count: { _all: true },
    });
  // Calculate upvote and downvote counts
  let upvoteCount = 0;
  let downvoteCount = 0;
  for (const stat of voteStats) {
    if (stat.vote_type === "upvote") {
      upvoteCount = stat._count._all;
    } else if (stat.vote_type === "downvote") {
      downvoteCount = stat._count._all;
    }
  }
  const score = upvoteCount - downvoteCount;
  const now = toISOStringSafe(new Date());
  // Create a new vote score record if votes exist, otherwise return default values
  if (upvoteCount > 0 || downvoteCount > 0) {
    // Create the vote score record for future fast retrieval
    const createdScore =
      await MyGlobal.prisma.community_platform_comment_vote_scores.create({
        data: {
          id: v4(),
          community_platform_comment_id: props.commentId,
          upvote_count: upvoteCount,
          downvote_count: downvoteCount,
          score: score,
          last_updated_at: new Date(),
          created_at: new Date(),
        },
      });
    return {
      id: createdScore.id,
      upvote_count: createdScore.upvote_count,
      downvote_count: createdScore.downvote_count,
      score: createdScore.score,
      last_updated_at: createdScore.last_updated_at.toISOString(),
      created_at: createdScore.created_at.toISOString(),
    };
  }
  // Return default values when no votes exist
  return {
    id: v4() as string & tags.Format<"uuid">,
    upvote_count: 0,
    downvote_count: 0,
    score: 0,
    last_updated_at: now,
    created_at: now,
  };
}
