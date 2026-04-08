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
  // Verify todo exists and belongs to the authenticated member
  const existing = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  // Cannot edit deleted (trashed) todos
  if (existing.deleted_at !== null) {
    throw new HttpException(
      "Cannot edit a deleted todo. Restore it first.",
      400,
    );
  }
  // Update the todo with provided fields
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      title: props.body.title,
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.start_date !== undefined && {
        start_date: props.body.start_date
          ? new Date(props.body.start_date)
          : null,
      }),
      ...(props.body.due_date !== undefined && {
        due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      }),
      updated_at: new Date(),
    },
  });
  // Create edit history entry with correct column names
  await MyGlobal.prisma.todo_app_todo_edit_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todos_id: props.todoId,
      created_at: new Date(),
      title_changed_to: props.body.title,
      description_changed_to: props.body.description ?? null,
      start_date_changed_to: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      due_date_changed_to: props.body.due_date
        ? new Date(props.body.due_date)
        : null,
    },
  });
  // Fetch and return the updated todo
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
}
