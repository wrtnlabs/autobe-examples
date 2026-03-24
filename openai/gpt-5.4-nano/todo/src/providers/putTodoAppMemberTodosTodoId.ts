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
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const trimmedTitle = props.body.title.trim();
  if (trimmedTitle.length === 0) {
    throw new HttpException("Title is required", 400);
  }
  const normalizedDescription = props.body.description ?? null;
  const normalizedStartDate =
    props.body.start_date === undefined ? null : props.body.start_date;
  const normalizedDueDate =
    props.body.due_date === undefined ? null : props.body.due_date;
  const existing = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
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
    },
  });
  const existingStartIso = existing.start_date?.toISOString() ?? null;
  const existingDueIso = existing.due_date?.toISOString() ?? null;
  const changedTitle = trimmedTitle !== existing.title;
  const changedDescription = normalizedDescription !== existing.description;
  const changedStartDate = normalizedStartDate !== existingStartIso;
  const changedDueDate = normalizedDueDate !== existingDueIso;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.todo_app_todos.update({
      where: { id: props.todoId },
      data: {
        title: trimmedTitle,
        description: normalizedDescription,
        start_date: normalizedStartDate,
        due_date: normalizedDueDate,
        updated_at: new Date(),
      },
    });
    const shouldInsertHistory =
      changedTitle || changedDescription || changedStartDate || changedDueDate;
    if (shouldInsertHistory) {
      await tx.todo_app_todo_history_entries.create({
        data: {
          id: v4(),
          todo_app_todo_id: props.todoId,
          changed_title: changedTitle ? trimmedTitle : null,
          changed_description: changedDescription
            ? normalizedDescription
            : null,
          changed_start_date: changedStartDate ? normalizedStartDate : null,
          changed_due_date: changedDueDate ? normalizedDueDate : null,
          changed_completion_status: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  });
  const updated = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
}
