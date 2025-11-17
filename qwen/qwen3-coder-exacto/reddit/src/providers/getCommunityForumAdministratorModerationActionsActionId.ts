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

export async function getCommunityForumAdministratorModerationActionsActionId(props: {
  administrator: AdministratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<ICommunityForumCommunityModerationAction> {
  // Find the moderation action by its ID
  const action =
    await MyGlobal.prisma.community_forum_moderation_actions.findUnique({
      where: {
        id: props.actionId,
      },
    });

  // If action not found, throw 404
  if (!action) {
    throw new HttpException("Moderation action not found", 404);
  }

  // Transform the database record to the DTO format
  return {
    id: action.id,
    community_forum_moderator_id: action.community_forum_moderator_id,
    community_forum_report_id: action.community_forum_report_id ?? undefined,
    community_forum_community_id: action.community_forum_community_id,
    action_type: action.action_type,
    reason: action.reason,
    details: action.details ?? undefined,
    created_at: toISOStringSafe(action.created_at),
    updated_at: toISOStringSafe(action.updated_at),
  };
}
