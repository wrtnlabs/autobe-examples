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
      deleted_at: true,
    },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (todo.deleted_at !== null) {
    throw new HttpException("Todo is in trash", 400);
  }
  const updateData: Prisma.todo_app_todosUpdateInput = {
    title: props.body.title,
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.started_at !== undefined && {
      started_at: props.body.started_at === null ? null : props.body.started_at,
    }),
    ...(props.body.due_at !== undefined && {
      due_at: props.body.due_at === null ? null : props.body.due_at,
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.todo_app_todos.update({
      where: { id: props.todoId },
      data: updateData,
    });
    const updated = await tx.todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      select: {
        id: true,
        title: true,
        description: true,
        started_at: true,
        due_at: true,
        completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo_app_member_id: true,
      },
    });
    await tx.todo_app_todo_edit_histories.create({
      data: {
        id: v4(),
        todo_app_todo_id: props.todoId,
        title: updated.title,
        description: updated.description,
        started_at: updated.started_at,
        due_at: updated.due_at,
        completed: updated.completed,
        created_at: new Date(),
      },
    });
  });
  const updatedTodo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updatedTodo);
}
