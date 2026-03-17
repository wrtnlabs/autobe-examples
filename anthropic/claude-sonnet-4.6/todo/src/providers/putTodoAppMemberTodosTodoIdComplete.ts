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

export async function putTodoAppMemberTodosTodoIdComplete(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // Step 1: Find the todo record; throws 404 automatically if not found
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      todo_app_member_id: true,
      trashed_at: true,
    },
  });
  // Step 2: Ownership check — member can only complete their own todos
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Active state check — trashed todos cannot be completed
  if (todo.trashed_at !== null) {
    throw new HttpException(
      "Todo is trashed and must be restored before modifying its completion status",
      400,
    );
  }
  // Step 4: Update is_completed to true and refresh updated_at
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      is_completed: true,
      updated_at: new Date(),
    },
  });
  // Step 5: Fetch updated record and transform to response DTO
  const updated = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return TodoAppTodoTransformer.transform(updated);
}
