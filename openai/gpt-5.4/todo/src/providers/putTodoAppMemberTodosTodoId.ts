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
  const existing = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      completed: true,
      completed_at: true,
      deleted_at: true,
    },
  });
  if (existing.todo_app_member_id !== props.member.id)
    throw new HttpException("Not Found", 404);
  if (existing.deleted_at !== null) throw new HttpException("Not Found", 404);
  const now = new Date();
  const nextTitle =
    props.body.title !== undefined ? props.body.title : existing.title;
  const nextDescription =
    props.body.description !== undefined
      ? props.body.description
      : existing.description;
  const nextStartDate =
    props.body.start_date !== undefined
      ? props.body.start_date === null
        ? null
        : new Date(props.body.start_date)
      : existing.start_date;
  const nextDueDate =
    props.body.due_date !== undefined
      ? props.body.due_date === null
        ? null
        : new Date(props.body.due_date)
      : existing.due_date;
  const nextCompleted =
    props.body.completed !== undefined
      ? props.body.completed
      : existing.completed;
  const nextCompletedAt =
    nextCompleted !== existing.completed
      ? nextCompleted === true
        ? now
        : null
      : existing.completed_at;
  const startDateChanged =
    (existing.start_date === null) !== (nextStartDate === null) ||
    (existing.start_date !== null &&
      nextStartDate !== null &&
      toISOStringSafe(existing.start_date) !== toISOStringSafe(nextStartDate));
  const dueDateChanged =
    (existing.due_date === null) !== (nextDueDate === null) ||
    (existing.due_date !== null &&
      nextDueDate !== null &&
      toISOStringSafe(existing.due_date) !== toISOStringSafe(nextDueDate));
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.todo_app_todos.update({
      where: { id: props.todoId },
      data: {
        title: nextTitle,
        description: nextDescription,
        start_date: nextStartDate,
        due_date: nextDueDate,
        completed: nextCompleted,
        completed_at: nextCompletedAt,
        updated_at: now,
      },
    });
    if (
      nextTitle !== existing.title ||
      nextDescription !== existing.description ||
      startDateChanged === true ||
      dueDateChanged === true
    ) {
      await tx.todo_app_todo_edit_histories.create({
        data: {
          id: v4(),
          todo: { connect: { id: props.todoId } },
          created_at: now,
        },
      });
    }
  });
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
}
