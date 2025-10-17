import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";

export async function postMinimalTodoTodos(props: {
  body: IMinimalTodoTodo.ICreate;
}): Promise<IMinimalTodoTodo> {
  const now = toISOStringSafe(new Date());

  const createData = {
    id: v4(),
    content: props.body.content,
    completed: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies Prisma.minimal_todo_todosCreateInput;

  const created = await MyGlobal.prisma.minimal_todo_todos.create({
    data: createData,
  });

  return {
    id: createData.id as string & tags.Format<"uuid">,
    content: created.content,
    completed: created.completed,
    created_at: createData.created_at,
    updated_at: createData.updated_at,
    deleted_at: null,
  };
}
