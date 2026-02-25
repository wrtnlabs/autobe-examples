import { IDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminActionLog";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdminActionLogTransformer } from "../transformers/DiscussionBoardAdminActionLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserAuditLogsAuditLogId(props: {
  user: UserPayload;
  auditLogId: string;
}): Promise<IDiscussionBoardAdminActionLog> {
  // Verify user is administrator
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { permission_level: true },
  });
  if (
    user.permission_level !== "ADMINISTRATOR" &&
    user.permission_level !== "SUPER_ADMINISTRATOR"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Query audit log with transformer
  const log =
    await MyGlobal.prisma.discussion_board_admin_action_logs.findUniqueOrThrow({
      where: { id: props.auditLogId },
      ...DiscussionBoardAdminActionLogTransformer.select(),
    });
  return await DiscussionBoardAdminActionLogTransformer.transform(log);
}
