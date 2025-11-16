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

export async function postCommunityPlatformModeratorModerationActionsModerationActionIdModeratorAction(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationActionOfModerator.ICreate;
}): Promise<ICommunityPlatformModerationActionOfModerator> {
  // Check that the parent moderation action exists
  const parentAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: {
        id: props.moderationActionId,
      },
      select: { id: true },
    });
  if (!parentAction) {
    throw new HttpException("Parent moderation action not found", 404);
  }

  // Check that a moderator-specific action does not already exist for this parent action (enforces 1:1)
  const existingModeratorAction =
    await MyGlobal.prisma.community_platform_moderation_action_of_moderators.findUnique(
      {
        where: {
          moderation_action_id: props.moderationActionId,
        },
        select: { id: true },
      },
    );
  if (existingModeratorAction) {
    throw new HttpException(
      "Moderator-specific moderation action already exists for this moderation action",
      409,
    );
  }

  // Fetch moderator and session summaries
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: {
        id: props.moderator.id,
      },
      select: {
        id: true,
      },
    });
  if (!moderator) {
    throw new HttpException("Moderator not found", 403);
  }

  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.findUnique({
      where: {
        id: props.moderator.session_id,
      },
      select: {
        id: true,
        created_at: true,
      },
    });
  if (!session) {
    throw new HttpException("Moderator session not found", 403);
  }

  // Create the moderator-specific moderation action subtype
  const created =
    await MyGlobal.prisma.community_platform_moderation_action_of_moderators.create(
      {
        data: {
          id: v4(),
          moderation_action_id: props.moderationActionId,
          moderator_id: props.moderator.id,
          moderator_session_id: props.moderator.session_id,
          memo: Object.prototype.hasOwnProperty.call(props.body, "memo")
            ? props.body.memo
            : undefined,
          created_at: toISOStringSafe(new Date()),
        },
      },
    );

  // Return result in the API DTO shape, with strict type handling and date formatting
  return {
    id: created.id,
    moderation_action_id: created.moderation_action_id,
    moderator: {
      id: created.moderator_id,
    },
    moderator_session: {
      id: created.moderator_session_id,
      created_at: session.created_at ? toISOStringSafe(session.created_at) : "",
    },
    memo: Object.prototype.hasOwnProperty.call(created, "memo")
      ? created.memo
      : undefined,
    created_at: toISOStringSafe(created.created_at),
  };
}
