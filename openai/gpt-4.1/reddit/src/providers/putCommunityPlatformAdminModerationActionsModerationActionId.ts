import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminModerationActionsModerationActionId(props: {
  admin: AdminPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationAction.IUpdate;
}): Promise<ICommunityPlatformModerationAction> {
  // Step 1: Find moderation action
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: { id: props.moderationActionId },
    });
  if (!moderationAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  // Step 2: Prepare update data (ignore PK/id/created_at, always use admin as actor)
  const {
    action_type,
    target_post_id,
    target_comment_id,
    report_id,
    description,
  } = props.body;

  const updated =
    await MyGlobal.prisma.community_platform_moderation_actions.update({
      where: { id: props.moderationActionId },
      data: {
        actor_id: props.admin.id,
        action_type: action_type ?? undefined,
        target_post_id: target_post_id ?? undefined,
        target_comment_id: target_comment_id ?? undefined,
        report_id: report_id ?? undefined,
        description: description ?? undefined,
      },
    });

  // Step 3: Return updated moderation action (with created_at as string/date-time)
  return {
    id: updated.id,
    actor_id: updated.actor_id,
    action_type: updated.action_type,
    target_post_id: updated.target_post_id ?? undefined,
    target_comment_id: updated.target_comment_id ?? undefined,
    report_id: updated.report_id ?? undefined,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
