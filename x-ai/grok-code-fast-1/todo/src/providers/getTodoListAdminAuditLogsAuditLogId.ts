import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuditLog";
import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ITodoListAuditLog> {
  const row = await MyGlobal.prisma.todo_list_audit_logs.findUnique({
    where: { id: props.auditLogId },
    include: {
      admin: true,
      targetUser: true,
    },
  });

  if (!row) {
    throw new HttpException("Audit log entry not found", 404);
  }

  return {
    id: row.id,
    admin: {
      id: row.admin.id,
      email: row.admin.email,
      display_name: row.admin.display_name,
    },
    target_user: row.targetUser
      ? {
          id: row.targetUser.id,
          email: row.targetUser.email,
          display_name: row.targetUser.display_name,
        }
      : undefined,
    event_type: row.event_type,
    event_time: toISOStringSafe(row.event_time),
    details: row.details ?? undefined,
  };
}
