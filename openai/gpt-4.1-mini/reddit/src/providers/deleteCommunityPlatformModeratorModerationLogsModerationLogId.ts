import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformModeratorModerationLogsModerationLogId(props: {
  moderator: ModeratorPayload;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const deleted =
    await MyGlobal.prisma.community_platform_moderation_logs.deleteMany({
      where: { id: props.moderationLogId },
    });
  if (deleted.count === 0) {
    throw new HttpException("Moderation log not found", 404);
  }
}
