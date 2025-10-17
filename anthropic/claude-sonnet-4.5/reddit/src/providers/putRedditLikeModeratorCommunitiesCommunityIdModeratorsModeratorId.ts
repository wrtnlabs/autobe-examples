import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putRedditLikeModeratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityModerator.IUpdate;
}): Promise<IRedditLikeCommunityModerator> {
  const { moderator, communityId, moderatorId, body } = props;

  const targetAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        id: moderatorId,
        community_id: communityId,
      },
    });

  if (!targetAssignment) {
    throw new HttpException(
      "Moderator assignment not found in this community",
      404,
    );
  }

  const requestingModeratorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        moderator_id: moderator.id,
        community_id: communityId,
      },
    });

  if (!requestingModeratorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  const isPrimaryModerator = requestingModeratorAssignment.is_primary;
  const hasManageModeratorsPermission =
    requestingModeratorAssignment.permissions.includes("manage_moderators");

  if (!isPrimaryModerator) {
    if (!hasManageModeratorsPermission) {
      throw new HttpException(
        "Unauthorized: You need manage_moderators permission to update moderator permissions",
        403,
      );
    }

    if (targetAssignment.is_primary) {
      throw new HttpException(
        "Unauthorized: Cannot modify primary moderator's permissions",
        403,
      );
    }

    if (
      targetAssignment.assigned_at <= requestingModeratorAssignment.assigned_at
    ) {
      throw new HttpException(
        "Unauthorized: You can only modify permissions for moderators assigned after you",
        403,
      );
    }
  }

  if (!isPrimaryModerator && targetAssignment.moderator_id === moderator.id) {
    throw new HttpException(
      "Unauthorized: You cannot modify your own permissions",
      403,
    );
  }

  const updated = await MyGlobal.prisma.reddit_like_community_moderators.update(
    {
      where: {
        id: moderatorId,
      },
      data: {
        permissions: body.permissions ?? undefined,
      },
    },
  );

  return {
    id: updated.id,
    community_id: updated.community_id,
    moderator_id: updated.moderator_id,
    assigned_at: toISOStringSafe(updated.assigned_at),
    is_primary: updated.is_primary,
    permissions: updated.permissions,
  };
}
