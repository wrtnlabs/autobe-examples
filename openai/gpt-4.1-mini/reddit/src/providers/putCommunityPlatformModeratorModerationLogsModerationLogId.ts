import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
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

export async function putCommunityPlatformModeratorModerationLogsModerationLogId(props: {
  moderator: ModeratorPayload;
  moderationLogId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationLog.IUpdate;
}): Promise<ICommunityPlatformModerationLog> {
  const existing =
    await MyGlobal.prisma.community_platform_moderation_logs.findUnique({
      where: { id: props.moderationLogId },
    });
  if (!existing) {
    throw new HttpException("Moderation log not found", 404);
  }
  const updated =
    await MyGlobal.prisma.community_platform_moderation_logs.update({
      where: { id: props.moderationLogId },
      data: {},
    });
  return {
    id: updated.id,
    moderator_id: updated.moderator_id,
    post_id: updated.post_id === null ? undefined : updated.post_id,
    comment_id: updated.comment_id === null ? undefined : updated.comment_id,
    action_type: updated.action_type,
    action_details:
      updated.action_details === null ? undefined : updated.action_details,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : (toISOStringSafe(updated.deleted_at) as string &
            tags.Format<"date-time">),
  };
}
