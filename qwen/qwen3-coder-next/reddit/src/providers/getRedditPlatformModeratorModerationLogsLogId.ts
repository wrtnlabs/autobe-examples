import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationLog";
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

export async function getRedditPlatformModeratorModerationLogsLogId(props: {
  moderator: ModeratorPayload;
  logId: string;
}): Promise<IRedditPlatformModerationLog> {
  const log = await MyGlobal.prisma.reddit_platform_moderation_logs.findUnique({
    where: { id: props.logId },
  });
  if (!log) {
    throw new HttpException("Moderation log not found", 404);
  }
  return {
    id: log.id,
    moderator_id: log.moderator_id,
    community_id: log.community_id,
    affected_user_id: log.affected_user_id,
    post_id: log.post_id,
    comment_id: log.comment_id,
    report_id: log.report_id,
    action_type: log.action_type,
    action_description: log.action_description,
    context: log.context,
    executed_at: log.executed_at.toISOString() as string &
      tags.Format<"date-time">,
    reversible: log.reversible,
    duration: log.duration,
    ip_address: log.ip_address,
    metadata: log.metadata,
    before_snapshot: log.before_snapshot,
    after_snapshot: log.after_snapshot,
    auto_moderated: log.auto_moderated,
  };
}
