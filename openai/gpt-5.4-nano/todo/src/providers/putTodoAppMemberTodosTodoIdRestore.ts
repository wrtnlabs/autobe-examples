import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberTodosTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      completion_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      deleted_in_trash_at: true,
    } satisfies Prisma.todo_app_todosSelect,
  });
  if (todo.deleted_in_trash_at === null) {
    throw new HttpException(
      "Todo restore is invalid in current lifecycle state",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.todo_app_todos.update({
      where: {
        id: props.todoId,
        todo_app_member_id: props.member.id,
      },
      data: {
        deleted_in_trash_at: null,
      },
    });
  });
  const restored = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      completion_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      deleted_in_trash_at: true,
    } satisfies Prisma.todo_app_todosSelect,
  });
  return {
    id: restored.id,
    title: restored.title,
    description: restored.description ?? null,
    start_date:
      restored.start_date === null
        ? null
        : toISOStringSafe(restored.start_date),
    due_date:
      restored.due_date === null ? null : toISOStringSafe(restored.due_date),
    completion_status: restored.completion_status,
    created_at: toISOStringSafe(restored.created_at),
    updated_at: toISOStringSafe(restored.updated_at),
    deleted_at:
      restored.deleted_at === null
        ? null
        : toISOStringSafe(restored.deleted_at),
    deleted_in_trash_at:
      restored.deleted_in_trash_at === null
        ? null
        : toISOStringSafe(restored.deleted_in_trash_at),
  } satisfies ITodoAppTodo;
}
