import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminDeletionLog";
import { IPageITodoListAdminDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminDeletionLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAdminsAdminIdDeletionLogs(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoListAdminDeletionLog.IRequest;
}): Promise<IPageITodoListAdminDeletionLog.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    admin_id: props.adminId,
    ...(props.body.reason !== undefined && { reason: props.body.reason }),
    ...(props.body.deleted_by_admin_id !== undefined && {
      deleted_by_admin_id: props.body.deleted_by_admin_id,
    }),
    ...(props.body.time_from !== undefined || props.body.time_to !== undefined
      ? {
          deleted_at: {
            ...(props.body.time_from !== undefined && {
              gte: props.body.time_from,
            }),
            ...(props.body.time_to !== undefined && {
              lte: props.body.time_to,
            }),
          },
        }
      : {}),
  };

  if (props.body.query) {
    // Implement text search only on 'reason' for now as that's the free-text field
    where["OR"] = [
      {
        reason: {
          contains: props.body.query,
        },
      },
    ];
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admin_deletion_logs.findMany({
      where,
      orderBy: { deleted_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_admin_deletion_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((row) => ({
      id: row.id,
      admin_id: row.admin_id,
      reason: row.reason,
      deleted_by_admin_id:
        row.deleted_by_admin_id === null ? null : row.deleted_by_admin_id,
      deleted_at: toISOStringSafe(row.deleted_at),
    })),
  };
}
