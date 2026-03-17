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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberCommentsCommentIdMyVote(props: {
  member: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeVote.IUpdate;
}): Promise<IRedditLikeVote> {
  // Verify comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      is_deleted: true,
      post_id: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.is_deleted) {
    throw new HttpException("Cannot vote on deleted content", 400);
  }
  // Get post for community context
  const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
    where: { id: comment.post_id },
    select: {
      community_id: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Check for existing vote on this comment
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
  const now = new Date();
  // Execute upsert within transaction
  const voteResult = await MyGlobal.prisma.$transaction(async (prisma) => {
    if (existingVote !== null) {
      // Update existing vote if type changed
      if (existingVote.vote_type !== props.body.vote_type) {
        await prisma.reddit_like_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: props.body.vote_type,
            updated_at: now,
          },
        });
        // Calculate score delta: reverse old effect, apply new
        const oldScoreDelta = existingVote.vote_type === "upvote" ? 1 : -1;
        const newScoreDelta = props.body.vote_type === "upvote" ? 1 : -1;
        const scoreChange = newScoreDelta - oldScoreDelta;
        await prisma.reddit_like_comments.update({
          where: { id: props.commentId },
          data: {
            vote_score: { increment: scoreChange },
          },
        });
      }
      // Fetch updated vote for response
      return prisma.reddit_like_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...RedditLikeVoteTransformer.select(),
      });
    }
    // Create new vote
    const newVoteId = v4();
    await prisma.reddit_like_votes.create({
      data: {
        id: newVoteId,
        member_id: props.member.id,
        vote_type: props.body.vote_type,
        created_at: now,
        updated_at: now,
      },
    });
    // Create the comment vote association - need an id for reddit_like_comment_votes
    const commentVoteId = v4();
    await prisma.reddit_like_comment_votes.create({
      data: {
        id: commentVoteId,
        vote_id: newVoteId,
        comment_id: props.commentId,
        created_at: now,
      },
    });
    // Update comment vote_score
    const scoreDelta = props.body.vote_type === "upvote" ? 1 : -1;
    await prisma.reddit_like_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: { increment: scoreDelta },
      },
    });
    // Fetch created vote for response
    return prisma.reddit_like_votes.findUniqueOrThrow({
      where: { id: newVoteId },
      ...RedditLikeVoteTransformer.select(),
    });
  });
  return RedditLikeVoteTransformer.transform(voteResult);
}
