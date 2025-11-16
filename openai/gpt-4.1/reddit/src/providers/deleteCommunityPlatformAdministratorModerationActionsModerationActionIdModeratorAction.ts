import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorModerationActionsModerationActionIdModeratorAction(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the moderator action exists for the given moderation_action_id
  const existing =
    await MyGlobal.prisma.community_platform_moderation_action_of_moderators.findUnique(
      {
        where: { moderation_action_id: props.moderationActionId },
      },
    );
  if (!existing) {
    throw new HttpException(
      "Moderator-specific moderation action not found.",
      404,
    );
  }
  // Perform the hard delete
  await MyGlobal.prisma.community_platform_moderation_action_of_moderators.delete(
    {
      where: { moderation_action_id: props.moderationActionId },
    },
  );
  return;
}
