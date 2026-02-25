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
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityPlatformAdminPostsPostIdCommentsCommentIdVotes(props: {
  platformAdmin: PlatformadminPayload;
  postId: string;
  commentId: string;
  body: IRedditCommunityCommentVoteRequest;
}): Promise<IRedditCommunityCommentVoteResponse> {
  // Find the comment and ensure it belongs to the given post
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: {
      id: props.commentId,
    },
    select: {
      id: true,
      vote_score: true,
      author_id: true,
      post_id: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify comment belongs to the specified post
  if (comment.post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Prevent self-voting
  if (comment.author_id === props.platformAdmin.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // Define vote value mapping
  const voteValue: Record<string, number> = {
    upvote: 1,
    downvote: -1,
    none: 0,
  };
  // Look up existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
      where: {
        user_id_comment_id: {
          user_id: props.platformAdmin.id,
          comment_id: props.commentId,
        },
      },
      select: {
        vote_type: true,
      },
    });
  // Calculate delta
  let delta = 0;
  let newVoteType = props.body.voteType;
  if (existingVote) {
    // If vote is being changed
    if (existingVote.vote_type !== props.body.voteType) {
      delta =
        voteValue[props.body.voteType] - voteValue[existingVote.vote_type];
      newVoteType = props.body.voteType;
    } else {
      // Same vote - no change
      return { vote_score: comment.vote_score };
    }
  } else {
    // New vote
    delta = voteValue[props.body.voteType];
    newVoteType = props.body.voteType;
  }
  // Perform transaction
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update comment vote score
    await prisma.reddit_community_comments.update({
      where: { id: props.commentId },
      data: { vote_score: { increment: delta } },
    });
    // Update user karma if voteType is not 'none'
    if (props.body.voteType !== "none") {
      await prisma.reddit_community_members.update({
        where: { id: props.platformAdmin.id },
        data: { karma_score: { increment: delta } },
      });
    }
    // Handle vote record
    if (props.body.voteType === "none") {
      // Delete existing vote
      await prisma.reddit_community_comment_votes.delete({
        where: {
          user_id_comment_id: {
            user_id: props.platformAdmin.id,
            comment_id: props.commentId,
          },
        },
      });
    } else {
      // Create or update vote
      const createData = {
        id: v4(),
        user: { connect: { id: props.platformAdmin.id } },
        comment: { connect: { id: props.commentId } },
        vote_type: newVoteType,
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      } satisfies Prisma.reddit_community_comment_votesCreateInput;
      await prisma.reddit_community_comment_votes.upsert({
        where: {
          user_id_comment_id: {
            user_id: props.platformAdmin.id,
            comment_id: props.commentId,
          },
        },
        create: createData,
        update: {
          vote_type: newVoteType,
          updated_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        },
      });
    }
    // Fetch updated comment vote score
    const updatedComment = await prisma.reddit_community_comments.findUnique({
      where: { id: props.commentId },
      select: { vote_score: true },
    });
    return updatedComment!;
  });
  return { vote_score: result.vote_score };
}
