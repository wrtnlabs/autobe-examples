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

export async function putCommunityPlatformModeratorModerationActionsModerationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationAction.IUpdate;
}): Promise<ICommunityPlatformModerationAction> {
  // 1. Find moderation action by ID
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: { id: props.moderationActionId },
    });
  if (!moderationAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  // 2. Only the assigned moderator (props.moderator.id) can update
  if (moderationAction.actor_id !== props.moderator.id) {
    throw new HttpException(
      "Forbidden: You are not authorized to update this moderation action",
      403,
    );
  }

  // 3. Reject empty body
  const fieldsProvided = Object.keys(props.body).length > 0;
  if (!fieldsProvided) {
    throw new HttpException("No update fields provided", 400);
  }

  // 4. Build update input (only updatable fields)
  // Only assign fields that are present in props.body
  const now = toISOStringSafe(new Date());
  const updateFields = {
    ...(props.body.actor_id !== undefined
      ? { actor_id: props.body.actor_id }
      : {}),
    ...(props.body.action_type !== undefined
      ? { action_type: props.body.action_type }
      : {}),
    ...(props.body.target_post_id !== undefined
      ? { target_post_id: props.body.target_post_id }
      : {}),
    ...(props.body.target_comment_id !== undefined
      ? { target_comment_id: props.body.target_comment_id }
      : {}),
    ...(props.body.report_id !== undefined
      ? { report_id: props.body.report_id }
      : {}),
    ...(props.body.description !== undefined
      ? { description: props.body.description }
      : {}),
    created_at: now, // For audit trail - updating the timestamp to now
  };
  // 5. Update moderation action and select all fields for return
  const updated =
    await MyGlobal.prisma.community_platform_moderation_actions.update({
      where: { id: props.moderationActionId },
      data: updateFields,
      select: {
        id: true,
        actor_id: true,
        target_post_id: true,
        target_comment_id: true,
        report_id: true,
        action_type: true,
        description: true,
        created_at: true,
      },
    });
  // 6. Format for DTO: all date fields stringified, handle nulls
  return {
    id: updated.id,
    actor_id: updated.actor_id,
    target_post_id: updated.target_post_id ?? undefined,
    target_comment_id: updated.target_comment_id ?? undefined,
    report_id: updated.report_id ?? undefined,
    action_type: updated.action_type,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
