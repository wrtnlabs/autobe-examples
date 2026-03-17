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

export async function deleteCommunityPlatformMemberCommentsCommentIdVotesMine(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify comment exists and is not deleted
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId, deleted_at: null },
    });
  // Check if vote exists and get its type
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        community_platform_member_id_community_platform_comment_id: {
          community_platform_member_id: props.member.id,
          community_platform_comment_id: props.commentId,
        },
      },
    });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote already deleted", 404);
  }
  // Calculate karma adjustment based on vote type
  const karmaAdjustment =
    vote.type === "upvote" ? -1 : vote.type === "downvote" ? 1 : 0;
  // Delete the vote
  await MyGlobal.prisma.community_platform_comment_votes.update({
    where: { id: vote.id },
    data: { deleted_at: new Date() },
  });
  // Update karma if needed
  if (karmaAdjustment !== 0) {
    await MyGlobal.prisma.community_platform_karmas.update({
      where: { member_id: comment.member_id },
      data: {
        score: { increment: karmaAdjustment },
        updated_at: new Date(),
      },
    });
  }
  // Return void
  return;
}
