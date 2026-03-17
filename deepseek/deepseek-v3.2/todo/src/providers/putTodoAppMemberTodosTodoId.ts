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
  todoId: string;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // 1. Verify ownership first
  const existing = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { todo_app_member_id: true },
  });
  if (existing.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Business validation: due_date must not be before start_date
  if (
    props.body.start_date !== undefined &&
    props.body.due_date !== undefined &&
    props.body.start_date !== null &&
    props.body.due_date !== null
  ) {
    const start = new Date(props.body.start_date);
    const due = new Date(props.body.due_date);
    if (due < start) {
      throw new HttpException("Due date cannot be before start date", 400);
    }
  }
  // 3. Build update data with proper null handling
  const data: Prisma.todo_app_todosUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) {
    data.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    data.description = props.body.description;
  }
  if (props.body.start_date !== undefined) {
    data.start_date = props.body.start_date
      ? new Date(props.body.start_date)
      : null;
  }
  if (props.body.due_date !== undefined) {
    data.due_date = props.body.due_date ? new Date(props.body.due_date) : null;
  }
  if (props.body.completed !== undefined) {
    data.completed = props.body.completed;
  }
  // 4. Update and return in single query
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data,
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
}
