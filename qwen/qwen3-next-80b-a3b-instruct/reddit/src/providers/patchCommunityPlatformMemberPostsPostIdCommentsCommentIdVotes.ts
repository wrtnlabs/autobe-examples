import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string;
  commentId: string;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<void> {
  // Verify comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      post_id: true, // Using correct field name from database schema
      vote_score: true,
      author_id: true,
      deleted_at: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 400);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot vote on a deleted comment", 400);
  }
  // Check if user already has a vote on this comment
  // Using correct field names for compound unique key
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        user_id_comment_id: {
          user_id: props.member.id,
          comment_id: props.commentId,
        },
      },
    });
  // Track karma change based on vote state transition
  let karmaChange = 0;
  let voteChange = 0;
  if (existingVote) {
    // User already voted - update or remove vote
    if (existingVote.vote_type === props.body.vote_type) {
      // Removing vote: same direction
      karmaChange = -props.body.vote_type;
      voteChange = -props.body.vote_type;
      await MyGlobal.prisma.community_platform_comment_votes.delete({
        where: {
          user_id_comment_id: {
            user_id: props.member.id,
            comment_id: props.commentId,
          },
        },
      });
    } else {
      // Changing vote direction (1 to -1 or -1 to 1)
      karmaChange = (props.body.vote_type - existingVote.vote_type) * 2;
      voteChange = (props.body.vote_type - existingVote.vote_type) * 2;
      await MyGlobal.prisma.community_platform_comment_votes.update({
        where: {
          user_id_comment_id: {
            user_id: props.member.id,
            comment_id: props.commentId,
          },
        },
        data: {
          vote_type: props.body.vote_type,
        },
      });
    }
  } else {
    // New vote
    karmaChange = props.body.vote_type;
    voteChange = props.body.vote_type;
    await MyGlobal.prisma.community_platform_comment_votes.create({
      data: {
        id: v4(),
        vote_type: props.body.vote_type,
        comment_id: props.commentId, // Using correct field name
        user_id: props.member.id, // Using correct field name
        created_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Update the comment's vote_score
  const updatedVoteScore = comment.vote_score + voteChange;
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      vote_score: updatedVoteScore,
    },
  });
  // Update the author's karma
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: comment.author_id },
    data: {
      karma: { increment: karmaChange },
    },
  });
}
