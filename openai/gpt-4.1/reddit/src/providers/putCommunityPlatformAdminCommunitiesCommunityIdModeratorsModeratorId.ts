import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IUpdate;
}): Promise<ICommunityPlatformCommunityModerator> {
  const { communityId, moderatorId, body } = props;

  // Find moderator assignment
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        id: moderatorId,
        community_platform_community_id: communityId,
      },
    });
  if (!moderator) {
    throw new HttpException("Moderator assignment not found", 404);
  }

  // Only assigned_at is updatable. If provided, must not be earlier.
  let newAssignedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    moderator.assigned_at,
  );
  if (body.assigned_at !== undefined) {
    if (
      new Date(body.assigned_at).getTime() <
      new Date(moderator.assigned_at).getTime()
    ) {
      throw new HttpException("Cannot set assigned_at to an earlier date", 400);
    }
    newAssignedAt = body.assigned_at;
  }

  const updated =
    await MyGlobal.prisma.community_platform_community_moderators.update({
      where: { id: moderatorId },
      data: { assigned_at: newAssignedAt },
    });

  const user = await MyGlobal.prisma.community_platform_users.findUniqueOrThrow(
    {
      where: { id: updated.community_platform_user_id },
    },
  );
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: updated.community_platform_community_id },
    });

  return {
    id: updated.id,
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
    },
    user: {
      id: user.id,
      display_name: user.display_name,
    },
    assigned_at: toISOStringSafe(updated.assigned_at),
  };
}
