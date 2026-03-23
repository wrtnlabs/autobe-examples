import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function postTodoAppMemberTrashTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_user_id: true,
      is_trashed: true,
      deleted_at: true,
    },
  });
  if (todo.todo_app_user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (!todo.is_trashed) {
    throw new HttpException("Todo is not in trash", 400);
  }
  if (todo.deleted_at !== null) {
    throw new HttpException("Todo has been permanently deleted", 404);
  }
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: { is_trashed: false },
  });
  const restored = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(restored);
}
