import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoAuditLog";
import { IPageITodoListTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminTodosTodoIdAuditLogs(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodoAuditLog.IRequest;
}): Promise<IPageITodoListTodoAuditLog.ISummary> {
  const where: Record<string, unknown> = {
    todo_id: props.todoId,
  };

  if (props.body.actor_user_id !== undefined) {
    where.actor_user_id = props.body.actor_user_id;
  }
  if (props.body.actor_admin_id !== undefined) {
    where.actor_admin_id = props.body.actor_admin_id;
  }
  if (props.body.action !== undefined && props.body.action !== null) {
    where.action = props.body.action;
  }
  if (props.body.after !== undefined || props.body.before !== undefined) {
    const createdAt: Record<string, string> = {};
    if (props.body.after !== undefined && props.body.after !== null) {
      createdAt.gte = props.body.after;
    }
    if (props.body.before !== undefined && props.body.before !== null) {
      createdAt.lte = props.body.before;
    }
    if (Object.keys(createdAt).length > 0) {
      where.created_at = createdAt;
    }
  }

  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todo_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_todo_audit_logs.count({ where }),
  ]);

  const allowedActions = [
    "created",
    "updated",
    "completed",
    "uncompleted",
    "deleted",
    "restored",
    "admin_deleted",
    "admin_edited",
  ];

  const data = logs.map((log) => {
    const action = allowedActions.includes(log.action) ? log.action : "updated";
    const created_at =
      typeof log.created_at === "string" ? log.created_at : "" + log.created_at;
    return {
      id: log.id,
      todo_id: log.todo_id,
      actor_user_id: log.actor_user_id === null ? undefined : log.actor_user_id,
      actor_admin_id:
        log.actor_admin_id === null ? undefined : log.actor_admin_id,
      action: typia.assert<
        | "created"
        | "updated"
        | "completed"
        | "uncompleted"
        | "deleted"
        | "restored"
        | "admin_deleted"
        | "admin_edited"
      >(action),
      context: log.context === null ? undefined : log.context,
      created_at,
    };
  });

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
