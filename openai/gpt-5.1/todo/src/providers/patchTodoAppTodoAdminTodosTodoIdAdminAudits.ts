import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdminAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminAudit";
import { IPageITodoAppTodoAdminAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoAdminAudit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function patchTodoAppTodoAdminTodosTodoIdAdminAudits(props: {
  todoAdmin: TodoadminPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoAdminAudit.IRequest;
}): Promise<IPageITodoAppTodoAdminAudit.ISummary> {
  const requestedPage: number = props.body.page ?? 1;
  const requestedLimit: number = props.body.limit ?? 20;

  const requestedPageWithMin: number = requestedPage < 1 ? 1 : requestedPage;
  const maxLimit: number = 100;
  const safeLimit: number =
    requestedLimit <= 0
      ? 20
      : requestedLimit > maxLimit
        ? maxLimit
        : requestedLimit;

  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
    },
    include: {
      status: true,
    },
  });

  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }

  const where = {
    todo_app_todo_id: props.todoId,
    ...(props.body.action !== undefined && props.body.action !== null
      ? { action: props.body.action }
      : {}),
    ...(props.body.field_name !== undefined && props.body.field_name !== null
      ? { field_name: props.body.field_name }
      : {}),
    ...(props.body.admin_id !== undefined && props.body.admin_id !== null
      ? { todo_app_todoadmin_id: props.body.admin_id }
      : {}),
    ...((props.body.created_from !== undefined &&
      props.body.created_from !== null) ||
    (props.body.created_to !== undefined && props.body.created_to !== null)
      ? {
          created_at: {
            ...(props.body.created_from !== undefined &&
            props.body.created_from !== null
              ? { gte: props.body.created_from }
              : {}),
            ...(props.body.created_to !== undefined &&
            props.body.created_to !== null
              ? { lte: props.body.created_to }
              : {}),
          },
        }
      : {}),
  };

  const skip: number = (requestedPageWithMin - 1) * safeLimit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_admin_audits.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.todo_app_todo_admin_audits.count({
      where,
    }),
  ]);

  const totalRecords: number = total;
  const totalPages: number =
    totalRecords === 0 ? 0 : Math.ceil(totalRecords / safeLimit);

  let currentPageIndex: number;
  if (totalPages === 0) {
    currentPageIndex = 0;
  } else if (requestedPageWithMin > totalPages) {
    currentPageIndex = totalPages - 1;
  } else {
    currentPageIndex = requestedPageWithMin - 1;
  }

  const data: ITodoAppTodoAdminAudit.ISummary[] = [];

  for (const audit of rows) {
    const [todoRow, adminRow] = await Promise.all([
      MyGlobal.prisma.todo_app_todos.findUnique({
        where: { id: audit.todo_app_todo_id },
        include: { status: true },
      }),
      MyGlobal.prisma.todo_app_todoadmins.findUnique({
        where: { id: audit.todo_app_todoadmin_id },
      }),
    ]);

    if (todoRow === null || adminRow === null) {
      continue;
    }

    const todoSummary: ITodoAppTodo.ISummary = {
      id: todoRow.id,
      title: todoRow.title,
      status: todoRow.status.code,
      statusInfo:
        todoRow.status === null
          ? undefined
          : {
              id: todoRow.status.id,
              code: todoRow.status.code,
              label: todoRow.status.label,
              is_default: todoRow.status.is_default,
              is_active: todoRow.status.is_active,
            },
      due_date:
        todoRow.due_date === null
          ? undefined
          : toISOStringSafe(todoRow.due_date),
      created_at: toISOStringSafe(todoRow.created_at),
      updated_at: toISOStringSafe(todoRow.updated_at),
      completed_at:
        todoRow.completed_at === null
          ? undefined
          : toISOStringSafe(todoRow.completed_at),
    };

    const adminSummary: ITodoAppTodoAdmin.ISummary = {
      id: adminRow.id,
      email: adminRow.email,
      display_name:
        adminRow.display_name === null ? undefined : adminRow.display_name,
      status: adminRow.status,
      last_login_at:
        adminRow.last_login_at === null
          ? undefined
          : toISOStringSafe(adminRow.last_login_at),
      created_at: toISOStringSafe(adminRow.created_at),
      updated_at: toISOStringSafe(adminRow.updated_at),
    };

    const summary: ITodoAppTodoAdminAudit.ISummary = {
      id: audit.id,
      action: audit.action,
      field_name: audit.field_name === null ? undefined : audit.field_name,
      previous_value:
        audit.previous_value === null ? undefined : audit.previous_value,
      new_value: audit.new_value === null ? undefined : audit.new_value,
      reason: audit.reason === null ? undefined : audit.reason,
      created_at: toISOStringSafe(audit.created_at),
      todo: todoSummary,
      admin: adminSummary,
    };

    data.push(summary);
  }

  const pagination: IPage.IPagination = {
    current: currentPageIndex,
    limit: safeLimit,
    records: totalRecords,
    pages: totalPages,
  };

  return {
    pagination,
    data,
  };
}
