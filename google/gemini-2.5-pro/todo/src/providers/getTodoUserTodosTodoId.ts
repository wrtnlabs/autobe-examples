import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoTodo> {
  const record = await MyGlobal.prisma.todo_todos.findUnique({
    where: { id: props.todoId },
    include: { user: true },
  });
  if (!record) {
    throw new HttpException("Todo not found", 404);
  }
  if (record.todo_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: record.id,
    title: record.title,
    description:
      record.description === undefined
        ? undefined
        : record.description === null
          ? null
          : record.description,
    status: record.status === "complete" ? "complete" : "incomplete",
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    completed_at:
      record.completed_at === undefined
        ? undefined
        : record.completed_at === null
          ? null
          : toISOStringSafe(record.completed_at),
    user: {
      id: record.user.id,
    },
  };
}
