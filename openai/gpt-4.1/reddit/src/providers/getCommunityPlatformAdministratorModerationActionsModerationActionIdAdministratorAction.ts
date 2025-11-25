import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationActionOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorModerationActionsModerationActionIdAdministratorAction(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationActionOfAdministrator> {
  const record =
    await MyGlobal.prisma.community_platform_moderation_action_of_administrators.findUnique(
      {
        where: {
          moderation_action_id: props.moderationActionId,
        },
      },
    );

  if (!record) {
    throw new HttpException("Administrator moderation action not found", 404);
  }

  return {
    id: record.id,
    moderation_action_id: record.moderation_action_id,
    administrator_id: record.administrator_id,
    administrator_session_id: record.administrator_session_id,
    memo: record.memo === null ? undefined : record.memo,
    created_at: toISOStringSafe(record.created_at),
  };
}
