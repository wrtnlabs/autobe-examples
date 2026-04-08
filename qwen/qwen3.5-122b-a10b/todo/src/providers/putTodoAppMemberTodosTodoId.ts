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
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { todo_app_member_id: true },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate title if provided (must be non-empty)
  if (props.body.title !== undefined && props.body.title.trim().length === 0) {
    throw new HttpException("Title cannot be empty", 400);
  }
  // Update the todo with provided fields
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
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
  // Create snapshot for edit history
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await MyGlobal.prisma.todo_app_snapshots.create({
    data: {
      id: snapshotId,
      todo_app_todos_id: props.todoId,
      title: updated.title,
      description: updated.description,
      start_date: updated.start_date,
      due_date: updated.due_date,
      is_completed: updated.is_completed,
      created_at: new Date(),
    },
  });
  // Fetch and transform the updated todo
  const result = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(result);
}
