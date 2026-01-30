import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoItemTransformer } from "../transformers/TodoAppTodoItemTransformer";

export async function getTodoAppUserTodosTodoItemId(props: {
  user: UserPayload;
  todoItemId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoItem> {
  const todoItem = await MyGlobal.prisma.todo_app_todo_items.findUnique({
    where: {
      id: props.todoItemId,
      user_id: props.user.id,
      deleted_at: null,
    },
    ...TodoAppTodoItemTransformer.select(),
  });
  if (!todoItem) {
    throw new HttpException("Todo item not found", 404);
  }
  return await TodoAppTodoItemTransformer.transform(todoItem);
}
