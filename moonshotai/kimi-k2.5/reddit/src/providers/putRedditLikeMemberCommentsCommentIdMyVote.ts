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

export async function putRedditLikeMemberCommentsCommentIdMyVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeVote.IUpdate;
}): Promise<IRedditLikeVote> {
  // Step 1: Validate comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      is_deleted: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.is_deleted) {
    throw new HttpException("Cannot vote on deleted content", 400);
  }
  // Step 2: Check for existing vote by this member on this comment
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
  // Step 3: Execute upsert in transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    let voteId: string;
    const now = new Date();
    if (existingVote !== null) {
      // Update existing vote
      voteId = existingVote.id;
      // Only process if vote type is changing
      if (existingVote.vote_type !== props.body.vote_type) {
        // Calculate score change: reverse old + apply new
        const oldDelta = existingVote.vote_type === "upvote" ? -1 : 1;
        const newDelta = props.body.vote_type === "upvote" ? 1 : -1;
        const scoreChange = oldDelta + newDelta;
        // Update vote record
        await tx.reddit_like_votes.update({
          where: { id: voteId },
          data: {
            vote_type: props.body.vote_type,
            updated_at: now,
          },
        });
        // Update comment score
        await tx.reddit_like_comments.update({
          where: { id: props.commentId },
          data: {
            vote_score: { increment: scoreChange },
            updated_at: now,
          },
        });
      }
    } else {
      // Create new vote
      voteId = v4();
      // Create main vote record
      await tx.reddit_like_votes.create({
        data: {
          id: voteId,
          member_id: props.member.id,
          vote_type: props.body.vote_type,
          created_at: now,
          updated_at: now,
        },
      });
      // Create comment vote link
      await tx.reddit_like_comment_votes.create({
        data: {
          id: v4(),
          vote_id: voteId,
          comment_id: props.commentId,
          created_at: now,
        },
      });
      // Update comment score
      const scoreDelta = props.body.vote_type === "upvote" ? 1 : -1;
      await tx.reddit_like_comments.update({
        where: { id: props.commentId },
        data: {
          vote_score: { increment: scoreDelta },
          updated_at: now,
        },
      });
    }
    // Return the vote with member info
    return tx.reddit_like_votes.findUniqueOrThrow({
      where: { id: voteId },
      ...RedditLikeVoteTransformer.select(),
    });
  });
  return RedditLikeVoteTransformer.transform(result);
}
