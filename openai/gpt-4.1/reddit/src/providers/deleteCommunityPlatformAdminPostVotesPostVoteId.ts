import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminPostVotesPostVoteId(props: {
  admin: AdminPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the vote record to ensure it exists
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.postVoteId },
  });
  if (!vote) {
    throw new HttpException("Post vote not found", 404);
  }
  // Step 2: Soft delete (deleted_at is DateTime?, so update)
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: props.postVoteId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
