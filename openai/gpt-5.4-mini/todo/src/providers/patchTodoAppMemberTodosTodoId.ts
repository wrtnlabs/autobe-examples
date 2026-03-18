import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function patchTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const current = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      title: true,
      description: true,
      start_at: true,
      due_at: true,
      is_completed: true,
      deleted_at: true,
    },
  });
  if (current.todo_app_member_id !== props.member.id)
    throw new HttpException("Forbidden", 403);
  if (current.deleted_at !== null)
    throw new HttpException("Cannot edit a deleted todo", 400);
  const nextTitle: string =
    props.body.title !== undefined ? props.body.title : current.title;
  const nextDescription: string | null =
    props.body.description !== undefined
      ? props.body.description
      : current.description;
  const nextStartAt: string | null =
    props.body.start_at !== undefined
      ? props.body.start_at
      : current.start_at === null
        ? null
        : toISOStringSafe(current.start_at);
  const nextDueAt: string | null =
    props.body.due_at !== undefined
      ? props.body.due_at
      : current.due_at === null
        ? null
        : toISOStringSafe(current.due_at);
  const nextIsCompleted: boolean =
    props.body.is_completed !== undefined
      ? props.body.is_completed
      : current.is_completed;
  const hasChanges: boolean =
    nextTitle !== current.title ||
    nextDescription !== current.description ||
    nextStartAt !==
      (current.start_at === null ? null : toISOStringSafe(current.start_at)) ||
    nextDueAt !==
      (current.due_at === null ? null : toISOStringSafe(current.due_at)) ||
    nextIsCompleted !== current.is_completed;
  if (hasChanges === false) {
    const unchanged = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...TodoAppTodoTransformer.select(),
    });
    return TodoAppTodoTransformer.transform(unchanged);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.todo_app_todos.update({
      where: { id: props.todoId },
      data: {
        title: nextTitle,
        description: nextDescription,
        start_at: nextStartAt,
        due_at: nextDueAt,
        is_completed: nextIsCompleted,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    await prisma.todo_app_todo_histories.create({
      data: {
        id: v4(),
        todo_app_todo_id: props.todoId,
        edited_at: new Date(),
        title: nextTitle,
        description: nextDescription,
        start_date: nextStartAt === null ? null : new Date(nextStartAt),
        due_date: nextDueAt === null ? null : new Date(nextDueAt),
      },
    });
  });
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return TodoAppTodoTransformer.transform(updated);
}
