import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { TodolistmemberPayload } from "../decorators/payload/TodolistmemberPayload";

export async function postTodoListTodoListMemberTodos(props: {
  todoListMember: TodolistmemberPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  // Enforce per-user unique title
  const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      todo_list_todolistmember_id: props.todoListMember.id,
      title: props.body.title,
    },
  });
  if (duplicate) {
    throw new HttpException(
      "A todo with this title already exists for you.",
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const completed = props.body.is_complete === true;

  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4(),
      todo_list_todolistmember_id: props.todoListMember.id,
      title: props.body.title,
      description: props.body.description ?? null,
      is_complete: completed,
      completed_at: completed ? now : null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    title: created.title,
    description:
      typeof created.description === "undefined"
        ? undefined
        : created.description === null
          ? null
          : created.description,
    is_complete: created.is_complete,
    completed_at:
      typeof created.completed_at === "undefined"
        ? undefined
        : created.completed_at === null
          ? null
          : toISOStringSafe(created.completed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
