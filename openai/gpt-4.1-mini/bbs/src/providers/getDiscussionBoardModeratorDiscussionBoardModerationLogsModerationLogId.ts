import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorDiscussionBoardModerationLogsModerationLogId(props: {
  moderator: ModeratorPayload;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationLog> {
  const { moderationLogId } = props;

  let record;
  try {
    record =
      await MyGlobal.prisma.discussion_board_moderation_logs.findUniqueOrThrow({
        where: { id: moderationLogId },
      });
  } catch {
    throw new HttpException("Moderation log not found", 404);
  }

  return {
    id: record.id,
    post_id: record.post_id ?? undefined,
    reply_id: record.reply_id ?? undefined,
    moderator_id: record.moderator_id ?? undefined,
    action_type: record.action_type,
    action_details: record.action_details ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  };
}
