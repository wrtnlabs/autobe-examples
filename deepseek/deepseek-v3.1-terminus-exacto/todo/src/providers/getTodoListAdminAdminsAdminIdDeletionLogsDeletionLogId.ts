import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminDeletionLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminAdminsAdminIdDeletionLogsDeletionLogId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  deletionLogId: string & tags.Format<"uuid">;
}): Promise<ITodoListAdminDeletionLog> {
  const log = await MyGlobal.prisma.todo_list_admin_deletion_logs.findFirst({
    where: {
      id: props.deletionLogId,
      admin_id: props.adminId,
    },
  });
  if (!log) {
    throw new HttpException("Deletion log entry not found.", 404);
  }
  return {
    id: log.id,
    admin_id: log.admin_id,
    deleted_by_admin_id:
      log.deleted_by_admin_id === null ? undefined : log.deleted_by_admin_id,
    reason: log.reason,
    deleted_at: toISOStringSafe(log.deleted_at),
  };
}
