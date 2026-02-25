import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentVoteRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVoteRequest";
import { IRedditCommunityCommentVoteResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVoteResponse";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityOwnerPostsPostIdCommentsCommentIdVotes(props: {
  communityOwner: CommunityownerPayload;
  postId: string;
  commentId: string;
  body: IRedditCommunityCommentVoteRequest;
}): Promise<IRedditCommunityCommentVoteResponse> {
  const userId = props.communityOwner.id;
  // Verify comment exists and is owned by the specified post
  const comment = await MyGlobal.prisma.reddit_community_comments.findFirst({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      vote_score: true,
      author_id: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found or inaccessible", 404);
  }
  // Prevent self-voting
  if (comment.author_id === userId) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // Map vote type to numeric delta
  const voteType = props.body.voteType;
  let delta: number;
  let existingVote = null;
  // Search for existing vote by user and comment
  existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
      where: {
        user_id_comment_id: {
          user_id: userId,
          comment_id: props.commentId,
        },
      },
    });
  // Begin transaction
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    if (existingVote) {
      if (voteType === "none") {
        // Remove existing vote
        delta = existingVote.vote_type === "upvote" ? -1 : 1;
        await prisma.reddit_community_comment_votes.delete({
          where: {
            user_id_comment_id: {
              user_id: userId,
              comment_id: props.commentId,
            },
          },
        });
      } else {
        // Change existing vote
        const oldDelta = existingVote.vote_type === "upvote" ? 1 : -1;
        const newDelta = voteType === "upvote" ? 1 : -1;
        delta = newDelta - oldDelta;
        await prisma.reddit_community_comment_votes.update({
          where: {
            user_id_comment_id: {
              user_id: userId,
              comment_id: props.commentId,
            },
          },
          data: {
            vote_type: voteType,
            updated_at: new Date().toISOString() as string &
              tags.Format<"date-time">,
          },
        });
      }
    } else {
      // New vote
      if (voteType === "none") {
        // No-op: no existing vote to remove
        return { vote_score: comment.vote_score };
      } else {
        delta = voteType === "upvote" ? 1 : -1;
        await prisma.reddit_community_comment_votes.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            user_id: userId,
            comment_id: props.commentId,
            vote_type: voteType,
            created_at: new Date().toISOString() as string &
              tags.Format<"date-time">,
            updated_at: new Date().toISOString() as string &
              tags.Format<"date-time">,
          },
        });
      }
    }
    // Atomically update comment vote_score and user karma_score
    await prisma.reddit_community_comments.update({
      where: { id: props.commentId },
      data: { vote_score: { increment: delta } },
    });
    if (voteType !== "none") {
      await prisma.reddit_community_members.update({
        where: { id: userId },
        data: { karma_score: { increment: delta } },
      });
    }
    // Return updated vote_score
    const updatedComment = await prisma.reddit_community_comments.findUnique({
      where: { id: props.commentId },
      select: { vote_score: true },
    });
    return { vote_score: updatedComment?.vote_score || 0 };
  });
  return result;
}
