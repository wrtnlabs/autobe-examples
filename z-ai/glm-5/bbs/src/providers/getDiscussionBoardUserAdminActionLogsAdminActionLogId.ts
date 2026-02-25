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

export async function getDiscussionBoardUserAdminActionLogsAdminActionLogId(props: {
  user: UserPayload;
  adminActionLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminActionLog> {
  // Authorization check
  const adminUser =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.user.id },
      select: { permission_level: true },
    });
  if (
    adminUser.permission_level !== "ADMINISTRATOR" &&
    adminUser.permission_level !== "SUPER_ADMINISTRATOR"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Query and transform
  const log =
    await MyGlobal.prisma.discussion_board_admin_action_logs.findUniqueOrThrow({
      where: { id: props.adminActionLogId },
      ...DiscussionBoardAdminActionLogTransformer.select(),
    });
  return await DiscussionBoardAdminActionLogTransformer.transform(log);
}
