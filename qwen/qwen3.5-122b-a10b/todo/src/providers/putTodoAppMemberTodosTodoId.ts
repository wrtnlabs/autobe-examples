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
  // Step 1: Find todo and verify ownership
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      deleted_at: true,
    },
  });
  // Step 2: Verify ownership
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check if soft deleted (should return 404 if deleted)
  if (todo.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 4: Build update data with only provided fields
  const updateData: Prisma.todo_app_todosUpdateInput = {
    updated_at: new Date(),
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.startDate !== undefined && {
      start_date: props.body.startDate ? new Date(props.body.startDate) : null,
    }),
    ...(props.body.dueDate !== undefined && {
      due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
    }),
    ...(props.body.completed !== undefined && {
      completed: props.body.completed,
    }),
  };
  // Step 5: Create history entry with changed fields
  const historyId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const historyData: Prisma.todo_app_todo_historiesCreateInput = {
    id: historyId,
    created_at: new Date(),
    updated_at: new Date(),
    todo: { connect: { id: props.todoId } },
    title: props.body.title ?? null,
    description: props.body.description ?? null,
    start_date: props.body.startDate ? new Date(props.body.startDate) : null,
    due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
  };
  await MyGlobal.prisma.todo_app_todo_histories.create({
    data: historyData,
  });
  // Step 6: Update the todo
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });
  // Step 7: Fetch updated todo with transformer select
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  // Step 8: Transform and return
  return await TodoAppTodoTransformer.transform(updated);
}
