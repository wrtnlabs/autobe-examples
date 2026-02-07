import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
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

export async function patchRedditPlatformUserCommentsCommentIdVote(props: {
  user: UserPayload;
  commentId: string;
  body: IRedditPlatformCommentVote.IUpdate;
}): Promise<IRedditPlatformCommentVote> {
  const vote = await MyGlobal.prisma.reddit_platform_comment_votes.findFirst({
    where: {
      comment_id: props.commentId,
      user_id: props.user.id,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  // Get the current vote type to calculate score adjustment
  const currentVoteType = vote.vote_type;
  // Default to 'upvote' as per empty DTO specification
  const newVoteType = "upvote";
  // Calculate score adjustment (1 for upvote, -1 for downvote, 0 for none)
  const currentScoreAdjustment =
    currentVoteType === "upvote" ? 1 : currentVoteType === "downvote" ? -1 : 0;
  const newScoreAdjustment =
    newVoteType === "upvote" ? 1 : newVoteType === "downvote" ? -1 : 0;
  const scoreDifference = newScoreAdjustment - currentScoreAdjustment;
  // Update the vote and adjust comment score
  const [updatedVote, updatedComment] = await Promise.all([
    MyGlobal.prisma.reddit_platform_comment_votes.update({
      where: { id: vote.id },
      data: {
        vote_type: newVoteType as string,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_platform_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: { increment: scoreDifference },
        updated_at: new Date(),
      },
    }),
  ]);
  return {
    id: updatedVote.id,
    vote_type: updatedVote.vote_type,
    user_id: updatedVote.user_id,
    comment_id: updatedVote.comment_id,
    created_at: toISOStringSafe(updatedVote.created_at),
    updated_at: toISOStringSafe(updatedVote.updated_at),
  };
}
