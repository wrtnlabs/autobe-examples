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

export async function deleteCommunityPlatformMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate comment exists and is not deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, author_id: true, deleted_at: true },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 410);
  }
  // 2. Check for existing vote
  const vote = await MyGlobal.prisma.community_platform_votes.findUnique({
    where: {
      comment_id_member_id: {
        comment_id: props.commentId,
        member_id: props.member.id,
      },
    },
  });
  if (vote === null) {
    throw new HttpException("No vote found on this comment", 404);
  }
  // 3. Calculate score and karma adjustments
  // Removing upvote: score -1, karma -1
  // Removing downvote: score +1, karma +1
  const scoreDelta = vote.vote_type === "upvote" ? -1 : 1;
  const karmaDelta = vote.vote_type === "upvote" ? -1 : 1;
  // 4. Execute atomic transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_votes.delete({
      where: { id: vote.id },
    }),
    MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: { score: { increment: scoreDelta } },
    }),
    MyGlobal.prisma.community_platform_members.update({
      where: { id: comment.author_id },
      data: { karma: { increment: karmaDelta } },
    }),
  ]);
}
