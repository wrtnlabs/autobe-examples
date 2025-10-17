import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAuditRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditRecord";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAuditRecordsAuditRecordId(props: {
  admin: AdminPayload;
  auditRecordId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAuditRecord> {
  const { admin, auditRecordId } = props;

  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { id: true },
  });

  if (!adminRecord) {
    throw new HttpException("Unauthorized: admin not found", 403);
  }

  const record = await MyGlobal.prisma.todo_app_audit_records.findUnique({
    where: { id: auditRecordId },
  });

  if (!record) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: record.id as string & tags.Format<"uuid">,
    admin_id:
      record.admin_id === null
        ? null
        : (record.admin_id as string & tags.Format<"uuid">),
    user_id:
      record.user_id === null
        ? null
        : (record.user_id as string & tags.Format<"uuid">),
    actor_role: record.actor_role,
    action_type: record.action_type,
    target_resource: record.target_resource,
    target_id:
      record.target_id === null
        ? null
        : (record.target_id as string & tags.Format<"uuid">),
    reason: record.reason ?? null,
    created_at: toISOStringSafe(record.created_at),
  };
}
