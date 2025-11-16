import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorModerationActionsModerationActionId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Confirm the moderation action exists
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: { id: props.moderationActionId },
    });

  if (!moderationAction) {
    throw new HttpException("Moderation action not found.", 404);
  }

  // Start a transaction to ensure referential integrity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete moderator-specific subtype (if exists)
    await tx.community_platform_moderation_action_of_moderators.deleteMany({
      where: { moderation_action_id: props.moderationActionId },
    });

    // Delete administrator-specific subtype (if exists)
    await tx.community_platform_moderation_action_of_administrators.deleteMany({
      where: { moderation_action_id: props.moderationActionId },
    });

    // Delete the moderation action itself
    await tx.community_platform_moderation_actions.delete({
      where: { id: props.moderationActionId },
    });
  });
}
