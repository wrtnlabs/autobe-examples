import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserPostVotesPostVoteId(props: {
  user: UserPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, postVoteId } = props;
  // 1. Fetch vote by ID
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: postVoteId },
  });
  if (!vote || vote.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }
  // 2. Ownership check
  if (vote.community_platform_user_id !== user.id) {
    throw new HttpException("Forbidden: Not the owner of this vote", 403);
  }
  // 3. Perform soft delete
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: postVoteId },
    data: { deleted_at: now, updated_at: now },
  });
}
