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

export async function getTodoAppUserTodosId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todoSelect = {
    ...TodoAppTodoTransformer.select().select,
    user_id: true,
  };
  const result = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.id },
    select: todoSelect,
  });
  if (result.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await TodoAppTodoTransformer.transform(result);
}
