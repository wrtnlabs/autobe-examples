import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminModerationLogsModerationLogId(props: {
  admin: AdminPayload;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.discussion_board_moderation_logs.findUnique({
      where: { id: props.moderationLogId },
    });
  if (!existing) {
    throw new HttpException("Moderation log entry not found", 404);
  }
  await MyGlobal.prisma.discussion_board_moderation_logs.delete({
    where: { id: props.moderationLogId },
  });
}
