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
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";

export async function deleteCommunityPlatformMemberCommentsCommentIdRepliesReplyIdVotes(props: {
  member: MemberPayload;
  commentId: string;
  replyId: string;
}): Promise<ICommunityPlatformComment.ISummary> {
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Verify the reply exists and belongs to the comment
    const reply = await prisma.community_platform_comments.findUnique({
      where: { id: props.replyId },
    });
    if (!reply || reply.parent_id !== props.commentId) {
      throw new HttpException("Reply not found", 404);
    }
    // Delete the user's vote on this reply - this will fail silently if no vote exists
    const deleted = await prisma.community_platform_comment_votes.delete({
      where: {
        user_id_comment_id: {
          user_id: props.member.id,
          comment_id: props.replyId,
        },
      },
    });
    // If no vote was found to delete, fail with 404
    if (!deleted) {
      throw new HttpException("Vote not found", 404);
    }
    // Get the updated comment with basic fields
    const updatedReply = await prisma.community_platform_comments.findUnique({
      where: { id: props.replyId },
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author_id: true,
        parent_id: true,
        vote_score: true,
      },
    });
    if (!updatedReply) {
      throw new HttpException("Reply not found after vote deletion", 404);
    }
    // Get the vote count for this reply
    const voteCount = await prisma.community_platform_comment_votes.count({
      where: { comment_id: props.replyId },
    });
    // Get the recursive (child) reply count for this reply
    const recursiveCount = await prisma.community_platform_comments.count({
      where: { parent_id: props.replyId },
    });
    // Construct the _count object with the retrieved values
    const count = {
      community_platform_comment_votes: voteCount,
      recursive: recursiveCount,
    };
    // Return the complete summary object matching ICommunityPlatformComment.ISummary
    return {
      ...updatedReply,
      _count: count,
    };
  });
  // Transform the result to return the required summary
  return await CommunityPlatformCommentAtSummaryTransformer.transform(result);
}
