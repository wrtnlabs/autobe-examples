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

export async function putTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      title: true,
      description: true,
      start_at: true,
      due_at: true,
      is_completed: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const nextTitle = props.body.title ?? todo.title;
  const nextDescription =
    props.body.description !== undefined
      ? props.body.description
      : todo.description;
  const nextStartAt =
    props.body.start_at !== undefined
      ? props.body.start_at
      : todo.start_at
        ? toISOStringSafe(todo.start_at)
        : null;
  const nextDueAt =
    props.body.due_at !== undefined
      ? props.body.due_at
      : todo.due_at
        ? toISOStringSafe(todo.due_at)
        : null;
  const isChanged =
    nextTitle !== todo.title ||
    nextDescription !== todo.description ||
    nextStartAt !== (todo.start_at ? toISOStringSafe(todo.start_at) : null) ||
    nextDueAt !== (todo.due_at ? toISOStringSafe(todo.due_at) : null);
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.todo_app_todos.update({
      where: { id: props.todoId },
      data: {
        ...(props.body.title !== undefined && { title: props.body.title }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.start_at !== undefined && {
          start_at:
            props.body.start_at === null ? null : new Date(props.body.start_at),
        }),
        ...(props.body.due_at !== undefined && {
          due_at:
            props.body.due_at === null ? null : new Date(props.body.due_at),
        }),
        updated_at: new Date(),
      },
    });
    if (isChanged) {
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
    }
  });
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
}
