import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorModerationActionsModerationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationAction> {
  const action =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: { id: props.moderationActionId },
    });
  if (!action) throw new HttpException("Moderation action not found", 404);
  return {
    id: action.id,
    actor_id: action.actor_id,
    target_post_id: action.target_post_id ?? undefined,
    target_comment_id: action.target_comment_id ?? undefined,
    report_id: action.report_id ?? undefined,
    action_type: action.action_type,
    description: action.description ?? undefined,
    created_at: toISOStringSafe(action.created_at),
  };
}
