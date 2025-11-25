import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityForumModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, check if the moderation action exists
  const action =
    await MyGlobal.prisma.community_forum_moderation_actions.findUnique({
      where: {
        id: props.actionId,
      },
    });

  if (!action) {
    throw new HttpException("Moderation action not found", 404);
  }

  // Check if the moderator has permission to delete this action
  // In a real implementation, we might also check for admin privileges here
  if (action.community_forum_moderator_id !== props.moderator.id) {
    // Note: In a full implementation, we would check if the moderator has admin privileges
    // that would allow them to delete any moderation action
    throw new HttpException(
      "You don't have permission to delete this moderation action",
      403,
    );
  }

  // Soft delete the moderation action by setting deleted_at
  // This preserves the audit trail while marking the record as deleted
  await MyGlobal.prisma.community_forum_moderation_actions.update({
    where: {
      id: props.actionId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
