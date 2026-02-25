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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string;
  commentId: string;
  body: IRedditCommunityCommentVoteRequest;
}): Promise<IRedditCommunityCommentVoteResponse> {
  const { member, postId, commentId, body } = props;
  // Verify comment exists and belongs to the specified post
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        id: true,
        vote_score: true,
        author_id: true,
        post: { select: { id: true } },
      },
    });
  if (comment.post.id !== postId) {
    throw new HttpException("Comment does not belong to this post", 400);
  }
  // Prevent self-voting
  if (comment.author_id === member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // Define vote value mapping
  const voteValue =
    body.voteType === "upvote" ? 1 : body.voteType === "downvote" ? -1 : 0;
  // Find existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
      where: {
        user_id_comment_id: {
          user_id: member.id,
          comment_id: commentId,
        },
      },
    });
  // Calculate delta
  const prevVoteValue = existingVote
    ? existingVote.vote_type === "upvote"
      ? 1
      : existingVote.vote_type === "downvote"
        ? -1
        : 0
    : 0;
  const delta = voteValue - prevVoteValue;
  // Execute atomic transaction
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update comment vote_score
    await prisma.reddit_community_comments.update({
      where: { id: commentId },
      data: { vote_score: { increment: delta } },
    });
    // Update member karma_score if vote changed
    if (delta !== 0) {
      await prisma.reddit_community_members.update({
        where: { id: member.id },
        data: { karma_score: { increment: delta } },
      });
    }
    // Handle vote record
    if (body.voteType === "none") {
      if (existingVote) {
        await prisma.reddit_community_comment_votes.delete({
          where: {
            user_id_comment_id: {
              user_id: member.id,
              comment_id: commentId,
            },
          },
        });
      }
    } else {
      if (existingVote) {
        await prisma.reddit_community_comment_votes.update({
          where: {
            user_id_comment_id: {
              user_id: member.id,
              comment_id: commentId,
            },
          },
          data: {
            vote_type: body.voteType,
            updated_at: toISOStringSafe(new Date()) as string &
              tags.Format<"date-time">,
          },
        });
      } else {
        const now = toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">;
        await prisma.reddit_community_comment_votes.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            user_id: member.id,
            comment_id: commentId,
            vote_type: body.voteType,
            created_at: now,
            updated_at: now,
          },
        });
      }
    }
    // Fetch updated comment
    return prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: commentId },
      select: { vote_score: true },
    });
  });
  return { vote_score: result.vote_score };
}
