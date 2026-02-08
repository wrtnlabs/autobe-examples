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

export async function getMultiUserTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodo> {
  const record = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      id: props.todoId,
      multi_user_todo_user_id: props.user.id,
      deleted_at: null,
    },
    select: {
      id: true,
      multi_user_todo_user_id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      completed: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (record === null) {
    throw new HttpException("Todo not found", 404);
  }
  return {
    id: record.id,
    multi_user_todo_user_id: record.multi_user_todo_user_id,
    title: record.title,
    description: record.description === null ? null : record.description,
    start_date:
      record.start_date === null ? null : toISOStringSafe(record.start_date),
    due_date:
      record.due_date === null ? null : toISOStringSafe(record.due_date),
    completed: record.completed,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
