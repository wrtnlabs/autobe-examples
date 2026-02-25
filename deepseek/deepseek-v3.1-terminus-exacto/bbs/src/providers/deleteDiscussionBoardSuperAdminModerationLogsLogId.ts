import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminModerationLogsLogId(props: {
  superAdmin: SuperAdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the moderation log exists before deletion
  const existingLog =
    await MyGlobal.prisma.discussion_board_moderation_logs.findUnique({
      where: { id: props.logId },
    });
  if (!existingLog) {
    throw new HttpException("Moderation log not found", 404);
  }
  // Perform hard delete
  await MyGlobal.prisma.discussion_board_moderation_logs.delete({
    where: { id: props.logId },
  });
}
