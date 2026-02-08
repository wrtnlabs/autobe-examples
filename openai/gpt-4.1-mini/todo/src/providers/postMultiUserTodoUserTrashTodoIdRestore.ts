import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoUserTrashTodoIdRestore(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodo> {
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      id: props.todoId,
      multi_user_todo_user_id: props.user.id,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  const updated = await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: { deleted_at: null },
  });
  return {
    id: updated.id,
    multi_user_todo_user_id: updated.multi_user_todo_user_id,
    title: updated.title,
    description: updated.description === null ? undefined : updated.description,
    start_date:
      updated.start_date === null
        ? undefined
        : toISOStringSafe(updated.start_date),
    due_date:
      updated.due_date === null ? undefined : toISOStringSafe(updated.due_date),
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: null,
  };
}
