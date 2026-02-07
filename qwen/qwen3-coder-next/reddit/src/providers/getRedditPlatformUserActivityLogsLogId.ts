import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUserActivityLogsLogId(props: {
  logId: string;
}): Promise<IRedditPlatformUserActivityLog> {
  const log =
    await MyGlobal.prisma.reddit_platform_user_activity_logs.findUnique({
      where: { id: props.logId },
      select: {
        id: true,
        user_id: true,
        community_id: true,
        post_id: true,
        comment_id: true,
        action_type: true,
        description: true,
        context: true,
        occurred_at: true,
        ip_address: true,
        user_agent: true,
        is_moderator_action: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!log) {
    throw new HttpException("Activity log not found", 404);
  }
  return {
    id: log.id,
    user_id: log.user_id,
    community_id: log.community_id,
    post_id: log.post_id,
    comment_id: log.comment_id,
    action_type: log.action_type,
    description: log.description,
    context: log.context,
    occurred_at: toISOStringSafe(log.occurred_at),
    ip_address: log.ip_address,
    user_agent: log.user_agent,
    is_moderator_action: log.is_moderator_action,
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
  };
}
