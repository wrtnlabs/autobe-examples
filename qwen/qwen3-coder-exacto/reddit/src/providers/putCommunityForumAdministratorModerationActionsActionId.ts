import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityForumAdministratorModerationActionsActionId(props: {
  administrator: AdministratorPayload;
  actionId: string & tags.Format<"uuid">;
  body: ICommunityForumCommunityModerationAction.IUpdate;
}): Promise<ICommunityForumCommunityModerationAction> {
  // First, verify that the moderation action exists
  const existingAction =
    await MyGlobal.prisma.community_forum_moderation_actions.findUnique({
      where: { id: props.actionId },
    });

  if (!existingAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  // Update the moderation action record
  // Note: We don't update the moderator ID as it should remain the same
  // We also don't update created_at as it should remain unchanged
  // updated_at is automatically set by the system
  const updatedAction =
    await MyGlobal.prisma.community_forum_moderation_actions.update({
      where: { id: props.actionId },
      data: {
        action_type: props.body.action_type,
        reason: props.body.reason,
        details: props.body.details,
        community_forum_report_id: props.body.community_forum_report_id,
        community_forum_community_id: props.body.community_forum_community_id,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return the updated moderation action in the correct format
  return {
    id: updatedAction.id,
    community_forum_moderator_id: updatedAction.community_forum_moderator_id,
    community_forum_report_id:
      updatedAction.community_forum_report_id !== null
        ? (updatedAction.community_forum_report_id satisfies string as string)
        : undefined,
    community_forum_community_id: updatedAction.community_forum_community_id,
    action_type: updatedAction.action_type,
    reason: updatedAction.reason,
    details: updatedAction.details !== null ? updatedAction.details : undefined,
    created_at: toISOStringSafe(updatedAction.created_at),
    updated_at: toISOStringSafe(updatedAction.updated_at),
  };
}
