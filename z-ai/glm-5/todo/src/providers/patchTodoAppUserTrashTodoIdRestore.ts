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
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTrashTodoIdRestore(props: {
  user: UserPayload;
  todoId: string;
}): Promise<ITodoAppTodo> {
  // Find the todo - must exist, belong to user, and be in trash
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
    select: {
      id: true,
      is_deleted: true,
    },
  });
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.is_deleted === false) {
    throw new HttpException("Todo is not in trash", 400);
  }
  // Restore the todo
  const restored = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      is_deleted: false,
      updated_at: new Date(),
    },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(restored);
}
