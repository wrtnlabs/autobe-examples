import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationActionOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postCommunityPlatformAdministratorModerationActionsModerationActionIdAdministratorAction(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationActionOfAdministrator.ICreate;
}): Promise<ICommunityPlatformModerationActionOfAdministrator> {
  // Step 1: Check that the parent moderation action exists
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: { id: props.moderationActionId },
    });
  if (!moderationAction) {
    throw new HttpException("Parent moderation action not found.", 404);
  }

  // Step 2: Enforce 1:1 - check if administrator action already exists
  const existingAdminAction =
    await MyGlobal.prisma.community_platform_moderation_action_of_administrators.findUnique(
      {
        where: { moderation_action_id: props.moderationActionId },
      },
    );
  if (existingAdminAction) {
    throw new HttpException(
      "Administrator action for this moderation action already exists.",
      409,
    );
  }

  // Step 3: Validate that the acting administrator matches context
  if (props.body.administrator_id !== props.administrator.id) {
    throw new HttpException(
      "Mismatch between acting administrator and payload administrator_id.",
      403,
    );
  }

  // Step 4: Validate administrator session belongs to this admin and is active
  const adminSession =
    await MyGlobal.prisma.community_platform_administrator_sessions.findUnique({
      where: {
        id: props.body.administrator_session_id,
      },
    });
  if (
    !adminSession ||
    adminSession.community_platform_administrator_id !== props.administrator.id
  ) {
    throw new HttpException("Administrator session invalid or not found.", 403);
  }

  // Step 5: Insert administrator moderation action
  const created =
    await MyGlobal.prisma.community_platform_moderation_action_of_administrators.create(
      {
        data: {
          id: v4(),
          moderation_action_id: props.moderationActionId,
          administrator_id: props.body.administrator_id,
          administrator_session_id: props.body.administrator_session_id,
          memo: props.body.memo ?? null,
          created_at: toISOStringSafe(new Date()),
        },
      },
    );
  return {
    id: created.id,
    moderation_action_id: created.moderation_action_id,
    administrator_id: created.administrator_id,
    administrator_session_id: created.administrator_session_id,
    memo: created.memo ?? null,
    created_at: toISOStringSafe(created.created_at),
  };
}
