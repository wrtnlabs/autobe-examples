import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify comment exists and belongs to the post
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_member_id: true,
        vote_score: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 404);
  }
  // Find the vote by this member on this comment
  const vote = await MyGlobal.prisma.community_platform_comment_votes.findFirst(
    {
      where: {
        community_platform_comment_id: props.commentId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true, vote_type: true },
    },
  );
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  // Determine adjustments (reverse of original vote effect)
  // Removing upvote: karma -1, vote_score -1
  // Removing downvote: karma +1, vote_score +1
  const scoreAdjustment = vote.vote_type === "upvote" ? -1 : 1;
  // Use transaction for atomic operations
  await MyGlobal.prisma.$transaction([
    // Delete the vote
    MyGlobal.prisma.community_platform_comment_votes.delete({
      where: { id: vote.id },
    }),
    // Update comment vote_score
    MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: comment.vote_score + scoreAdjustment,
      },
    }),
    // Update author karma
    MyGlobal.prisma.community_platform_members.update({
      where: { id: comment.community_platform_member_id },
      data: {
        karma: { increment: scoreAdjustment },
      },
    }),
  ]);
}
