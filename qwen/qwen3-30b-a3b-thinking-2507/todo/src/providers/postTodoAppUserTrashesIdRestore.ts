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

export async function postTodoAppUserTrashesIdRestore(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.id },
    select: { user_id: true, deleted_at: true },
  });
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 400);
  }
  if (todo.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.id },
    data: {
      deleted_at: null,
      is_complete: false,
      updated_at: new Date(),
    },
  });
  const restored = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.id },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(restored);
}
