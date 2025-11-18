import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoTodo.IUpdate;
}): Promise<ITodoTodo> {
  // Find todo for authenticated user
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Patch for updating fields (ignore disallowed keys)
  const patch: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(props.body, "title"))
    patch.title = props.body.title;
  if (Object.prototype.hasOwnProperty.call(props.body, "description"))
    patch.description =
      props.body.description === undefined ? undefined : props.body.description;
  if (Object.prototype.hasOwnProperty.call(props.body, "due_date"))
    patch.due_date =
      props.body.due_date === undefined ? undefined : props.body.due_date;
  if (Object.prototype.hasOwnProperty.call(props.body, "priority"))
    patch.priority = props.body.priority;
  if (Object.prototype.hasOwnProperty.call(props.body, "is_completed"))
    patch.is_completed = props.body.is_completed;
  if (Object.prototype.hasOwnProperty.call(props.body, "completed_at"))
    patch.completed_at =
      props.body.completed_at === undefined
        ? undefined
        : props.body.completed_at;
  patch.updated_at = toISOStringSafe(new Date());

  // Update. Uniqueness on (user_id, title, due_date) enforced in DB, catch error.
  let updated;
  try {
    updated = await MyGlobal.prisma.todo_todos.update({
      where: { id: props.todoId, user_id: props.user.id },
      data: patch,
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "A todo with the same title and due date already exists.",
        409,
      );
    }
    throw err;
  }

  // Format response to ITodoTodo contract (pay careful attention to null vs undefined for optional fields)
  return {
    id: updated.id,
    user_id: updated.user_id,
    title: updated.title,
    description:
      "description" in updated
        ? updated.description === null
          ? null
          : updated.description === undefined
            ? undefined
            : updated.description
        : undefined,
    due_date:
      "due_date" in updated
        ? updated.due_date === null
          ? null
          : updated.due_date === undefined
            ? undefined
            : updated.due_date instanceof Date
              ? toISOStringSafe(updated.due_date)
              : updated.due_date
        : undefined,
    priority:
      "priority" in updated
        ? updated.priority === null
          ? null
          : updated.priority === undefined
            ? undefined
            : typia.assert<"low" | "medium" | "high">(updated.priority)
        : undefined,
    is_completed: updated.is_completed,
    completed_at:
      "completed_at" in updated
        ? updated.completed_at === null
          ? null
          : updated.completed_at === undefined
            ? undefined
            : updated.completed_at instanceof Date
              ? toISOStringSafe(updated.completed_at)
              : updated.completed_at
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
