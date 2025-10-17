import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminModerationActionsModerationActionId(props: {
  admin: AdminPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check moderation action existence
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: { id: props.moderationActionId },
    });
  if (!moderationAction) {
    throw new HttpException("Moderation action not found", 404);
  }
  // Hard delete
  await MyGlobal.prisma.community_platform_moderation_actions.delete({
    where: { id: props.moderationActionId },
  });
}
