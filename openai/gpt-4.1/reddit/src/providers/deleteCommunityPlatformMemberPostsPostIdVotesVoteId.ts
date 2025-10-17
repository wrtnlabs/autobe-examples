import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  // Step 1: Fetch vote, check existence, correct post, and ownership
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.voteId },
    select: {
      id: true,
      community_platform_post_id: true,
      community_platform_member_id: true,
      deleted_at: true,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.community_platform_post_id !== props.postId) {
    throw new HttpException("Vote does not belong to given post", 404);
  }
  if (vote.community_platform_member_id !== props.member.id) {
    throw new HttpException("Unauthorized: Can only delete your own vote", 403);
  }
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote is already deleted", 400);
  }
  // Soft delete: update deleted_at
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: props.voteId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // NOTE: Score/karma recalculation, audit logs must be handled elsewhere as no details exist for them
}
