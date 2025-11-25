import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationActionOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfModerator";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorModerationActionsModerationActionIdModeratorAction(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationActionOfModerator> {
  const record =
    await MyGlobal.prisma.community_platform_moderation_action_of_moderators.findUnique(
      {
        where: { moderation_action_id: props.moderationActionId },
        include: {
          moderator: true,
          moderatorSession: true,
        },
      },
    );
  if (!record) {
    throw new HttpException(
      "Moderator-specific action not found for the given moderationActionId.",
      404,
    );
  }
  return {
    id: record.id,
    moderation_action_id: record.moderation_action_id,
    moderator: { id: record.moderator.id },
    moderator_session: {
      id: record.moderatorSession.id,
      created_at: toISOStringSafe(record.moderatorSession.created_at),
    },
    memo: record.memo,
    created_at: toISOStringSafe(record.created_at),
  };
}
