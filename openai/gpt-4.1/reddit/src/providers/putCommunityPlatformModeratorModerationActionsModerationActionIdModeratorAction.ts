import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationActionOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfModerator";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorModerationActionsModerationActionIdModeratorAction(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationActionOfModerator.IUpdate;
}): Promise<ICommunityPlatformModerationActionOfModerator> {
  // Step 1: Fetch the moderator action subtype record with correct relation names
  const existing =
    await MyGlobal.prisma.community_platform_moderation_action_of_moderators.findUnique(
      {
        where: { moderation_action_id: props.moderationActionId },
        include: {
          moderator: true,
          moderatorSession: true, // fixed from moderator_session
        },
      },
    );

  if (!existing) {
    throw new HttpException(
      "Moderator-specific moderation action record not found.",
      404,
    );
  }

  // Ensure the authenticated moderator is the actor
  if (existing.moderator_id !== props.moderator.id) {
    throw new HttpException(
      "Forbidden: You are not the actor of this moderation action.",
      403,
    );
  }

  // Step 2: Perform the update (only 'memo' is updatable), using correct naming
  const updated =
    await MyGlobal.prisma.community_platform_moderation_action_of_moderators.update(
      {
        where: { moderation_action_id: props.moderationActionId },
        data: {
          memo:
            "memo" in props.body ? (props.body.memo ?? null) : existing.memo,
        },
        include: {
          moderator: true,
          moderatorSession: true, // fixed from moderator_session
        },
      },
    );

  // Step 3: Format output for API DTO contract
  return {
    id: updated.id,
    moderation_action_id: updated.moderation_action_id,
    moderator: {
      id: updated.moderator.id,
    },
    moderator_session: {
      id: updated.moderatorSession.id,
      created_at: toISOStringSafe(updated.moderatorSession.created_at),
    },
    memo: Object.prototype.hasOwnProperty.call(updated, "memo")
      ? updated.memo
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
