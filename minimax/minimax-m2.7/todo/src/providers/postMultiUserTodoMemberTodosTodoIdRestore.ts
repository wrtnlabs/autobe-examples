import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberTodosTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodo> {
  // Find the todo that is in trash (deleted_at is NOT null)
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      deleted_at: true,
    },
  });
  // Check if todo exists
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  // Check if todo is in trash (deleted_at must NOT be null)
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 400);
  }
  // Verify ownership - member can only restore their own todos
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Restore the todo by clearing deleted_at and updating updated_at
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: null,
      updated_at: new Date(),
    },
  });
  // Fetch the restored todo with full relations for response
  const restored =
    await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    });
  return await MultiUserTodoTodoTransformer.transform(restored);
}
