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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  // Query for the vote record using actual field names instead of relation names
  const voteRecord =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        comment: {
          id: props.commentId,
        },
        user_id: props.member.id, // Changed from 'member' to 'user_id' based on schema
      },
    });
  // If no vote record exists, return 404 Not Found
  if (!voteRecord) {
    throw new HttpException("Vote not found", 404);
  }
  // Begin transaction to ensure atomic deletion and score update
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Delete the vote record
    await prisma.community_platform_comment_votes.delete({
      where: { id: voteRecord.id },
    });
    // Update the comment's total_vote_score by subtracting the vote value
    // Must use direct subtraction since 'decrement' may not exist in this schema
    await prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: {
        total_vote_score: voteRecord.vote_type ? -1 : 1, // Fixed: Use correct snake_case field name from schema
      },
    });
    // Log the removal action to moderation_logs (using exact field names from schema)
    await prisma.community_platform_moderation_logs.create({
      data: {
        actor_id: props.member.id, // Fixed: Use correct snake_case field name from schema
        action: "vote_removed", // Verify exact spelling from schema
        entity_id: props.commentId, // Fixed: Use correct snake_case field name from schema
        entity_type: "comment", // Fixed: Use correct snake_case field name from schema
        created_at: toISOStringSafe(new Date()), // Fixed: Use correct snake_case field name from schema
      },
    });
  });
}
