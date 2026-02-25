import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const existing = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!props.body.title?.trim()) {
    throw new HttpException("Title is required", 400);
  }
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      title: props.body.title,
      description:
        props.body.description !== undefined
          ? props.body.description
          : existing.description,
      start_date:
        props.body.start_date !== undefined
          ? props.body.start_date
          : existing.start_date,
      due_date:
        props.body.due_date !== undefined
          ? props.body.due_date
          : existing.due_date,
      updated_at: new Date().toISOString(),
    },
  });
  // Handle date conversions properly with null coalescing and explicit type safety
  const oldStart = existing.start_date ?? null;
  const oldDue = existing.due_date ?? null;
  const newStart = props.body.start_date ?? null;
  const newDue = props.body.due_date ?? null;
  await MyGlobal.prisma.todo_app_todo_histories.create({
    data: {
      id: v4(),
      todo_app_todo_id: props.todoId,
      before_title: existing.title,
      after_title: props.body.title,
      before_description: existing.description ?? null,
      after_description: props.body.description ?? null,
      before_startdate: oldStart,
      after_startdate: newStart,
      before_duedate: oldDue,
      after_duedate: newDue,
      edited_at: new Date().toISOString(),
    },
  });
  // Fetch the updated todo with user and history relations using the transformer's select
  const enrichedTodo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: TodoAppTodoTransformer.select().select,
  });
  return await TodoAppTodoTransformer.transform(enrichedTodo);
}
