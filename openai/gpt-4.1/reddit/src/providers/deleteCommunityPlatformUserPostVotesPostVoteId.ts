import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Find the post vote record
  const postVote =
    await MyGlobal.prisma.community_platform_post_votes.findUnique({
      where: { id: props.postVoteId },
    });

  // If not found or already deleted, return error
  if (!postVote || postVote.deleted_at !== null) {
    throw new HttpException("Post vote not found or already deleted.", 404);
  }

  // Only the vote owner may delete
  if (postVote.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to delete this vote.",
      403,
    );
  }

  // Perform soft deletion
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: props.postVoteId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // Success: nothing to return
}
