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
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPlatformMemberCommentsCommentIdRepliesReplyIdVotes(props: {
  member: MemberPayload;
  commentId: string;
  replyId: string;
  body: ICommunityPlatformComment.IRequestVote;
}): Promise<ICommunityPlatformComment.IVoteStatus> {
  // Verify replyId exists in community_platform_comments as a comment with parent_id as commentId
  const reply = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: {
      id: props.replyId,
      parent_id: props.commentId,
    },
  });
  if (!reply) {
    throw new HttpException("Comment reply not found", 404);
  }
  // Find existing vote if any
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        comment_id: props.replyId,
        user_id: props.member.id,
      },
    });
  // Calculate karma change and determine new vote state
  let karmaChange = 0;
  let newValue: ICommunityPlatformComment.IVoteStatus["value"] = "remove";
  let shouldDeleteVote = false;
  let shouldCreateVote = false;
  let voteType: boolean | null = null;
  switch (props.body.action) {
    case "up":
      if (existingVote) {
        if (existingVote.vote_type === true) {
          // Already upvoted, remove vote
          karmaChange = -1;
          newValue = "remove";
          shouldDeleteVote = true;
        } else if (existingVote.vote_type === false) {
          // Changing from down to up
          karmaChange = 2;
          newValue = "up";
          shouldDeleteVote = true;
          shouldCreateVote = true;
          voteType = true;
        }
      } else {
        // New upvote
        karmaChange = 1;
        newValue = "up";
        shouldCreateVote = true;
        voteType = true;
      }
      break;
    case "down":
      if (existingVote) {
        if (existingVote.vote_type === false) {
          // Already downvoted, remove vote
          karmaChange = 1;
          newValue = "remove";
          shouldDeleteVote = true;
        } else if (existingVote.vote_type === true) {
          // Changing from up to down
          karmaChange = -2;
          newValue = "down";
          shouldDeleteVote = true;
          shouldCreateVote = true;
          voteType = false;
        }
      } else {
        // New downvote
        karmaChange = -1;
        newValue = "down";
        shouldCreateVote = true;
        voteType = false;
      }
      break;
    case "remove":
      if (existingVote) {
        // Remove existing vote
        karmaChange = existingVote.vote_type === true ? -1 : 1;
        newValue = "remove";
        shouldDeleteVote = true;
      } else {
        // No vote to remove, no change
        karmaChange = 0;
        newValue = "remove";
      }
      break;
  }
  // Apply changes atomically
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update comment's net vote score via karma field
    // Since karma field is not known, we will use the count of votes to calculate score
    // We don't update karma field directly because our schema doesn't specify it as a field
    // Instead we'll use the votes table to calculate the score
    // But we will update vote records
    if (shouldDeleteVote && existingVote) {
      await prisma.community_platform_comment_votes.delete({
        where: { id: existingVote.id },
      });
    }
    if (shouldCreateVote && voteType !== null) {
      await prisma.community_platform_comment_votes.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          vote_type: voteType,
          comment_id: props.replyId,
          user_id: props.member.id,
          created_at: toISOStringSafe(new Date()),
        },
      });
    }
    // Return a placeholder for the transaction
    return null;
  });
  // Calculate current vote score: upvotes minus downvotes
  const upvotesCount =
    await MyGlobal.prisma.community_platform_comment_votes.count({
      where: {
        comment_id: props.replyId,
        vote_type: true,
      },
    });
  const downvotesCount =
    await MyGlobal.prisma.community_platform_comment_votes.count({
      where: {
        comment_id: props.replyId,
        vote_type: false,
      },
    });
  const currentScore = upvotesCount - downvotesCount;
  // Return vote status with new value and calculated score
  return {
    value: newValue,
    score: currentScore,
  } satisfies ICommunityPlatformComment.IVoteStatus;
}
