import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityForumAdministratorModerationActionsActionId(props: {
  administrator: AdministratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the moderation action exists
  const existingAction =
    await MyGlobal.prisma.community_forum_moderation_actions.findUnique({
      where: {
        id: props.actionId,
      },
    });

  // If the action doesn't exist, throw a 404 error
  if (!existingAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  // Permanently delete the moderation action
  await MyGlobal.prisma.community_forum_moderation_actions.delete({
    where: {
      id: props.actionId,
    },
  });
}
