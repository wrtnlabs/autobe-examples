import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSessionRevocationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSessionRevocationSummary";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminAdminsMeSessions(props: {
  admin: AdminPayload;
}): Promise<ITodoListAdminSessionRevocationSummary> {
  const now = new Date();
  const revokedAt = toISOStringSafe(now) as string & tags.Format<"date-time">;

  const result = await MyGlobal.prisma.todo_list_admin_sessions.updateMany({
    where: {
      todo_list_admin_id: props.admin.id,
      expired_at: null,
    },
    data: {
      expired_at: now,
    },
  });

  return {
    revoked_count: result.count,
    revoked_at: revokedAt,
    notification_sent: true,
  };
}
