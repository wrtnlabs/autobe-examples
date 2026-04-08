import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneModeratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the moderator assignment to be removed
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      select: {
        id: true,
        reddit_clone_community_id: true,
        role: true,
        deleted_at: true,
      },
    });
  // Verify the moderator assignment belongs to the specified community
  if (moderatorAssignment.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Moderator assignment not found", 404);
  }
  // Verify the moderator assignment is not already deleted
  if (moderatorAssignment.deleted_at !== null) {
    throw new HttpException("Moderator assignment not found", 404);
  }
  // Verify the role is not 'owner' - cannot remove the owner
  if (moderatorAssignment.role === "owner") {
    throw new HttpException("Cannot remove the owner role", 400);
  }
  // Verify the requester is the owner of this community
  const requesterAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_user_profile_id: props.moderator.id,
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  if (requesterAssignment === null || requesterAssignment.role !== "owner") {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the moderator assignment
  await MyGlobal.prisma.reddit_clone_community_moderators.update({
    where: { id: props.moderatorId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
