import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditLikeAdminModerationLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeModerationLog> {
  const { logId } = props;

  const log = await MyGlobal.prisma.reddit_like_moderation_logs.findUnique({
    where: { id: logId },
  });

  if (!log) {
    throw new HttpException("Moderation log not found", 404);
  }

  return {
    id: log.id,
    log_type: log.log_type,
    action_description: log.action_description,
    metadata: log.metadata ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
