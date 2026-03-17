import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeVoteCollector } from "../collectors/RedditLikeVoteCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommentsCommentIdVotes(props: {
  member: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeVote.ICreate;
}): Promise<IRedditLikeVote> {
  // Validate comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      author_id: true,
      is_deleted: true,
    },
  });
  if (comment.is_deleted) {
    throw new HttpException("Comment has been deleted", 400);
  }
  // Prevent self-voting
  if (comment.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // Check for existing vote by this member on this comment
  const existingVote = await MyGlobal.prisma.reddit_like_votes.findFirst({
    where: {
      member_id: props.member.id,
      commentVote: {
        comment_id: props.commentId,
      },
    },
    select: {
      id: true,
      vote_type: true,
    },
  });
  const memberSelect = RedditLikeMemberAtSummaryTransformer.select();
  // Execute transaction for atomic updates
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    if (existingVote) {
      // Vote change scenario
      if (existingVote.vote_type === props.body.vote_type) {
        // Same vote type - return existing vote without changes
        return tx.reddit_like_votes.findUniqueOrThrow({
          where: { id: existingVote.id },
          select: {
            id: true,
            vote_type: true,
            created_at: true,
            updated_at: true,
            member: memberSelect,
          },
        });
      }
      // Different vote type - update the vote
      const updatedVote = await tx.reddit_like_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: now,
        },
        select: {
          id: true,
          vote_type: true,
          created_at: true,
          updated_at: true,
          member: memberSelect,
        },
      });
      // Update comment vote_score: reverse old vote effect and apply new
      // Old vote: -1 if was upvote, +1 if was downvote
      // New vote: +1 if upvote, -1 if downvote
      const oldVoteDelta = existingVote.vote_type === "upvote" ? -1 : 1;
      const newVoteDelta = props.body.vote_type === "upvote" ? 1 : -1;
      const totalDelta = oldVoteDelta + newVoteDelta;
      await tx.reddit_like_comments.update({
        where: { id: props.commentId },
        data: {
          vote_score: { increment: totalDelta },
          updated_at: now,
        },
      });
      // Update author karma through members table timestamp
      await tx.reddit_like_members.update({
        where: { id: comment.author_id },
        data: {
          updated_at: now,
        },
      });
      return updatedVote;
    }
    // New vote scenario
    const voteData = await RedditLikeVoteCollector.collect({
      body: props.body,
      redditLikeMembers: { id: props.member.id },
      redditLikeComments: { id: props.commentId },
    });
    const newVote = await tx.reddit_like_votes.create({
      data: voteData,
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        member: memberSelect,
      },
    });
    // Update comment vote_score
    const voteDelta = props.body.vote_type === "upvote" ? 1 : -1;
    await tx.reddit_like_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: { increment: voteDelta },
        updated_at: now,
      },
    });
    // Update author karma through members table timestamp
    await tx.reddit_like_members.update({
      where: { id: comment.author_id },
      data: {
        updated_at: now,
      },
    });
    return newVote;
  });
  return await RedditLikeVoteTransformer.transform(result);
}
