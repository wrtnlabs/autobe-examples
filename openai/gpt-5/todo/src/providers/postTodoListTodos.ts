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

export async function postTodoListTodos(props: {
  todoMember: TodomemberPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  const { todoMember, body } = props;

  // Authorization checks
  if (todoMember.type !== "todomember")
    throw new HttpException("Forbidden", 403);

  const member = await MyGlobal.prisma.todo_list_todo_members.findFirst({
    where: {
      id: todoMember.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!member) throw new HttpException("Forbidden", 403);

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  const trimmedTitle = body.title.trim();

  try {
    await MyGlobal.prisma.todo_list_todos.create({
      data: {
        id,
        todo_list_todo_member_id: todoMember.id,
        title: trimmedTitle,
        is_completed: false,
        completed_at: null,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id,
      title: trimmedTitle,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
  } catch (error) {
    // Wrap unknown/prisma errors
    throw new HttpException("Internal Server Error", 500);
  }
}
