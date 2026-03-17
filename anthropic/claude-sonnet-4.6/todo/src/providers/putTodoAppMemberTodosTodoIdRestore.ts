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

export async function putTodoAppMemberTodosTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // Step 1: Look up the todo by ID — only fetch fields needed for ownership + state checks
  const existing = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      trashed_at: true,
    },
  });
  // Step 2: 404 if record does not exist
  if (existing === null) {
    throw new HttpException("Todo not found", 404);
  }
  // Step 3: 404 if the record belongs to a different member (prevent info leakage)
  if (existing.todo_app_member_id !== props.member.id) {
    throw new HttpException("Todo not found", 404);
  }
  // Step 4: 422 if the todo is already active (trashed_at is NULL — nothing to restore)
  if (existing.trashed_at === null) {
    throw new HttpException(
      "Todo is not in the trash and cannot be restored",
      422,
    );
  }
  // Step 5: Restore the todo (set trashed_at = NULL, refresh updated_at) and fetch full result
  const restored = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      trashed_at: null,
      updated_at: new Date(),
    },
    ...TodoAppTodoTransformer.select(),
  });
  // Step 6: Transform and return the restored todo
  return TodoAppTodoTransformer.transform(restored);
}
