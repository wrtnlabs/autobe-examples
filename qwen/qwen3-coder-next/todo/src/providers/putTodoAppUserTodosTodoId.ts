import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const existing = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_user_id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_complete: true,
      is_deleted: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (existing.todo_app_user_id !== props.user.id) {
    throw new HttpException("Not Found", 404);
  }
  const updateData: Prisma.todo_app_todosUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.startDate !== undefined && {
      start_date: props.body.startDate,
    }),
    ...(props.body.dueDate !== undefined && { due_date: props.body.dueDate }),
    updated_at: new Date(),
  };
  const historyData: Prisma.todo_app_todo_historiesCreateInput = {
    id: v4() as string & tags.Format<"uuid">,
    todo: { connect: { id: props.todoId } },
    edited_at: new Date(),
    ...(props.body.title !== undefined && {
      previous_title: existing.title,
      new_title: props.body.title,
    }),
    ...(props.body.description !== undefined && {
      previous_description: existing.description ?? null,
      new_description: props.body.description,
    }),
    ...(props.body.startDate !== undefined && {
      previous_start_date: existing.start_date?.toISOString() ?? null,
      new_start_date: props.body.startDate,
    }),
    ...(props.body.dueDate !== undefined && {
      previous_due_date: existing.due_date?.toISOString() ?? null,
      new_due_date: props.body.dueDate,
    }),
  };
  await MyGlobal.prisma.todo_app_todo_histories.create({
    data: historyData,
  });
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_complete: true,
      is_deleted: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      todo_app_user_id: true,
    },
  });
  return {
    id: updated.id,
    title: updated.title,
    description: updated.description ?? undefined,
    start_date: updated.start_date
      ? updated.start_date.toISOString()
      : undefined,
    due_date: updated.due_date ? updated.due_date.toISOString() : undefined,
    is_complete: updated.is_complete,
    is_deleted: updated.is_deleted,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at
      ? updated.deleted_at.toISOString()
      : undefined,
    user: await MyGlobal.prisma.todo_app_users
      .findUniqueOrThrow({
        where: { id: updated.todo_app_user_id },
      })
      .then((user) => ({
        id: user.id,
        displayName: "User",
      })),
  };
}
