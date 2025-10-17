import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardModerationLogsModerationLogId(props: {
  admin: AdminPayload;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationLog> {
  const { moderationLogId } = props;

  const record =
    await MyGlobal.prisma.discussion_board_moderation_logs.findUniqueOrThrow({
      where: { id: moderationLogId },
      select: {
        id: true,
        post_id: true,
        reply_id: true,
        moderator_id: true,
        action_type: true,
        action_details: true,
        created_at: true,
      },
    });

  return {
    id: record.id,
    post_id: record.post_id ?? null,
    reply_id: record.reply_id ?? null,
    moderator_id: record.moderator_id ?? null,
    action_type: record.action_type,
    action_details: record.action_details ?? null,
    created_at: toISOStringSafe(record.created_at),
  };
}
