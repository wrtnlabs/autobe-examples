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

export async function putCommunityPlatformAdministratorModerationActionsModerationActionIdAdministratorAction(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationActionOfAdministrator.IUpdate;
}): Promise<ICommunityPlatformModerationActionOfAdministrator> {
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: { id: props.moderationActionId },
    });
  if (!moderationAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  const adminAction =
    await MyGlobal.prisma.community_platform_moderation_action_of_administrators.findUnique(
      {
        where: { moderation_action_id: props.moderationActionId },
      },
    );
  if (!adminAction) {
    throw new HttpException("Administrator action record not found", 404);
  }
  if (adminAction.administrator_id !== props.administrator.id) {
    throw new HttpException(
      "Forbidden: You do not own this administrator action record",
      403,
    );
  }

  const { memo, administrator_session_id } = props.body;
  const hasMemo = Object.prototype.hasOwnProperty.call(props.body, "memo");
  const hasAdministratorSessionId = Object.prototype.hasOwnProperty.call(
    props.body,
    "administrator_session_id",
  );
  if (!hasMemo && !hasAdministratorSessionId) {
    throw new HttpException("No valid fields provided for update", 400);
  }

  const updated =
    await MyGlobal.prisma.community_platform_moderation_action_of_administrators.update(
      {
        where: { moderation_action_id: props.moderationActionId },
        data: {
          ...(hasMemo ? { memo: memo ?? null } : {}),
          ...(hasAdministratorSessionId ? { administrator_session_id } : {}),
        },
      },
    );

  return {
    id: updated.id,
    moderation_action_id: updated.moderation_action_id,
    administrator_id: updated.administrator_id,
    administrator_session_id: updated.administrator_session_id,
    memo: typeof updated.memo === "undefined" ? undefined : updated.memo,
    created_at: toISOStringSafe(updated.created_at),
  };
}
