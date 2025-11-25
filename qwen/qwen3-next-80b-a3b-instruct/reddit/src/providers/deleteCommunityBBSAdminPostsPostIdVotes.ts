import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityBBSAdminPostsPostIdVotes(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.community_bbs_post_votes.findFirst({
    where: {
      community_bbs_post_id: props.postId,
      community_bbs_citizen_id: props.admin.id,
      deleted_at: null,
    },
  });

  if (!vote) {
    throw new HttpException("Vote not found or already deleted", 404);
  }

  const now = toISOStringSafe(new Date());

  // Update the vote record to mark it as deleted
  await MyGlobal.prisma.community_bbs_post_votes.update({
    where: { id: vote.id },
    data: { deleted_at: now },
  });

  // Since community_bbs_posts has no score field, we cannot update it directly.
  // The system must maintain vote counts in a summary table (like community_bbs_user_karma_summary)
  // but we don't have its schema. This implementation can only delete the vote record.
  // Further work requires the schema for the summary tables that track post scores.
}
