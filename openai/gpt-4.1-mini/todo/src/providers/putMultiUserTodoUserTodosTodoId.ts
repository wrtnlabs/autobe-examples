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

export async function putMultiUserTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodo.IUpdate;
}): Promise<IMultiUserTodoTodo> {
  const existing = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      id: props.todoId,
      multi_user_todo_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new HttpException("Todo not found or you are not authorized", 404);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.multi_user_todo_todos.update({
      where: { id: props.todoId },
      data: {
        title: existing.title,
        description: existing.description,
        start_date: existing.start_date,
        due_date: existing.due_date,
        completed: existing.completed,
        updated_at: now,
      },
    });
    await prisma.multi_user_todo_todo_edit_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        multi_user_todo_todo_id: props.todoId,
        changed_title: null,
        changed_description: null,
        changed_start_date: null,
        changed_due_date: null,
        created_at: now,
        updated_at: now,
      },
    });
  });
  const updatedRaw = await MyGlobal.prisma.multi_user_todo_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!updatedRaw) {
    throw new HttpException("Failed to retrieve updated todo", 500);
  }
  return {
    id: updatedRaw.id,
    multi_user_todo_user_id: updatedRaw.multi_user_todo_user_id,
    title: updatedRaw.title,
    description:
      updatedRaw.description === null ? undefined : updatedRaw.description,
    start_date:
      updatedRaw.start_date === null ? undefined : updatedRaw.start_date,
    due_date: updatedRaw.due_date === null ? undefined : updatedRaw.due_date,
    completed: updatedRaw.completed,
    created_at: toISOStringSafe(new Date(updatedRaw.created_at)),
    updated_at: toISOStringSafe(new Date(updatedRaw.updated_at)),
    deleted_at:
      updatedRaw.deleted_at === null
        ? undefined
        : toISOStringSafe(new Date(updatedRaw.deleted_at)),
  };
}
