import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditLikeModeratorModerationLogsLogId(props: {
  moderator: ModeratorPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeModerationLog> {
  const { moderator, logId } = props;

  const log =
    await MyGlobal.prisma.reddit_like_moderation_logs.findUniqueOrThrow({
      where: { id: logId },
      select: {
        id: true,
        community_id: true,
        log_type: true,
        action_description: true,
        metadata: true,
        created_at: true,
      },
    });

  if (log.community_id !== null) {
    const moderatorAssignment =
      await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
        where: {
          community_id: log.community_id,
          moderator_id: moderator.id,
        },
      });

    if (!moderatorAssignment) {
      throw new HttpException(
        "Unauthorized: You can only access logs for communities you moderate",
        403,
      );
    }
  }

  return {
    id: log.id as string & tags.Format<"uuid">,
    log_type: log.log_type,
    action_description: log.action_description,
    metadata: log.metadata ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
