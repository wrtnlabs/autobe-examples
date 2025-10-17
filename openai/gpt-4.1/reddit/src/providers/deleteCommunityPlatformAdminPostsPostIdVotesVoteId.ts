import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminPostsPostIdVotesVoteId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the vote, ensure not already deleted, and post match
  const vote = await MyGlobal.prisma.community_platform_post_votes.findFirst({
    where: {
      id: props.voteId,
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
  });
  if (!vote) {
    throw new HttpException(
      "Vote not found, already deleted, or mismatched post.",
      404,
    );
  }

  // Step 2: Soft delete vote (set deleted_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: props.voteId },
    data: { deleted_at: now },
  });

  // Step 3: Audit log the action
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      action_type: "delete",
      target_table: "community_platform_post_votes",
      target_id: props.voteId,
      details: JSON.stringify({
        post_id: props.postId,
        vote_id: props.voteId,
      }),
      created_at: now,
    },
  });

  /**
   * Note: Recalculation of post score and voter karma is expected by business
   * logic, but these must be triggered by post-side-effects or dedicated
   * service, not this provider. If a recalc function exists, insert it here;
   * otherwise, document for further integration.
   */
}
