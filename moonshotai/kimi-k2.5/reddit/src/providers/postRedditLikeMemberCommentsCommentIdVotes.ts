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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeVote.ICreate;
}): Promise<IRedditLikeVote> {
  // 1. Validate comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      author_id: true,
      is_deleted: true,
    },
  });
  if (comment.is_deleted) {
    throw new HttpException("Comment is deleted", 400);
  }
  // 2. Prevent self-voting
  if (comment.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // 3. Check for existing vote by this member on this comment
  const existingVote =
    await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
      where: {
        comment_id: props.commentId,
        vote: {
          member_id: props.member.id,
        },
      },
      select: {
        vote_id: true,
        vote: {
          select: {
            id: true,
            vote_type: true,
          },
        },
      },
    });
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    let voteId: string;
    if (existingVote) {
      // Vote exists - handle vote change
      const oldVoteType = existingVote.vote.vote_type;
      const newVoteType = props.body.vote_type;
      if (oldVoteType === newVoteType) {
        throw new HttpException("Already voted with the same type", 400);
      }
      // Update vote type
      await tx.reddit_like_votes.update({
        where: { id: existingVote.vote_id },
        data: {
          vote_type: newVoteType,
          updated_at: new Date(),
        },
      });
      voteId = existingVote.vote_id;
      // Calculate deltas for vote change
      const oldDelta = oldVoteType === "upvote" ? 1 : -1;
      const newDelta = newVoteType === "upvote" ? 1 : -1;
      const scoreDelta = newDelta - oldDelta;
      // Update comment vote_score
      await tx.reddit_like_comments.update({
        where: { id: props.commentId },
        data: {
          vote_score: { increment: scoreDelta },
        },
      });
    } else {
      // Create new vote
      voteId = v4();
      const createdAt = new Date();
      await tx.reddit_like_votes.create({
        data: {
          id: voteId,
          vote_type: props.body.vote_type,
          created_at: createdAt,
          updated_at: createdAt,
          member: { connect: { id: props.member.id } },
        },
      });
      await tx.reddit_like_comment_votes.create({
        data: {
          id: v4(),
          vote_id: voteId,
          comment_id: props.commentId,
          created_at: createdAt,
        },
      });
      const scoreDelta = props.body.vote_type === "upvote" ? 1 : -1;
      // Update comment vote_score
      await tx.reddit_like_comments.update({
        where: { id: props.commentId },
        data: {
          vote_score: { increment: scoreDelta },
        },
      });
    }
    // Return the vote with full data for transformation
    return tx.reddit_like_votes.findUniqueOrThrow({
      where: { id: voteId },
      ...RedditLikeVoteTransformer.select(),
    });
  });
  return RedditLikeVoteTransformer.transform(result);
}
