import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function postTodoAppTodoUserTodos(props: {
  todoUser: TodouserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  const { todoUser, body } = props;

  const explicitStatusCode = body.status_code ?? null;

  let statusRecord = null as {
    id: string;
    code: string;
    label: string;
    is_default: boolean;
    is_active: boolean;
  } | null;

  if (explicitStatusCode !== null) {
    statusRecord = await MyGlobal.prisma.todo_app_todo_statuses.findFirst({
      where: {
        code: explicitStatusCode,
      },
    });

    if (statusRecord === null) {
      throw new HttpException(
        "Invalid status_code: not found in catalogue",
        400,
      );
    }

    if (statusRecord.is_active !== true) {
      throw new HttpException(
        "Invalid status_code: status is not active and cannot be assigned",
        400,
      );
    }
  } else {
    statusRecord = await MyGlobal.prisma.todo_app_todo_statuses.findFirst({
      where: {
        is_default: true,
        is_active: true,
      },
      orderBy: {
        sort_order: "asc",
      },
    });

    if (statusRecord === null) {
      throw new HttpException(
        "No default active todo status configured in catalogue",
        500,
      );
    }
  }

  const nowIso = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: v4(),
      title: body.title,
      description: body.description === undefined ? null : body.description,
      // body.due_date is already (string & tags.Format<"date-time">) | null | undefined
      // Prisma field expects either the same or a compatible nullable type
      due_date: body.due_date === undefined ? null : body.due_date,
      todo_user_id: todoUser.id,
      todo_status_id: statusRecord.id,
      created_at: nowIso,
      updated_at: nowIso,
      completed_at: null,
      deleted_at: null,
    },
  });

  const statusSummary: ITodoAppTodoStatus.ISummary = {
    id: statusRecord.id,
    code: statusRecord.code,
    label: statusRecord.label,
    is_default: statusRecord.is_default,
    is_active: statusRecord.is_active,
  };

  const result: ITodoAppTodo = {
    id: created.id,
    title: created.title,
    description: created.description,
    due_date:
      created.due_date === null ? null : toISOStringSafe(created.due_date),
    status: statusSummary,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at:
      created.completed_at === null
        ? null
        : toISOStringSafe(created.completed_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };

  return result;
}
