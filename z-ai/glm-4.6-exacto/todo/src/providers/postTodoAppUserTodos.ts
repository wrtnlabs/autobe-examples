import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // Enforce uniqueness of the title among current user's active todos
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      todo_app_user_id: props.user.id,
      title: props.body.title,
      status: "active",
    },
  });
  if (existing) {
    throw new HttpException(
      "You already have an active todo with this title.",
      409,
    );
  }

  // Validate optional due_date: it must be a valid ISO string in the future if provided
  let dueDate: string | null | undefined =
    typeof props.body.due_date === "string" ? props.body.due_date : undefined;
  if (dueDate !== undefined && dueDate !== null) {
    const parsed = Date.parse(dueDate);
    if (isNaN(parsed)) {
      throw new HttpException(
        "due_date must be a valid ISO8601 datetime string.",
        400,
      );
    }
    // Now must be strictly less than dueDate
    if (parsed <= Date.now()) {
      throw new HttpException("due_date must be in the future.", 400);
    }
  }

  // Generate now as an ISO string
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: v4(),
      title: props.body.title,
      description: Object.prototype.hasOwnProperty.call(
        props.body,
        "description",
      )
        ? props.body.description
        : undefined,
      status: "active",
      due_date: dueDate ?? null,
      created_at: now,
      updated_at: now,
      completed_at: null,
      deleted_at: null,
      todo_app_user_id: props.user.id,
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: Object.prototype.hasOwnProperty.call(created, "description")
      ? created.description
      : undefined,
    status: typia.assert<"active" | "completed" | "deleted">(created.status),
    due_date:
      created.due_date != null ? toISOStringSafe(created.due_date) : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at:
      created.completed_at != null
        ? toISOStringSafe(created.completed_at)
        : undefined,
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    todo_app_user_id: created.todo_app_user_id,
  };
}
