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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdToggleComplete(props: {
  member: MemberPayload;
  todoId: string;
  body: ITodoAppTodo.IToggleComplete;
}): Promise<ITodoAppTodo.IUpdate> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
  });
  if (todo.todo_app_user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      is_complete: props.body.is_complete,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  return {
    description: updated.description ?? null,
    due_date: updated.due_date
      ? (updated.due_date.toISOString() as string & tags.Format<"date-time">)
      : null,
    start_date: updated.start_date
      ? (updated.start_date.toISOString() as string & tags.Format<"date-time">)
      : null,
    title: updated.title,
  };
}
