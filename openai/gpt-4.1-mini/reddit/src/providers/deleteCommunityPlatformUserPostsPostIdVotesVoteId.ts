import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformUserPostsPostIdVotesVoteId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the vote record by voteId
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
    });
  // Check that the vote belongs to the specified post
  if (vote.post_id !== props.postId) {
    throw new HttpException("Vote not found for the specified post", 404);
  }
  // Check if user is moderator
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { id: props.user.id },
    });
  // User is authorized if user is moderator or admin role or vote owner (if owner info existed)
  // Since no user_id in vote, restrict delete to moderators only for now
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the vote
  await MyGlobal.prisma.community_platform_post_votes.delete({
    where: { id: props.voteId },
  });
}
