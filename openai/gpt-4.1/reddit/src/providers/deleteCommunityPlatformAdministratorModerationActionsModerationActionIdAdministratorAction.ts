import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorModerationActionsModerationActionIdAdministratorAction(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, locate the specific admin moderation action by moderation_action_id
  const record =
    await MyGlobal.prisma.community_platform_moderation_action_of_administrators.findUnique(
      {
        where: { moderation_action_id: props.moderationActionId },
      },
    );

  if (!record) {
    throw new HttpException(
      "Administrator moderation action not found for specified moderation action ID.",
      404,
    );
  }

  await MyGlobal.prisma.community_platform_moderation_action_of_administrators.delete(
    {
      where: { moderation_action_id: props.moderationActionId },
    },
  );
  // Eventual audit logging would be handled elsewhere as per platform standards.
}
