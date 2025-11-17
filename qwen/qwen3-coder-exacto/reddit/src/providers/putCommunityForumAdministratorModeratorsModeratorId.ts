import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityForumAdministratorModeratorsModeratorId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityForumCommunityModerator.IUpdate;
}): Promise<ICommunityForumCommunityModerator> {
  // Check if moderator exists with user information
  const existingModerator =
    await MyGlobal.prisma.community_forum_moderators.findUnique({
      where: { id: props.moderatorId },
      include: { user: true },
    });

  if (!existingModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Prepare update data
  const updateData: Prisma.community_forum_moderatorsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Only update created_at if provided in the body
  if (props.body.created_at !== undefined) {
    updateData.created_at = props.body.created_at;
  }

  // Update the moderator
  const updatedModerator =
    await MyGlobal.prisma.community_forum_moderators.update({
      where: { id: props.moderatorId },
      data: updateData,
    });

  // Get user information
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: { id: updatedModerator.community_forum_user_id },
  });

  if (!user) {
    throw new HttpException("Associated user not found", 404);
  }

  return {
    id: updatedModerator.id,
    community_forum_user_id: updatedModerator.community_forum_user_id,
    user: {
      id: user.id,
      username: user.username,
    },
    created_at: toISOStringSafe(updatedModerator.created_at),
    updated_at: toISOStringSafe(updatedModerator.updated_at),
  };
}
