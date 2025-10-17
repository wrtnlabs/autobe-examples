import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { TodomemberPayload } from "../decorators/payload/TodomemberPayload";

export async function getTodoListTodoMemberTodosTodoId(props: {
  todoMember: TodomemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const { todoMember, todoId } = props;

  const row = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: todoId,
      todo_list_todo_member_id: todoMember.id,
    },
    select: {
      id: true,
      title: true,
      is_completed: true,
      completed_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (row === null) {
    throw new HttpException("Not Found", 404);
  }

  const response = {
    id: row.id,
    title: row.title,
    isCompleted: row.is_completed,
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
    ...(row.completed_at !== null && {
      completedAt: toISOStringSafe(row.completed_at),
    }),
  };

  return typia.assert<ITodoListTodo>(response);
}
