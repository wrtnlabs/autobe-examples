import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditLikeModeratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, communityId, moderatorId } = props;

  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: communityId },
  });

  const requestingModeratorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (requestingModeratorAssignment === null) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  const targetModeratorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderatorId,
      },
    });

  if (targetModeratorAssignment === null) {
    throw new HttpException(
      "Not Found: Moderator assignment does not exist",
      404,
    );
  }

  if (targetModeratorAssignment.is_primary) {
    throw new HttpException(
      "Forbidden: Cannot remove the primary moderator",
      403,
    );
  }

  if (moderator.id === moderatorId) {
    throw new HttpException(
      "Forbidden: Cannot remove yourself as moderator",
      403,
    );
  }

  const isPrimaryModerator = requestingModeratorAssignment.is_primary;
  const hasManageModeratorsPermission =
    requestingModeratorAssignment.permissions.includes("manage_moderators");

  if (!isPrimaryModerator && !hasManageModeratorsPermission) {
    throw new HttpException(
      "Unauthorized: You do not have permission to remove moderators",
      403,
    );
  }

  if (!isPrimaryModerator && hasManageModeratorsPermission) {
    if (
      targetModeratorAssignment.assigned_at <=
      requestingModeratorAssignment.assigned_at
    ) {
      throw new HttpException(
        "Unauthorized: You can only remove moderators assigned after you",
        403,
      );
    }
  }

  await MyGlobal.prisma.reddit_like_community_moderators.delete({
    where: { id: targetModeratorAssignment.id },
  });
}
