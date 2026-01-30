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

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoItem> {
  const todoItem = await MyGlobal.prisma.todo_app_todo_items.findUnique({
    where: {
      id: props.todoId,
    },
  });
  if (!todoItem) {
    throw new HttpException("Todo item not found", 404);
  }
  if (todoItem.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden - You can only delete your own todo items",
      403,
    );
  }
  const deleted = await MyGlobal.prisma.todo_app_todo_items.delete({
    where: {
      id: props.todoId,
    },
    ...TodoAppTodoItemTransformer.select(),
  });
  return await TodoAppTodoItemTransformer.transform(deleted);
}
