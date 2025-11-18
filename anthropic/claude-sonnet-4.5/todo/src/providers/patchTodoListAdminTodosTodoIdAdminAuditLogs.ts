import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminAuditLog";
import { IPageITodoListAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminTodosTodoIdAdminAuditLogs(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListAdminAuditLog.IRequest;
}): Promise<IPageITodoListAdminAuditLog> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Pagination
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limitRaw =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 100;
  const limit = limitRaw > 100 ? 100 : limitRaw;
  const skip = (page - 1) * limit;

  // Allowed sort fields
  const allowedSort = ["created_at", "action_type"] as const;
  const sortField: "created_at" | "action_type" =
    allowedSort.includes(props.body.sort as any) && props.body.sort
      ? (props.body.sort as "created_at" | "action_type")
      : "created_at";
  const sortOrder: "asc" | "desc" = props.body.order === "asc" ? "asc" : "desc";

  // Build where
  const where = {
    todo_id: props.todoId,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.admin_id && { admin_id: props.body.admin_id }),
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.created_from || props.body.created_to
      ? {
          created_at: {
            ...(props.body.created_from ? { gt: props.body.created_from } : {}),
            ...(props.body.created_to ? { lte: props.body.created_to } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admin_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
    }),
    MyGlobal.prisma.todo_list_admin_audit_logs.count({
      where,
    }),
  ]);

  return {
    data: data.map((row) => ({
      id: row.id,
      admin_id: row.admin_id,
      user_id: row.user_id === null ? undefined : row.user_id,
      todo_id: row.todo_id === null ? undefined : row.todo_id,
      action_type: row.action_type,
      request_context:
        row.request_context === null ? undefined : row.request_context,
      created_at: toISOStringSafe(row.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
