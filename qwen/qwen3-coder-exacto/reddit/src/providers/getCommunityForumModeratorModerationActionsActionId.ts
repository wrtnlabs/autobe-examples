import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityForumModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<ICommunityForumCommunityModerationAction> {
  // Fetch the moderation action record
  const action =
    await MyGlobal.prisma.community_forum_moderation_actions.findUnique({
      where: {
        id: props.actionId,
      },
    });

  // If the action doesn't exist, throw a 404 error
  if (!action) {
    throw new HttpException("Moderation action not found", 404);
  }

  // Return the mapped response
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
