import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorCommentsCommentIdVotes(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeCommentVote.ICreate;
}): Promise<IRedditLikeCommentVote> {
  const { moderator, commentId, body } = props;

  // Verify comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_like_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or has been deleted", 404);
  }

  // Prevent self-voting - moderator cannot vote on their own comment
  if (comment.reddit_like_member_id === moderator.id) {
    throw new HttpException("You cannot vote on your own comment", 403);
  }

  // Check for existing vote from this moderator on this comment
  const existingVote =
    await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
      where: {
        reddit_like_member_id: moderator.id,
        reddit_like_comment_id: commentId,
      },
    });

  const now = toISOStringSafe(new Date());

  // Handle existing vote - either no-op or vote change
  if (existingVote) {
    // Same vote value - return existing vote without changes
    if (existingVote.vote_value === body.vote_value) {
      return {
        id: existingVote.id,
        vote_value: existingVote.vote_value,
        created_at: toISOStringSafe(existingVote.created_at),
        updated_at: toISOStringSafe(existingVote.updated_at),
      };
    }

    // Vote change - calculate score adjustment
    // Upvote to downvote: -2, Downvote to upvote: +2
    const scoreAdjustment = body.vote_value - existingVote.vote_value;

    // Update vote and comment score
    const updatedVote = await MyGlobal.prisma.reddit_like_comment_votes.update({
      where: {
        id: existingVote.id,
      },
      data: {
        vote_value: body.vote_value,
        updated_at: now,
      },
    });

    await MyGlobal.prisma.reddit_like_comments.update({
      where: {
        id: commentId,
      },
      data: {
        vote_score: comment.vote_score + scoreAdjustment,
        updated_at: now,
      },
    });

    return {
      id: updatedVote.id,
      vote_value: updatedVote.vote_value,
      created_at: toISOStringSafe(updatedVote.created_at),
      updated_at: now,
    };
  }

  // Create new vote record
  const newVoteId = v4();

  const createdVote = await MyGlobal.prisma.reddit_like_comment_votes.create({
    data: {
      id: newVoteId,
      reddit_like_member_id: moderator.id,
      reddit_like_comment_id: commentId,
      vote_value: body.vote_value,
      vote_weight: 1.0,
      created_at: now,
      updated_at: now,
    },
  });

  // Update comment vote score
  await MyGlobal.prisma.reddit_like_comments.update({
    where: {
      id: commentId,
    },
    data: {
      vote_score: comment.vote_score + body.vote_value,
      updated_at: now,
    },
  });

  return {
    id: createdVote.id,
    vote_value: createdVote.vote_value,
    created_at: now,
    updated_at: now,
  };
}
